import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

    // Create OpenAI thread for new user after successful signup
    if (!error) {
      try {
        console.log('Creating OpenAI thread for new user...');
        const { data: response, error: functionError } = await supabase.functions.invoke('chat-assistant', {
          body: {
            action: 'create_thread'
          }
        });

        if (functionError) {
          console.error('Function error:', functionError);
          throw functionError;
        }

        console.log('Thread creation response:', response);
        
        // Handle the new response format from our updated edge function
        let threadData = response;
        if (response && typeof response === 'object' && 'openai' in response) {
          threadData = response.openai;
        }

        if (threadData?.id) {
          console.log('Thread created successfully:', threadData.id);
          
          // Wait for the user profile to be created by the trigger, then update it
          setTimeout(async () => {
            const { data: session } = await supabase.auth.getSession();
            if (session?.session?.user) {
              console.log('Updating profile with thread ID...');
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ thread_id: threadData.id })
                .eq('user_id', session.session.user.id);
              
              if (updateError) {
                console.error('Error updating profile with thread ID:', updateError);
              } else {
                console.log('Profile updated successfully with thread ID');
              }
            }
          }, 2000); // Increased timeout to ensure profile is created
        } else {
          console.error('No thread ID returned from API');
        }
      } catch (threadError) {
        console.error('Error creating thread:', threadError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut
  };
};