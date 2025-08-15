import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
  questionType?: 'multiple-choice' | 'open-ended' | 'scale';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: string[];
}

export const useConversation = () => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createConversation = async (assistantId?: string, threadId?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          assistant_id: assistantId,
          thread_id: threadId,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      setConversationId(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const saveMessage = async (message: ChatMessage) => {
    if (!user || !conversationId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          message_type: message.type,
          content: message.content,
          question_type: message.questionType,
          question_options: message.options,
          question_scale_min: message.scaleMin,
          question_scale_max: message.scaleMax,
          question_scale_labels: message.scaleLabels
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const markConversationComplete = async () => {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          assessment_complete: true,
          completed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking conversation complete:', error);
    }
  };

  return {
    conversationId,
    createConversation,
    saveMessage,
    markConversationComplete,
    isLoading
  };
};