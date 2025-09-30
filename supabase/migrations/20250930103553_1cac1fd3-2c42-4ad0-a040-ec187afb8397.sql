-- Create response_memories table for enhanced conversation tracking
CREATE TABLE public.response_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  principle TEXT NOT NULL,
  response_text TEXT NOT NULL,
  sentiment JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
  follow_up_needed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.response_memories ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own response memories" 
ON public.response_memories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own response memories" 
ON public.response_memories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_response_memories_conversation_id ON public.response_memories(conversation_id);
CREATE INDEX idx_response_memories_user_id ON public.response_memories(user_id);
CREATE INDEX idx_response_memories_principle ON public.response_memories(principle);