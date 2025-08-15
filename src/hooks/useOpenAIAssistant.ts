import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AssistantQuestion {
  question: string;
  type: 'multiple-choice' | 'open-ended' | 'scale';
  options?: string[];
  scale_info?: {
    min: number;
    max: number;
    min_label: string;
    max_label: string;
  };
}

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

  const normalizeError = (err: any): string => {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    // Supabase Functions error shape
    const msg =
      err?.message ||
      err?.error?.message ||
      err?.context?.response?.error?.message ||
      err?.statusText ||
      err?.name;
    try {
      return msg || JSON.stringify(err);
    } catch {
      return 'Unexpected error';
    }
  };

  const callAssistant = async (action: string, data: any = {}) => {
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

      // Use existing assistant
      const EXISTING_ASSISTANT_ID = 'asst_0IGtbLANauxTpbn8rSj7MVy5';
      const assistantResponse = await callAssistant('use_existing_assistant', {
        assistantId: EXISTING_ASSISTANT_ID
      });
      console.log('Using existing assistant:', assistantResponse);
      setAssistantId(EXISTING_ASSISTANT_ID);

      console.log('Using existing thread:', threadId);
      setIsInitialized(true);
    } catch (err) {
      console.error('Assistant initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize assistant');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll a run until it completes or requires action
  const pollRunUntilActionOrComplete = async (runId: string): Promise<"completed" | "requires_action"> => {
    let attempts = 0;
    const maxAttempts = 60; // up to ~60s
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusResponse: any = await callAssistant('get_run_status', { threadId, runId });
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
          const tc = toolCalls[0];
          const fn = tc?.function;
          if (fn?.name === 'ask_question') {
            try {
              const args = JSON.parse(fn.arguments || '{}');
              setCurrentQuestion(args);
            } catch (e) {
              console.error('Failed to parse tool call args:', e);
            }
          }
          const toolCallIdFromRun: string | null = tc?.id || tc?.tool_call_id || null;
          setPendingToolCallId(toolCallIdFromRun);
          setActiveRunId(runId);
        }
        return 'requires_action';
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

      // If a tool call is pending, submit output instead of adding a new message
      if (pendingToolCallId && activeRunId) {
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
          const messagesResponse: any = await callAssistant('get_messages', { threadId });
          console.log('Messages:', messagesResponse);
        }
        return;
      }

      // Otherwise, add a message and start a new run
      const runResponse: any = await callAssistant('send_message', { threadId, assistantId, message });
      console.log('Run started:', runResponse);
      const newRunId: string = runResponse?.id || runResponse?.runId;
      if (!newRunId) throw new Error('Run ID missing from response');
      setActiveRunId(newRunId);
      const outcome = await pollRunUntilActionOrComplete(newRunId);
      if (outcome === 'completed') {
        const messagesResponse: any = await callAssistant('get_messages', { threadId });
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
    initializeAssistant
  };
};