import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Type definitions
interface GenerateQuestionRequest {
  conversationId: string;
  profile: {
    position: string;
    role: string;
    teamSize: number;
    motivation: string;
  };
  conversationHistory: Array<{
    type: 'bot' | 'user';
    content: string;
    timestamp: string;
    isQuestion?: boolean;
    questionType?: string;
  }>;
  questionCount: number;
}

interface QuestionResponse {
  question: string;
  type: 'multiple-choice' | 'open-ended' | 'scale' | 'most-least-choice';
  options?: string[];
  most_least_options?: string[];
  scale_info?: {
    min: number;
    max: number;
    min_label: string;
    max_label: string;
  };
  reasoning: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LEADERSHIP_PRINCIPLES = [
  'Self-Leadership: Self-awareness, emotional regulation, personal growth mindset',
  'Relational Leadership: Communication, empathy, conflict resolution, team building', 
  'Organizational Leadership: Strategic thinking, decision-making, change management',
  'Beyond the Organization: Industry influence, social responsibility, legacy thinking'
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('OPENAI_API_KEY is not set');
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase configuration missing');
    return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { 
      conversationId, 
      profile,
      conversationHistory, 
      questionCount
    } = await req.json() as GenerateQuestionRequest;

    console.log('Generating question for conversation:', conversationId);
    console.log('Question count:', questionCount);
    console.log('Profile:', profile);
    console.log('Conversation history length:', conversationHistory.length);

    // Generate contextual question based on full conversation history
    const questionResponse = await generateContextualQuestion(
      profile,
      conversationHistory,
      questionCount,
      openAIApiKey
    );

    return new Response(JSON.stringify({
      question: questionResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in dynamic-question-generator function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate question',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate contextual question based on full conversation history
async function generateContextualQuestion(
  profile: any,
  conversationHistory: any[],
  questionCount: number,
  apiKey: string
): Promise<QuestionResponse> {
  try {
    console.log('Generating contextual question with GPT-5');

    // Format conversation history for the prompt
    const formattedHistory = conversationHistory
      .map(msg => `${msg.type === 'bot' ? 'Assistant' : 'User'}: ${msg.content}`)
      .join('\n');

    // Build the comprehensive prompt with all context
    const prompt = `You are an expert leadership assessment coach conducting a personalized leadership evaluation. Your goal is to deeply understand this person's leadership style, capabilities, and growth areas through strategic questioning.

PARTICIPANT PROFILE:
- Position: ${profile.position}
- Role in company: ${profile.role}
- Team size: ${profile.teamSize}
- Motivation for assessment: ${profile.motivation}

CONVERSATION HISTORY:
${formattedHistory}

ASSESSMENT PROGRESS:
- Current question number: ${questionCount + 1}
- Target: 15 total questions
- Assessment phase: ${questionCount < 5 ? 'Initial exploration' : questionCount < 10 ? 'Deep dive' : 'Validation & synthesis'}

LEADERSHIP PRINCIPLES TO ASSESS:
1. Self-Leadership: Self-awareness, emotional regulation, personal growth mindset
2. Relational Leadership: Communication, empathy, conflict resolution, team building
3. Organizational Leadership: Strategic thinking, decision-making, change management
4. Beyond the Organization: Industry influence, social responsibility, legacy thinking

QUESTION GENERATION RULES:
1. ANALYZE ALL PREVIOUS RESPONSES to identify patterns, gaps, and areas needing exploration
2. BUILD ON PREVIOUS ANSWERS - reference specific things they've shared
3. AVOID REPETITION - don't ask similar questions to what's already been covered
4. PROGRESS LOGICALLY from general to specific, surface to deep
5. ADAPT question type based on what will yield the most insight

QUESTION TYPES TO USE:
- multiple-choice: For preferences, style identification, or quick assessments
- open-ended: For detailed experiences, stories, and deeper reflection
- scale: For self-assessment of skills, confidence, or frequency (1-10 scale)
- most-least-choice: For prioritization and values clarification

RESPONSE FORMAT (JSON only):
{
  "question": "Your strategic question here",
  "type": "multiple-choice|open-ended|scale|most-least-choice",
  "options": ["option1", "option2", "option3", "option4"],
  "most_least_options": ["option1", "option2", "option3", "option4"],
  "scale_info": {
    "min": 1,
    "max": 10,
    "min_label": "Never/Strongly Disagree",
    "max_label": "Always/Strongly Agree"
  },
  "reasoning": "Brief explanation of why this question was chosen based on previous responses"
}

Generate the next question that will provide the most valuable insight into their leadership capabilities.`;

    console.log('Sending prompt to GPT-5...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert leadership assessment coach. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 800,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('GPT-5 response:', data);

    let questionData;
    try {
      questionData = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse GPT-5 response as JSON:', parseError);
      // Fallback question
      questionData = {
        question: "Tell me about a time when you had to lead through a significant challenge. What was your approach and what did you learn?",
        type: "open-ended",
        reasoning: "Fallback question due to parsing error"
      };
    }

    console.log('Generated question:', questionData);
    return questionData;

  } catch (error) {
    console.error('Error generating contextual question:', error);
    
    // Fallback question based on question count
    const fallbackQuestions = [
      {
        question: "How would you describe your natural leadership style?",
        type: "multiple-choice",
        options: ["Collaborative and team-focused", "Direct and results-oriented", "Supportive and people-first", "Visionary and strategic"],
        reasoning: "Fallback question for leadership style identification"
      },
      {
        question: "What motivates you most as a leader?",
        type: "open-ended",
        reasoning: "Fallback question for motivation exploration"
      },
      {
        question: "On a scale of 1-10, how confident are you in your ability to handle conflict within your team?",
        type: "scale",
        scale_info: {
          min: 1,
          max: 10,
          min_label: "Not confident at all",
          max_label: "Extremely confident"
        },
        reasoning: "Fallback question for conflict management assessment"
      }
    ];
    
    const fallbackIndex = questionCount % fallbackQuestions.length;
    return fallbackQuestions[fallbackIndex];
  }
}