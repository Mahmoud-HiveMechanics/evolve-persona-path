-- Add thread_id column to profiles table to store OpenAI thread for each user
ALTER TABLE public.profiles 
ADD COLUMN thread_id TEXT;