-- Add persona tracking to conversations table
ALTER TABLE conversations ADD COLUMN persona_snapshot JSONB DEFAULT '{}';

-- Add response analysis tracking to messages table
ALTER TABLE messages ADD COLUMN response_quality_score INTEGER;
ALTER TABLE messages ADD COLUMN leadership_insights JSONB;
ALTER TABLE messages ADD COLUMN requires_followup BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN generated_by_ai BOOLEAN DEFAULT false;