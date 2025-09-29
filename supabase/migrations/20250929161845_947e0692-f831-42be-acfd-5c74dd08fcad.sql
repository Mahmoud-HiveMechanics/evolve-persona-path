-- Add principle tracking fields to conversations table
ALTER TABLE public.conversations 
ADD COLUMN principle_coverage JSONB DEFAULT '{}',
ADD COLUMN current_stage TEXT DEFAULT 'baseline',
ADD COLUMN baseline_scores JSONB DEFAULT '{}';

-- Add principle context fields to messages table
ALTER TABLE public.messages
ADD COLUMN principle_focus TEXT,
ADD COLUMN assessment_stage TEXT;

-- Add index for efficient querying by stage
CREATE INDEX idx_conversations_current_stage ON public.conversations(current_stage);
CREATE INDEX idx_messages_principle_focus ON public.messages(principle_focus);
CREATE INDEX idx_messages_assessment_stage ON public.messages(assessment_stage);