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
        const { data: threadData } = await supabase.functions.invoke('chat-assistant', {
          body: {
            action: 'create_thread',
            assistantId: 'asst_0IGtbLANauxTpbn8rSj7MVy5'
          }
        });

        if (threadData?.id) {
          // Wait a moment for the user to be created in auth.users
          setTimeout(async () => {
            const { data: session } = await supabase.auth.getSession();
            if (session?.session?.user) {
              await supabase
                .from('profiles')
                .update({ thread_id: threadData.id })
                .eq('user_id', session.session.user.id);
            }
          }, 1000);
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