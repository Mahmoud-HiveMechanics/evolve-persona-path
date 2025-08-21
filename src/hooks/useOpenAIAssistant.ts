import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AssistantQuestion, toErrorWithMessage } from '@/types/shared';
import { env } from '@/config/env';

interface UseOpenAIAssistantProps {
  threadId: string | null;
}

interface UseOpenAIAssistantReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  currentQuestion: AssistantQuestion | null;
  sendMessage: (message: string) => Promise<void>;
  initializeAssistant: () => Promise<void>;
  hasActiveRun: () => boolean;
}

export const useOpenAIAssistant = ({ threadId }: UseOpenAIAssistantProps): UseOpenAIAssistantReturn => {
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<AssistantQuestion | null>(null);
  // Track active run and pending tool call so we can submit outputs per OpenAI Assistants v2
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [pendingToolCallId, setPendingToolCallId] = useState<string | null>(null);
  // Track the last tool_call id we surfaced as a question to avoid duplicates
  const [lastShownToolCallId, setLastShownToolCallId] = useState<string | null>(null);
  
  // Expose a proper function to check if there's an active run
  const hasActiveRun = () => Boolean(activeRunId);

  const normalizeError = (err: unknown): string => {
    const errorWithMessage = toErrorWithMessage(err);
    return errorWithMessage.message;
  };

  const callAssistant = async (action: string, data: Record<string, unknown> = {}): Promise<unknown> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('chat-assistant', {
        body: { action, ...data }
      });

      if (error) {
        throw new Error(normalizeError(error));
      }
      
      // Handle the new response format from our updated edge function
      if (response && typeof response === 'object') {
        // If the response has an 'ok' field (new format), check it
        if ('ok' in response || 'status' in response || 'error' in response) {
          if (response.ok === false || response.status >= 400) {
            throw new Error(normalizeError(response.error) || 'Edge function error');
          }
          return response.openai || response;
        }
        // Old format or direct OpenAI response
        return response;
      }
      
      return response;
    } catch (err) {
      const friendly = normalizeError(err);
      console.error('Assistant API call error:', friendly, err);
      throw new Error(friendly);
    }
  };

  const initializeAssistant = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!threadId) {
        throw new Error('No thread ID available. Please ensure user is signed up properly.');
      }

      // Use existing assistant from environment configuration
      const EXISTING_ASSISTANT_ID = env.OPENAI_ASSISTANT_ID;
      const assistantResponse = await callAssistant('use_existing_assistant', {
        assistantId: EXISTING_ASSISTANT_ID
      });
      console.log('Using existing assistant:', assistantResponse);
      setAssistantId(EXISTING_ASSISTANT_ID);

      console.log('Using existing thread:', threadId);

      // Resume any active run from a previous session to avoid sending a new message
      try {
        const active = await callAssistant('get_active_run', { threadId }) as { id?: string; run?: { id?: string } };
        const existingRunId: string | null = active?.id || active?.run?.id || null;
        if (existingRunId) {
          setActiveRunId(existingRunId);
          const outcome = await pollRunUntilActionOrComplete(existingRunId);
          if (outcome === 'completed') {
            setActiveRunId(null);
          }
        }
      } catch (resumeErr) {
        // Non-fatal; just log
        console.warn('No active run to resume or resume check failed:', resumeErr);
      }

      // Mark initialized only after resume check completes to avoid racing kickoff
      setIsInitialized(true);
    } catch (err) {
      console.error('Assistant initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize assistant');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll a run until it completes or requires action
  const pollRunUntilActionOrComplete = async (runId: string): Promise<"completed" | "requires_action" | "expired"> => {
    let attempts = 0;
    const maxAttempts = 60; // up to ~60s
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusResponse = await callAssistant('get_run_status', { threadId, runId }) as {
      status?: string;
      openai?: { 
        status?: string;
        required_action?: {
          submit_tool_outputs?: {
            tool_calls?: Array<{
              id?: string;
              tool_call_id?: string;
              function?: {
                name?: string;
                arguments?: string;
              };
            }>;
          };
        };
      };
      required_action?: {
        submit_tool_outputs?: {
          tool_calls?: Array<{
            id?: string;
            tool_call_id?: string;
            function?: {
              name?: string;
              arguments?: string;
            };
          }>;
        };
      };
    };
      const status = statusResponse?.status || statusResponse?.openai?.status;
      console.log('Run status:', status);

      if (status === 'completed') {
        return 'completed';
      }
      if (status === 'requires_action') {
        // Capture tool call id from required_action
        const toolCalls =
          statusResponse?.required_action?.submit_tool_outputs?.tool_calls ||
          statusResponse?.openai?.required_action?.submit_tool_outputs?.tool_calls || [];
        if (Array.isArray(toolCalls) && toolCalls.length > 0) {
          // Use the latest tool call in case multiple are present
          const tc = toolCalls[toolCalls.length - 1];
          const fn = tc?.function;
          const toolCallIdFromRun: string | null = tc?.id || tc?.tool_call_id || null;
          if (fn?.name === 'ask_question' && toolCallIdFromRun && toolCallIdFromRun !== lastShownToolCallId) {
            try {
              const args = JSON.parse(fn.arguments || '{}');
              setCurrentQuestion(args);
              setLastShownToolCallId(toolCallIdFromRun);
            } catch (e) {
              console.error('Failed to parse tool call args:', e);
            }
          }
          setPendingToolCallId(toolCallIdFromRun);
          setActiveRunId(runId);
        }
        return 'requires_action';
      }
      if (status === 'failed' || status === 'cancelled' || status === 'expired') {
        return 'expired';
      }

      attempts += 1;
    }
    throw new Error('Assistant response timeout');
  };

  const sendMessage = async (message: string) => {
    if (!assistantId || !threadId) {
      throw new Error('Assistant not initialized - missing assistant ID or thread ID');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending message:', { message, threadId, assistantId });

      // If there is an in-progress run and no pending tool call, wait for the run
      if (activeRunId && !pendingToolCallId) {
        const outcome = await pollRunUntilActionOrComplete(activeRunId);
        if (outcome === 'requires_action') {
          // The question has been set from the tool call; do not send another message
          return;
        }
        // Completed or expired: clear it and allow a new message to start a new run
        setActiveRunId(null);
        setPendingToolCallId(null);
      }

      // If a tool call is pending, submit output instead of adding a new message
      if (pendingToolCallId && activeRunId) {
        // Confirm run is still awaiting tool outputs before submitting
        try {
          const statusResponse = await callAssistant('get_run_status', { threadId, runId: activeRunId }) as {
            status?: string;
            openai?: { status?: string };
          };
          const status = statusResponse?.status || statusResponse?.openai?.status;
          if (status !== 'requires_action') {
            // Run is no longer accepting tool outputs. Clear and start a fresh run with user's message.
            setPendingToolCallId(null);
            setActiveRunId(null);
          } else {
            await callAssistant('submit_tool_outputs', {
              threadId,
              runId: activeRunId,
              toolCallId: pendingToolCallId,
              output: message
            });
            // Clear pending tool call and keep polling same run
            setPendingToolCallId(null);
            const outcome = await pollRunUntilActionOrComplete(activeRunId);
            if (outcome === 'completed') {
              const messagesResponse = await callAssistant('get_messages', { threadId });
              console.log('Messages:', messagesResponse);
            }
            if (outcome !== 'requires_action') {
              // Either completed or expired; if expired, allow caller to continue and start fresh on next send
              return;
            }
            return;
          }
        } catch (submitErr: unknown) {
          const msg = toErrorWithMessage(submitErr).message;
          if (msg.includes('expired') || msg.includes('do not accept tool outputs')) {
            // Recovery path: clear active and pending to allow a new run
            setPendingToolCallId(null);
            setActiveRunId(null);
          } else {
            throw submitErr;
          }
        }
      }

      // Otherwise, add a message and start a new run
      const runResponse = await callAssistant('send_message', { threadId, assistantId, message }) as {
        id?: string;
        runId?: string;
      };
      console.log('Run started:', runResponse);
      const newRunId: string = runResponse?.id || runResponse?.runId || '';
      if (!newRunId) throw new Error('Run ID missing from response');
      setActiveRunId(newRunId);
      const outcome = await pollRunUntilActionOrComplete(newRunId);
      if (outcome === 'completed') {
        const messagesResponse = await callAssistant('get_messages', { threadId });
        console.log('Messages:', messagesResponse);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isInitialized,
    isLoading,
    error,
    currentQuestion,
    sendMessage,
    initializeAssistant,
    hasActiveRun
  };
};