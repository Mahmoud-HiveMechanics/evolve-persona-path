import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluationRequest {
  responses: string[];
  conversationContext: string;
}

interface FrameworkScore {
  key: string;
  label: string;
  score: number;
  summary: string;
  confidence: number;
  level: number;
}

interface EvaluationResult {
  frameworks: FrameworkScore[];
  overall: {
    persona: string;
    summary: string;
  };
}

const LEADERSHIP_FRAMEWORKS = [
  { key: 'self_awareness', label: 'Self-Awareness' },
  { key: 'emotional_intelligence', label: 'Emotional Intelligence' },
  { key: 'communication', label: 'Communication' },
  { key: 'decision_making', label: 'Decision Making' },
  { key: 'team_building', label: 'Team Building' },
  { key: 'conflict_resolution', label: 'Conflict Resolution' },
  { key: 'adaptability', label: 'Adaptability' },
  { key: 'strategic_thinking', label: 'Strategic Thinking' },
  { key: 'coaching_development', label: 'Coaching & Development' },
  { key: 'accountability', label: 'Accountability' },
  { key: 'innovation', label: 'Innovation' },
  { key: 'resilience', label: 'Resilience' }
];

const LEADERSHIP_PERSONAS = [
  'The Visionary Leader',
  'The Collaborative Leader', 
  'The Strategic Leader',
  'The Empowering Leader',
  'The Adaptive Leader',
  'The Results-Driven Leader'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responses, conversationContext }: EvaluationRequest = await req.json();

    console.log('AI Evaluation request received:', { 
      responsesCount: responses.length,
      conversationLength: conversationContext.length 
    });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Analyze each framework using AI
    const frameworkAnalyses = await Promise.all(
      LEADERSHIP_FRAMEWORKS.map(framework => analyzeFramework(framework, responses, conversationContext))
    );

    // Generate overall assessment
    const overallAssessment = await generateOverallAssessment(frameworkAnalyses, responses, conversationContext);

    const result: EvaluationResult = {
      frameworks: frameworkAnalyses,
      overall: overallAssessment
    };

    console.log('AI Evaluation completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-evaluation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeFramework(framework: any, responses: string[], conversationContext: string): Promise<FrameworkScore> {
  const prompt = `As an expert leadership assessment coach, analyze the following user responses for evidence of ${framework.label} competency.

FRAMEWORK: ${framework.label}
USER RESPONSES: ${responses.join('\n\n')}
CONVERSATION CONTEXT: ${conversationContext}

Evaluate this leadership framework on a scale of 0-100 based on:
1. Depth of self-reflection and awareness
2. Specific examples and evidence provided
3. Quality of reasoning and decision-making
4. Demonstration of growth mindset
5. Authenticity and genuineness of responses

SCORING GUIDELINES:
- 90-100: Exceptional demonstration with deep insights, specific examples, and sophisticated understanding
- 80-89: Strong evidence with good examples and solid understanding
- 70-79: Good demonstration with some examples and reasonable understanding
- 60-69: Adequate evidence with basic understanding
- 50-59: Limited evidence with minimal understanding
- Below 50: Insufficient evidence or concerning responses

Provide your response in this exact JSON format:
{
  "score": [number 0-100],
  "confidence": [number 0-1 representing your confidence in this assessment],
  "level": [number 1-5 representing leadership maturity level],
  "summary": "[2-3 sentence summary explaining the score and key observations]",
  "evidence": "[specific examples from responses that support your assessment]"
}

Be critical but fair. Look for genuine leadership thinking, not just buzzwords.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are an expert leadership assessment coach with deep expertise in evaluating leadership competencies. Provide accurate, evidence-based assessments.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse the JSON response
    const analysis = JSON.parse(analysisText);
    
    return {
      key: framework.key,
      label: framework.label,
      score: Math.max(0, Math.min(100, analysis.score)),
      summary: analysis.summary,
      confidence: Math.max(0, Math.min(1, analysis.confidence)),
      level: Math.max(1, Math.min(5, analysis.level))
    };

  } catch (error) {
    console.error(`Error analyzing framework ${framework.label}:`, error);
    
    // Fallback scoring
    return {
      key: framework.key,
      label: framework.label,
      score: 60, // Conservative fallback
      summary: `Analysis of ${framework.label} could not be completed due to technical issues.`,
      confidence: 0.3,
      level: 3
    };
  }
}

async function generateOverallAssessment(frameworks: FrameworkScore[], responses: string[], conversationContext: string) {
  const avgScore = frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length;
  const topFrameworks = frameworks.sort((a, b) => b.score - a.score).slice(0, 3);
  
  const prompt = `Based on this leadership assessment data, provide an overall evaluation:

AVERAGE SCORE: ${avgScore.toFixed(1)}
TOP FRAMEWORKS: ${topFrameworks.map(f => `${f.label} (${f.score})`).join(', ')}
ALL FRAMEWORK SCORES: ${frameworks.map(f => `${f.label}: ${f.score}`).join(', ')}

USER RESPONSES: ${responses.join('\n\n')}

Determine:
1. The most appropriate leadership persona from: ${LEADERSHIP_PERSONAS.join(', ')}
2. A personalized 2-3 sentence summary of their leadership profile

Consider their overall pattern of responses, strengths, and areas for growth.

Provide your response in this exact JSON format:
{
  "persona": "[one of the provided personas]",
  "summary": "[personalized 2-3 sentence summary]"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are an expert leadership coach providing personalized leadership profiles.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.4,
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    const analysis = JSON.parse(analysisText);
    
    return {
      persona: analysis.persona,
      summary: analysis.summary
    };

  } catch (error) {
    console.error('Error generating overall assessment:', error);
    
    // Fallback assessment
    const persona = avgScore >= 80 ? LEADERSHIP_PERSONAS[0] : 
                   avgScore >= 70 ? LEADERSHIP_PERSONAS[1] :
                   avgScore >= 60 ? LEADERSHIP_PERSONAS[2] :
                   LEADERSHIP_PERSONAS[3];
                   
    return {
      persona,
      summary: `Your leadership assessment shows ${avgScore >= 70 ? 'strong' : 'developing'} capabilities across multiple dimensions. Continue focusing on growth and self-reflection.`
    };
  }
}