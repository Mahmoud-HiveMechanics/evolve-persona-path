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
  questionTypeHistory?: string[];
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

const EVOLVE_LEADERSHIP_PRINCIPLES = [
  // Foundational Mindset (1-3)
  "Vision & Strategic Direction",
  "Integrity & Trustworthiness", 
  "Continuous Learning & Self-Improvement",
  // Interpersonal Mastery (4-6)
  "Emotional Intelligence & Empathy",
  "Servant Leadership & Serving Others",
  "Authenticity & Transparency",
  // Adaptive Leadership (7-9)
  "Curiosity & Innovation",
  "Resilience & Adaptability",
  "Inclusivity & Diversity",
  // Execution Excellence (10-12)
  "Decisiveness & Judgment",
  "Communication & Alignment",
  "Results & Accountability"
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
      questionCount,
      questionTypeHistory = []
    } = await req.json() as GenerateQuestionRequest;

    console.log('Generating question for conversation:', conversationId);
    console.log('Question count:', questionCount);
    console.log('Profile:', profile);
    console.log('Conversation history length:', conversationHistory.length);

    console.log('Question type history:', questionTypeHistory);

    // Generate contextual question based on full conversation history
    const questionResponse = await generateContextualQuestion(
      profile,
      conversationHistory,
      questionCount,
      questionTypeHistory,
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
      details: error instanceof Error ? error.message : 'Unknown error'
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
  questionTypeHistory: string[],
  apiKey: string
): Promise<QuestionResponse> {
  try {
    console.log('Generating contextual question with GPT-4.1');

    // Add 25-second timeout for the entire operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Question generation timeout after 25 seconds')), 25000);
    });

    // Format conversation history for the prompt
    const formattedHistory = conversationHistory
      .map(msg => `${msg.type === 'bot' ? 'Assistant' : 'User'}: ${msg.content}`)
      .join('\n');

    // Analyze question type variety and progression
    const questionTypeCount = questionTypeHistory.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allowedTypes = questionCount < 5 
      ? ['multiple-choice', 'scale', 'most-least-choice']
      : questionCount < 10
      ? ['multiple-choice', 'scale', 'most-least-choice', 'open-ended'] // Gradual introduction
      : ['multiple-choice', 'scale', 'most-least-choice', 'open-ended'];

    const varietyGuidance = generateVarietyGuidance(questionTypeCount, allowedTypes, questionCount);

    // EvolveAI conversational prompt
    const prompt = `You are EvolveAI, a warm and insightful leadership coach conducting a conversational assessment using the 12 Evolve Leadership Principles Framework.

PROFILE: ${profile.position} in ${profile.role}, team of ${profile.teamSize}, motivated to ${profile.motivation}

CONVERSATION HISTORY:
${formattedHistory}

ASSESSMENT PROGRESS: Question ${questionCount + 1}/15, Phase: ${questionCount < 5 ? 'Profile Discovery' : questionCount < 10 ? 'Adaptive Assessment' : 'Insight Generation'}

THE 12 EVOLVE LEADERSHIP PRINCIPLES:

FOUNDATIONAL MINDSET (1-3):
1. Vision & Strategic Direction
2. Integrity & Trustworthiness  
3. Continuous Learning & Self-Improvement

INTERPERSONAL MASTERY (4-6):
4. Emotional Intelligence & Empathy
5. Servant Leadership & Serving Others
6. Authenticity & Transparency

ADAPTIVE LEADERSHIP (7-9):
7. Curiosity & Innovation
8. Resilience & Adaptability
9. Inclusivity & Diversity

EXECUTION EXCELLENCE (10-12):
10. Decisiveness & Judgment
11. Communication & Alignment
12. Results & Accountability

QUESTION TYPE GUIDANCE:
${varietyGuidance}
- Allowed types: ${allowedTypes.join(', ')}
- Used so far: ${Object.entries(questionTypeCount).map(([type, count]) => `${type}: ${count}`).join(', ') || 'None'}

EVOLVEAI METHODOLOGY:
- Be warm, empathetic, and naturally curious
- Use scenario-based questions as primary method (e.g., "Imagine you've just taken over a team...")
- Include behavioral interview questions for past experiences
- Explore values and beliefs through completion questions
- Gently probe inconsistencies between stated values and revealed behaviors
- Use conversational bridges like "I'm curious..." "Tell me more..." "That's interesting..."
- Create opportunities for "aha" moments and self-awareness

REQUIREMENTS:
- Generate ONE engaging question that flows naturally from previous responses
- Focus on revealing mindset patterns and behavioral insights
- Adapt to the user's specific context and role
- Create meaningful, actionable insights

JSON FORMAT:
{
  "question": "Your thoughtful, engaging question here",
  "type": "multiple-choice|open-ended|scale|most-least-choice",
  "options": ["A", "B", "C", "D"],
  "most_least_options": ["A", "B", "C", "D"],
  "scale_info": {"min": 1, "max": 10, "min_label": "Low", "max_label": "High"},
  "reasoning": "Brief explanation of the insight this question will reveal"
}`;

    console.log('Sending prompt to GPT-4.1...');
    
    // Wrap the API call with timeout
    const apiCall = fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a leadership assessment coach. Generate strategic questions in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "leadership_question",
            schema: {
              type: "object",
              properties: {
                question: {
                  type: "string",
                  description: "The strategic leadership assessment question"
                },
                type: {
                  type: "string",
                  enum: ["multiple-choice", "open-ended", "scale", "most-least-choice"],
                  description: "Type of question that will yield the most insight"
                },
                options: {
                  type: "array",
                  items: { type: "string" },
                  description: "Options for multiple-choice questions"
                },
                most_least_options: {
                  type: "array",
                  items: { type: "string" },
                  description: "Options for most-least choice questions"
                },
                scale_info: {
                  type: "object",
                  properties: {
                    min: { type: "number" },
                    max: { type: "number" },
                    min_label: { type: "string" },
                    max_label: { type: "string" }
                  },
                  description: "Scale configuration for scale questions"
                },
                reasoning: {
                  type: "string",
                  description: "Why this question was chosen based on previous responses"
                }
              },
              required: ["question", "type", "reasoning"],
              additionalProperties: false
            }
          }
        }
      }),
    });

    const response = await Promise.race([apiCall, timeoutPromise]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('GPT-4.1 response:', data);
    console.log('Token usage:', data.usage);

    let questionData;
    try {
      const content = data.choices[0].message.content;
      console.log('Raw content:', content);
      
      if (!content || content.trim() === '') {
        throw new Error('Empty response from GPT-4.1');
      }
      
      questionData = JSON.parse(content);
      
      // Validate required fields
      if (!questionData.question || !questionData.type || !questionData.reasoning) {
        throw new Error('Missing required fields in response');
      }
      
    } catch (parseError) {
      console.error('Failed to parse GPT-4.1 response as JSON:', parseError);
      console.error('Raw response:', data.choices[0]?.message?.content);
      
      // Fallback question based on conversation context
      const contextualFallback = generateContextualFallback(profile, conversationHistory, questionCount, questionTypeHistory);
      questionData = contextualFallback;
    }

    console.log('Generated question:', questionData);
    return questionData;

  } catch (error) {
    console.error('Error generating contextual question:', error);
    
    // Fallback question based on question count
    const fallbackQuestions: QuestionResponse[] = [
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

// Generate variety guidance for the AI prompt
function generateVarietyGuidance(
  questionTypeCount: Record<string, number>,
  allowedTypes: string[],
  questionCount: number
): string {
  if (questionCount === 0) {
    return "- Start with any of the allowed simple question types\n- Focus on getting baseline information";
  }

  const overusedTypes = Object.entries(questionTypeCount)
    .filter(([_, count]) => count >= 3)
    .map(([type, _]) => type);

  const underusedTypes = allowedTypes.filter(type => (questionTypeCount[type] || 0) < 2);

  let guidance = "";
  if (overusedTypes.length > 0) {
    guidance += `- AVOID overused types: ${overusedTypes.join(', ')}\n`;
  }
  if (underusedTypes.length > 0) {
    guidance += `- PREFER underused types: ${underusedTypes.join(', ')}\n`;
  }
  if (questionCount < 5) {
    guidance += "- Keep it simple: use multiple-choice, scale, or most-least-choice only\n";
  } else if (questionCount < 10) {
    guidance += "- Can introduce 1-2 open-ended questions but balance with simpler types\n";
  } else {
    guidance += "- Full flexibility but maintain variety\n";
  }
  
  return guidance;
}

// Generate contextual fallback question based on conversation and profile
function generateContextualFallback(
  profile: any,
  conversationHistory: any[],
  questionCount: number,
  questionTypeHistory: string[]
): QuestionResponse {
  console.log('Generating contextual fallback question');
  
  // Analyze what's been covered in conversation
  const hasDiscussedChallenges = conversationHistory.some(msg => 
    msg.content.toLowerCase().includes('challenge') || 
    msg.content.toLowerCase().includes('difficult')
  );
  
  const hasDiscussedTeam = conversationHistory.some(msg =>
    msg.content.toLowerCase().includes('team') ||
    msg.content.toLowerCase().includes('member')
  );
  
  const hasDiscussedStyle = conversationHistory.some(msg =>
    msg.content.toLowerCase().includes('style') ||
    msg.content.toLowerCase().includes('approach')
  );

  // Determine variety-conscious question type for early stage
  const questionTypeCount = questionTypeHistory.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Early stage questions (0-4) - EvolveAI Profile Discovery
  if (questionCount < 5) {
    const allowedTypes = ['multiple-choice', 'scale', 'most-least-choice'];
    const leastUsedType = allowedTypes.reduce((least, type) => 
      (questionTypeCount[type] || 0) < (questionTypeCount[least] || 0) ? type : least
    );

    if (!hasDiscussedStyle && leastUsedType === 'multiple-choice') {
      return {
        question: `As a ${profile.position}, I'm curious - when you think about leadership challenges, what comes up for you first?`,
        type: "multiple-choice",
        options: [
          "Getting everyone aligned on the same vision and direction",
          "Building trust and psychological safety within the team", 
          "Helping people grow and develop their potential",
          "Making tough decisions with incomplete information"
        ],
        reasoning: `EvolveAI profile discovery exploring primary leadership concerns for ${profile.position} role`
      };
    } else if (leastUsedType === 'scale') {
      return {
        question: `I'm curious about your confidence level - on a scale of 1-10, how confident do you feel in your ability to ${profile.motivation.toLowerCase()} through your leadership?`,
        type: "scale",
        scale_info: {
          min: 1,
          max: 10,
          min_label: "Not confident at all",
          max_label: "Extremely confident"
        },
        reasoning: `EvolveAI warm assessment of confidence in achieving ${profile.motivation}`
      };
    } else {
      return {
        question: "When you think about your leadership approach, which of these most and least represents how you naturally operate?",
        type: "most-least-choice",
        most_least_options: [
          "I focus on empowering others to make decisions",
          "I gather input but make the final call myself", 
          "I rely heavily on data and analysis",
          "I trust my intuition and experience"
        ],
        reasoning: "EvolveAI exploration of natural leadership decision-making patterns"
      };
    }
  }
  
  // Mid-stage questions (5-9)
  if (questionCount < 10) {
    if (!hasDiscussedTeam) {
      return {
        question: "When leading your team through priorities and decisions, which approach resonates most and least with you?",
        type: "most-least-choice",
        most_least_options: [
          "Gather extensive input before making decisions",
          "Make quick decisions and adjust as needed",
          "Focus on consensus and team buy-in",
          "Delegate decision-making to team experts",
          "Rely on data and analysis to guide choices"
        ],
        reasoning: "Contextual fallback exploring decision-making style with team"
      };
    } else {
      return {
        question: `On a scale of 1-10, how confident are you in your ability to ${profile.motivation.toLowerCase()} through your leadership?`,
        type: "scale",
        scale_info: {
          min: 1,
          max: 10,
          min_label: "Not confident at all",
          max_label: "Extremely confident"
        },
        reasoning: `Contextual fallback assessing confidence in achieving ${profile.motivation}`
      };
    }
  }
  
  // Final stage questions (10+)
  return {
    question: `Looking at your journey as a ${profile.position}, what's one leadership behavior or skill you'd most like to develop further?`,
    type: "open-ended", 
    reasoning: "Contextual fallback for growth and development focus"
  };
}