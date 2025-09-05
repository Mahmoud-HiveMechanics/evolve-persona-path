import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGPT5ChatProps {
  conversationId?: string;
}

interface UseGPT5ChatReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  currentQuestion: string | null;
  sendMessage: (message: string) => Promise<void>;
  initializeChat: () => Promise<void>;
  hasActiveChat: () => boolean;
}

export function useGPT5Chat({ conversationId }: UseGPT5ChatProps): UseGPT5ChatReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);

  // Helper to check if there's an active chat
  const hasActiveChat = useCallback((): boolean => {
    return chatHistory.length > 0;
  }, [chatHistory]);

  // Helper function to normalize errors
  const normalizeError = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === 'string') {
      return err;
    }
    return 'An unknown error occurred';
  };

  // Helper function to call GPT-5 chat
  const callGPT5 = async (messages: Array<{role: string, content: string}>) => {
    const { data, error } = await supabase.functions.invoke('gpt5-chat', {
      body: { messages, conversationId }
    });
    
    if (error) {
      throw new Error(error.message || 'Failed to call GPT-5');
    }
    
    return data;
  };

  // Initialize the chat
  const initializeChat = useCallback(async () => {
    if (isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Initialize with system message
      const systemMessage = {
        role: 'system',
        content: 'You are a leadership assessment assistant. Ask thoughtful questions to evaluate leadership competencies and provide insightful feedback.'
      };
      
      setChatHistory([systemMessage]);
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = normalizeError(err);
      setError(errorMessage);
      console.error('Failed to initialize chat:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, conversationId]);

  // Send message to GPT-5 and get response
  const processMessage = async (userMessage: string) => {
    const newMessages = [...chatHistory, { role: 'user', content: userMessage }];
    
    try {
      const response = await callGPT5(newMessages);
      
      if (response?.success && response.data?.content) {
        const assistantMessage = { role: 'assistant', content: response.data.content };
        const updatedHistory = [...newMessages, assistantMessage];
        
        setChatHistory(updatedHistory);
        setCurrentQuestion(response.data.content);
        
        return response.data.content;
      } else {
        throw new Error('Invalid response from GPT-5');
      }
    } catch (err) {
      console.error('Error processing message:', err);
      throw err;
    }
  };

  // Send a message to GPT-5
  const sendMessage = useCallback(async (message: string) => {
    if (!isInitialized) {
      setError('Chat not initialized');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await processMessage(message);
    } catch (err) {
      const errorMessage = normalizeError(err);
      setError(errorMessage);
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, chatHistory]);

  return {
    isInitialized,
    isLoading,
    error,
    currentQuestion,
    sendMessage,
    initializeChat,
    hasActiveChat
  };
}