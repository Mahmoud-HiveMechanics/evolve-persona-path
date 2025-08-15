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
        if ('ok' in response) {
          if (!response.ok) {
            throw new Error(
              normalizeError(response.error) || 'API call failed'
            );
          }
          // Return the OpenAI data if available, otherwise the whole response
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

  const sendMessage = async (message: string) => {
    if (!assistantId || !threadId) {
      throw new Error('Assistant not initialized - missing assistant ID or thread ID');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending message:', { message, threadId, assistantId });
      
      // Send message and run assistant
      const runResponse: any = await callAssistant('send_message', {
        threadId,
        assistantId,
        message
      });

      console.log('Run started:', runResponse);
      const runId: string = runResponse?.id || runResponse?.runId;
      if (!runId) {
        throw new Error('Run ID missing from response');
      }

      // Poll for completion
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!isComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse: any = await callAssistant('get_run_status', {
          threadId,
          runId
        });

        const status = statusResponse?.status || statusResponse?.openai?.status;
        console.log('Run status:', status);

        if (status === 'completed') {
          isComplete = true;
          
          // Get messages
          const messagesResponse: any = await callAssistant('get_messages', { threadId });
          console.log('Messages:', messagesResponse);
          
          // Process the latest assistant message for function calls
          const latestMessage = messagesResponse?.data?.[0];
          if (latestMessage && latestMessage.role === 'assistant') {
            // Check for function calls in the message
            if (latestMessage.tool_calls && latestMessage.tool_calls.length > 0) {
              const functionCall = latestMessage.tool_calls[0];
              if (functionCall.function.name === 'ask_question') {
                const args = JSON.parse(functionCall.function.arguments);
                setCurrentQuestion(args);
              }
            }
          }
        } else if (status === 'requires_action') {
          // Assistant is asking us to call a tool. Fetch latest messages and extract the tool call
          const messagesResponse: any = await callAssistant('get_messages', { threadId });
          console.log('Messages (requires_action):', messagesResponse);
          const latestMessage = messagesResponse?.data?.[0];
          if (latestMessage && latestMessage.role === 'assistant') {
            if (latestMessage.tool_calls && latestMessage.tool_calls.length > 0) {
              const functionCall = latestMessage.tool_calls[0];
              if (functionCall.function?.name === 'ask_question') {
                try {
                  const args = JSON.parse(functionCall.function.arguments || '{}');
                  setCurrentQuestion(args);
                  // We have our question; stop polling to avoid timeout
                  isComplete = true;
                } catch (e) {
                  console.error('Failed to parse function arguments:', e);
                }
              }
            }
          }
        } else if (status === 'failed') {
          throw new Error('Assistant run failed');
        }

        attempts++;
      }

      if (!isComplete) {
        throw new Error('Assistant response timeout');
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