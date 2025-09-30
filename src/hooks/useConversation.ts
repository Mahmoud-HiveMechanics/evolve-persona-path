import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ChatMessage } from '@/types/shared';

export const useConversation = () => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading] = useState(false);

  // Get user's threadId from profile
  useEffect(() => {
    const getUserThread = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('thread_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.thread_id) {
          setThreadId(profile.thread_id);
        } else {
          // User exists but has no thread ID - create one
          console.log('User has no thread ID, creating one...');
          await createThreadForUser(user.id);
        }
      } catch (error) {
        console.error('Error fetching user thread:', error);
      }
    };

    getUserThread();
  }, [user]);

  const createThreadForUser = async (userId: string) => {
    try {
      console.log('Creating thread for existing user...');
      const { data: response, error: functionError } = await supabase.functions.invoke('chat-assistant', {
        body: {
          action: 'create_thread'
        }
      });

      if (functionError) {
        console.error('Function error creating thread:', functionError);
        // Don't block the flow - user can still proceed with assessment
        return;
      }

      console.log('Thread creation response:', response);
      
      // Handle the new response format from our updated edge function
      let threadData = response;
      if (response && typeof response === 'object' && 'openai' in response) {
        threadData = response.openai;
      }

      if (threadData?.id) {
        console.log('Thread created successfully:', threadData.id);
        
        // Update the user's profile with the new thread ID
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ thread_id: threadData.id })
          .eq('user_id', userId);
        
        if (updateError) {
          console.error('Error updating profile with thread ID:', updateError);
        } else {
          console.log('Profile updated successfully with thread ID');
          setThreadId(threadData.id);
        }
      } else {
        console.error('No thread ID returned from API');
      }
    } catch (error) {
      console.error('Error creating thread for user:', error);
    }
  };

  const createConversation = async (assistantId?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          assistant_id: assistantId,
          thread_id: threadId || null,
          status: 'active'
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setConversationId(data.id);
        return data.id;
      }
      return null;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const saveMessage = async (message: ChatMessage) => {
    if (!user || !conversationId) {
      console.error('Cannot save message: missing user or conversationId', { user: !!user, conversationId });
      return;
    }

    try {
      const { data, error } = await supabase
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
          question_scale_labels: message.scaleLabels,
          principle_focus: message.principle_focus,
          assessment_stage: message.assessment_stage,
          generated_by_ai: false
        })
        .select();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
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

  // Placeholder functions for future response memory features
  const getConversationAnalysis = async () => {
    // Will be implemented once response_memories table is available in types
    return null;
  };

  const getPrincipleInsights = async () => {
    // Will be implemented once response_memories table is available in types
    return [];
  };

  return {
    conversationId,
    threadId,
    createConversation,
    saveMessage,
    markConversationComplete,
    getConversationAnalysis,
    getPrincipleInsights,
    isLoading
  };
};