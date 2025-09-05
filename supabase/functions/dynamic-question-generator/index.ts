import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Type definitions
interface GenerateQuestionRequest {
  conversationId: string;
  lastResponse: string;
  currentPersona: any;
  conversationHistory: any[];
  frameworkQuestions: any[];
  questionCount: number;
  leadershipStyle?: any;
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
  followUpType: 'clarification' | 'depth' | 'challenge' | 'contradiction' | 'scenario' | 'framework';
  targetedPrinciples: string[];
}

interface ResponseAnalysis {
  qualityScore: number; // 1-10
  depth: 'surface' | 'moderate' | 'deep';
  leadershipInsights: {
    strengths: string[];
    gaps: string[];
    contradictions: string[];
    principles: { [key: string]: number }; // principle -> score
  };
  needsFollowUp: boolean;
  followUpReasons: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LEADERSHIP_PRINCIPLES = [
  'Self-Awareness', 'Self-Responsibility', 'Continuous Personal Growth',
  'Trust and Psychological Safety', 'Empathy and Awareness of Others',
  'Purpose/Vision/Aligned Outcome', 'Empowered/Shared Responsibility', 
  'Culture of Leadership', 'Change/Innovation', 'Productive Tension Management',
  'Stakeholder Impact', 'Social/Ethical Stewardship'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const requestData: GenerateQuestionRequest = await req.json();

    console.log('Generating dynamic question for conversation:', requestData.conversationId);

    // Step 1: Analyze the last response
    const responseAnalysis = await analyzeResponse(
      requestData.lastResponse,
      requestData.currentPersona,
      requestData.conversationHistory,
      OPENAI_API_KEY
    );

    console.log('Response analysis:', responseAnalysis);

    // Step 2: Update conversation persona
    await updateConversationPersona(
      supabase,
      requestData.conversationId,
      responseAnalysis.leadershipInsights,
      requestData.currentPersona
    );

    // Step 3: Generate next question based on analysis
    const nextQuestion = await generateContextualQuestion(
      requestData.lastResponse,
      responseAnalysis,
      requestData.conversationHistory,
      requestData.frameworkQuestions,
      requestData.questionCount,
      OPENAI_API_KEY,
      requestData.leadershipStyle
    );

    console.log('Generated question:', nextQuestion);

    return new Response(
      JSON.stringify({
        success: true,
        question: nextQuestion,
        analysis: responseAnalysis
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in dynamic question generation:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        fallback: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function analyzeResponse(
  response: string,
  currentPersona: any,
  conversationHistory: any[],
  apiKey: string
): Promise<ResponseAnalysis> {
  const prompt = `
ROLE: Expert leadership assessment analyst

TASK: Analyze this leadership assessment response for quality, depth, and leadership insights.

RESPONSE TO ANALYZE: "${response}"

CURRENT PERSONA SNAPSHOT: ${JSON.stringify(currentPersona)}

CONVERSATION CONTEXT: ${conversationHistory.slice(-3).map(msg => `${msg.message_type}: ${msg.content}`).join('\n')}

LEADERSHIP PRINCIPLES TO ASSESS:
${LEADERSHIP_PRINCIPLES.map((p, i) => `${i + 1}. ${p}`).join('\n')}

ANALYSIS REQUIREMENTS:

1. QUALITY SCORE (1-10):
- 1-3: Generic, superficial, buzzwords only
- 4-6: Some specifics but lacks depth or examples
- 7-8: Concrete examples with good insight
- 9-10: Deep self-awareness with specific evidence

2. DEPTH ASSESSMENT:
- surface: Generic responses, no examples, theoretical only
- moderate: Some specifics but missing key details
- deep: Rich examples with clear insights and self-awareness

3. LEADERSHIP INSIGHTS:
- Identify demonstrated strengths (be specific)
- Identify gaps or blind spots (what's missing)
- Note any contradictions with previous responses
- Score each relevant leadership principle 1-10 based on evidence

4. FOLLOW-UP NECESSITY:
- Does this response reveal interesting contradictions?
- Are there vague statements that need clarification?
- Is there potential for deeper exploration?
- Are there gaps in their leadership narrative?

OUTPUT FORMAT: Respond with ONLY valid JSON in exactly this format:
{
  "qualityScore": 7,
  "depth": "moderate",
  "leadershipInsights": {
    "strengths": ["specific strength with evidence"],
    "gaps": ["specific gap or blind spot"],
    "contradictions": ["any contradictions noted"],
    "principles": {"Self-Awareness": 8, "Trust and Psychological Safety": 6}
  },
  "needsFollowUp": true,
  "followUpReasons": ["specific reason for follow-up"]
}

CRITICAL: Return ONLY the JSON object above. No additional text, explanations, or formatting.
Be ruthlessly honest in your assessment. Most leadership responses are surface-level.
`;

  const response_api = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
          body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 1500,
        response_format: { type: 'json_object' }
      }),
  });

  if (!response_api.ok) {
    console.error('OpenAI API error:', await response_api.text());
    throw new Error('Failed to analyze response');
  }

  const data = await response_api.json();
  
  // Validate OpenAI response structure
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    console.error('Invalid OpenAI response structure:', JSON.stringify(data));
    throw new Error('Invalid response from OpenAI API');
  }
  
  const content = data.choices[0].message.content.trim();
  
  // Add error handling for JSON parsing
  try {
    const parsed = JSON.parse(content);
    
    // Validate required fields for ResponseAnalysis
    if (typeof parsed.qualityScore !== 'number' || 
        !parsed.depth || 
        !parsed.leadershipInsights ||
        typeof parsed.needsFollowUp !== 'boolean') {
      console.error('Invalid response analysis structure:', parsed);
      throw new Error('Response analysis missing required fields');
    }
    
    return parsed;
  } catch (parseError) {
    console.error('Failed to parse OpenAI response as JSON. Content:', content);
    console.error('Parse error:', parseError);
    
    // Return a minimal valid response as fallback
    return {
      qualityScore: 3,
      depth: 'surface',
      leadershipInsights: {
        strengths: [],
        gaps: ['Unable to analyze response due to parsing error'],
        contradictions: [],
        principles: {}
      },
      needsFollowUp: true,
      followUpReasons: ['Previous response could not be analyzed, asking for clarification']
    };
  }
}

async function generateContextualQuestion(
  lastResponse: string,
  analysis: ResponseAnalysis,
  conversationHistory: any[],
  frameworkQuestions: any[],
  questionCount: number,
  apiKey: string,
  leadershipStyle?: any
): Promise<QuestionResponse> {
  // Determine if we should use framework question or generate dynamic one
  const shouldGenerateDynamic = analysis.needsFollowUp || 
                               analysis.qualityScore < 6 || 
                               analysis.depth === 'surface';

  if (!shouldGenerateDynamic && questionCount < frameworkQuestions.length) {
    // Use next framework question
    const nextFramework = frameworkQuestions[questionCount];
    return {
      question: nextFramework.text,
      type: nextFramework.type,
      options: nextFramework.options,
      most_least_options: nextFramework.most_least_options,
      reasoning: 'Using structured framework question',
      followUpType: 'framework',
      targetedPrinciples: nextFramework.assesses || []
    };
  }

  // Generate dynamic question with leadership style bias
  const leadershipBias = leadershipStyle ? `
LEADERSHIP STYLE ANALYSIS (Use this to bias your questions):
- Primary Style: ${leadershipStyle.primaryStyle}
- Secondary Style: ${leadershipStyle.secondaryStyle}
- Focus Areas: ${leadershipStyle.focusAreas?.join(', ')}
- Strengths: ${leadershipStyle.strengths?.join(', ')}
- Potential Blind Spots: ${leadershipStyle.potentialBlindSpots?.join(', ')}
- Recommended Question Bias: ${leadershipStyle.recommendedQuestionBias?.join(', ')}

BIAS INSTRUCTIONS:
- Focus questions on the identified blind spots and gaps
- Challenge the participant's comfort zone based on their style
- If they're analytical, ask about quick decisions and action
- If they're action-oriented, probe reflection and collaboration
- If they're collaborative, explore independent leadership
- If they're strategic, focus on operational execution
- If they're empathetic, explore tough conversations and accountability
` : '';

  const prompt = `
ROLE: Expert leadership assessment interviewer

TASK: Generate ONE contextually perfect follow-up question based on the analysis.

LAST RESPONSE: "${lastResponse}"

RESPONSE ANALYSIS:
- Quality Score: ${analysis.qualityScore}/10
- Depth: ${analysis.depth}
- Needs Follow-up: ${analysis.needsFollowUp}
- Follow-up Reasons: ${analysis.followUpReasons.join(', ')}
- Identified Gaps: ${analysis.leadershipInsights.gaps.join(', ')}
${leadershipBias}

QUESTION GENERATION RULES:

1. FOR SURFACE RESPONSES (score 1-5):
Generate clarification questions that demand specific examples:
- "You mentioned X. Can you give me a specific example from the last 3 months?"
- "That sounds thoughtful, but what did this look like in practice?"
- "Help me understand - what exactly happened and what did others observe?"

2. FOR MODERATE RESPONSES (score 6-7):
Generate depth questions that explore implications:
- "What surprised you about how that played out?"
- "How did your team members react to your approach?"
- "What would have happened if you had handled it differently?"

3. FOR CONTRADICTIONS:
Address them directly:
- "Earlier you mentioned Y, but this suggests Z. Help me understand the difference."

4. FOR GAPS IN LEADERSHIP AREAS:
Target unexplored principles:
- Focus on principles scored low or not mentioned
- Create scenario questions for missing competencies

5. QUESTION TYPES:
- Use "open-ended" for most follow-ups requiring examples
- Use "multiple-choice" only for scenario-based dilemmas
- Use "scale" for self-assessment ratings
- Keep questions conversational and natural

OUTPUT FORMAT: Respond with ONLY valid JSON in exactly this format:
{
  "question": "Can you give me a specific example of when you had to handle a difficult team situation?",
  "type": "open-ended", 
  "reasoning": "Seeking concrete evidence and specific examples",
  "followUpType": "clarification",
  "targetedPrinciples": ["Self-Awareness", "Trust and Psychological Safety"]
}

CRITICAL: 
- Return ONLY the JSON object above. No additional text, explanations, or formatting.
- Make the question feel natural and conversational, not robotic or formal.
- Include "options" and "scale_info" fields only if the type requires them.
`;

  const response_api = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
          body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 800,
        response_format: { type: 'json_object' }
      }),
  });

  if (!response_api.ok) {
    console.error('OpenAI API error:', await response_api.text());
    throw new Error('Failed to generate question');
  }

  const data = await response_api.json();
  
  // Validate OpenAI response structure
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    console.error('Invalid OpenAI response structure for question generation:', JSON.stringify(data));
    throw new Error('Invalid response from OpenAI API');
  }
  
  const content = data.choices[0].message.content.trim();
  
  // Add error handling for JSON parsing
  try {
    const parsed = JSON.parse(content);
    
    // Validate required fields for QuestionResponse
    if (!parsed.question || !parsed.type) {
      console.error('Invalid question response structure:', parsed);
      throw new Error('Generated question missing required fields');
    }
    
    return parsed;
  } catch (parseError) {
    console.error('Failed to parse OpenAI question response as JSON. Content:', content);
    console.error('Parse error:', parseError);
    
    // Return a fallback question
    return {
      question: "Can you tell me more about a specific leadership challenge you faced recently? What exactly happened, and how did you handle it?",
      type: 'open-ended',
      reasoning: 'Fallback question due to parsing error',
      followUpType: 'clarification',
      targetedPrinciples: ['Self-Awareness', 'Self-Responsibility']
    };
  }
}

async function updateConversationPersona(
  supabase: any,
  conversationId: string,
  insights: any,
  currentPersona: any
) {
  // Merge new insights with current persona
  const updatedPersona = {
    ...currentPersona,
    strengths: [...(currentPersona.strengths || []), ...insights.strengths],
    gaps: [...(currentPersona.gaps || []), ...insights.gaps],
    principles: {
      ...currentPersona.principles,
      ...insights.principles
    },
    lastUpdated: new Date().toISOString()
  };

  // Update conversation with new persona snapshot
  const { error } = await supabase
    .from('conversations')
    .update({ persona_snapshot: updatedPersona })
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating persona:', error);
  }
}