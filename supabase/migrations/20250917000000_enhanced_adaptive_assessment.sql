-- Enhanced Adaptive Assessment System Migration
-- Adds comprehensive support for intelligent, context-aware conversations

-- Enhanced user context tracking
ALTER TABLE conversations ADD COLUMN user_context JSONB DEFAULT '{
  "communicationStyle": "detailed",
  "leadershipPatterns": [],
  "strengths": [],
  "growthAreas": [],
  "questionPhase": "structured",
  "questionCount": 0,
  "confidenceLevels": {},
  "keyThemes": []
}'::jsonb;

-- Leadership pattern recognition
ALTER TABLE conversations ADD COLUMN leadership_patterns TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN detected_contradictions TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN communication_style TEXT DEFAULT 'detailed';

-- Enhanced response analysis table
CREATE TABLE IF NOT EXISTS response_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  response_content TEXT NOT NULL,
  analysis_result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Analysis fields for quick querying
  depth_score DECIMAL(3,2), -- 0.00 to 3.00 (surface=1, moderate=2, deep=3)
  quality_score DECIMAL(3,2), -- 0.00 to 4.00 (poor=1, adequate=2, good=3, excellent=4)
  communication_style TEXT,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  requires_followup BOOLEAN DEFAULT false,
  followup_type TEXT,

  -- Pattern tracking
  identified_patterns TEXT[] DEFAULT '{}',
  leadership_themes TEXT[] DEFAULT '{}',

  UNIQUE(conversation_id, question_number)
);

-- Question generation tracking
CREATE TABLE IF NOT EXISTS question_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  question_content TEXT NOT NULL,
  generation_context JSONB DEFAULT '{}',
  ai_model_used TEXT,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(conversation_id, question_number)
);

-- Adaptive question templates
CREATE TABLE IF NOT EXISTS question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('structured', 'adaptive')),
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple-choice', 'open-ended', 'scale', 'most-least-choice')),
  context_tags TEXT[] DEFAULT '{}',
  template_content TEXT NOT NULL,
  conditions JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,4) DEFAULT 0.0000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial question templates for structured phase
INSERT INTO question_templates (template_key, phase, question_type, context_tags, template_content, conditions) VALUES
('leadership_style_mc', 'structured', 'multiple-choice', ARRAY['leadership_style', 'decision_making'], 'As a {position} in {role}, which leadership style best describes how you work with your {team_size} person team?', '{"question_count": {"$lt": 6}}'),
('confidence_scale', 'structured', 'scale', ARRAY['confidence', 'self_assessment'], 'On a scale of 1-10, how confident do you feel in your ability to {motivation}?', '{"question_count": {"$lt": 6}}'),
('decision_most_least', 'structured', 'most-least-choice', ARRAY['decision_making', 'preferences'], 'When making important decisions, which approach is MOST like you and which is LEAST like you?', '{"question_count": {"$lt": 6}}'),
('challenge_focus_mc', 'structured', 'multiple-choice', ARRAY['challenges', 'growth_areas'], 'What''s your biggest leadership challenge right now?', '{"question_count": {"$lt": 6}}'),
('team_development_scale', 'structured', 'scale', ARRAY['team_development', 'priorities'], 'On a scale of 1-10, how much priority do you place on developing your team''s skills?', '{"question_count": {"$lt": 6}}');

-- Insert adaptive question templates
INSERT INTO question_templates (template_key, phase, question_type, context_tags, template_content, conditions) VALUES
('followup_collaborative', 'adaptive', 'open-ended', ARRAY['collaborative', 'team_focused'], 'Since you mentioned involving your team in decisions, tell me about a recent situation where your collaborative approach really made a difference.', '{"leadership_patterns": {"$contains": "collaborative"}}'),
('followup_executive_influence', 'adaptive', 'open-ended', ARRAY['executive_influence', 'communication'], 'You mentioned executive influence as a challenge. Can you share a specific example of when you needed to get buy-in from senior leaders?', '{"growth_areas": {"$contains": "executive_influence"}}'),
('followup_change_management', 'adaptive', 'open-ended', ARRAY['change_management', 'transformation'], 'Given your experience with change, tell me about a time when you led a significant transformation in your team or organization.', '{"key_themes": {"$contains": "change_management"}}'),
('pattern_connection', 'adaptive', 'open-ended', ARRAY['pattern_recognition', 'reflection'], 'I''m noticing a pattern in your responses about {leadership_patterns}. How do you see these different experiences connecting in your overall leadership approach?', '{"leadership_patterns": {"$size": {"$gt": 2}}}'),
('growth_area_exploration', 'adaptive', 'open-ended', ARRAY['growth', 'development'], 'You''ve mentioned {growth_areas} as areas you''re working on. What''s one specific action you''ve taken recently to develop in this area?', '{"growth_areas": {"$size": {"$gt": 0}}}');

-- Enhanced evaluation tracking
ALTER TABLE evaluations ADD COLUMN pattern_analysis JSONB DEFAULT '{}';
ALTER TABLE evaluations ADD COLUMN communication_style TEXT;
ALTER TABLE evaluations ADD COLUMN adaptive_insights TEXT[] DEFAULT '{}';
ALTER TABLE evaluations ADD COLUMN growth_trajectory JSONB DEFAULT '{}';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_response_analyses_conversation ON response_analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_response_analyses_depth ON response_analyses(depth_score);
CREATE INDEX IF NOT EXISTS idx_response_analyses_quality ON response_analyses(quality_score);
CREATE INDEX IF NOT EXISTS idx_question_generations_conversation ON question_generations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_question_templates_phase_type ON question_templates(phase, question_type);
CREATE INDEX IF NOT EXISTS idx_question_templates_context ON question_templates USING gin(context_tags);
CREATE INDEX IF NOT EXISTS idx_conversations_user_context ON conversations USING gin(user_context);
CREATE INDEX IF NOT EXISTS idx_conversations_leadership_patterns ON conversations USING gin(leadership_patterns);

-- Function to update question template success rates
CREATE OR REPLACE FUNCTION update_template_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Update success rate based on response quality for questions generated from this template
  UPDATE question_templates
  SET success_rate = (
    SELECT AVG(ra.quality_score) / 4.0
    FROM question_generations qg
    JOIN response_analyses ra ON ra.conversation_id = qg.conversation_id
      AND ra.question_number = qg.question_number
    WHERE qg.template_key = question_templates.template_key
  ),
  updated_at = NOW()
  WHERE template_key = COALESCE(NEW.template_key, OLD.template_key);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update template success rates
DROP TRIGGER IF EXISTS trigger_update_template_success ON question_generations;
CREATE TRIGGER trigger_update_template_success
  AFTER INSERT OR UPDATE ON question_generations
  FOR EACH ROW EXECUTE FUNCTION update_template_success_rate();

-- Function to automatically analyze response quality
CREATE OR REPLACE FUNCTION analyze_response_quality_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be called by the edge function, but we create the trigger for completeness
  -- In practice, the edge function will handle the analysis and insert directly

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE response_analyses IS 'Stores detailed analysis of user responses for adaptive questioning';
COMMENT ON TABLE question_generations IS 'Tracks AI-generated questions and their performance';
COMMENT ON TABLE question_templates IS 'Reusable templates for structured and adaptive questions';
COMMENT ON COLUMN conversations.user_context IS 'Comprehensive user profile including communication style, patterns, and preferences';
COMMENT ON COLUMN conversations.leadership_patterns IS 'Identified leadership patterns from conversation analysis';
COMMENT ON COLUMN conversations.detected_contradictions IS 'Contradictions detected in user responses for follow-up exploration';
