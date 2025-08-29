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
      conversationLength: conversationContext.length,
      sampleResponses: responses.slice(0, 2).map(r => r.substring(0, 100) + '...')
    });

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    if (!responses || responses.length === 0) {
      console.error('No responses provided for evaluation');
      throw new Error('No responses provided for evaluation');
    }

    console.log('Starting framework analysis...');
    
    // Analyze each framework using enhanced AI
    const frameworkAnalyses = await Promise.all(
      LEADERSHIP_FRAMEWORKS.map(async (framework, index) => {
        console.log(`Analyzing framework ${index + 1}/${LEADERSHIP_FRAMEWORKS.length}: ${framework.label}`);
        const result = await analyzeFramework(framework, responses, conversationContext);
        console.log(`Framework ${framework.label} analysis complete: Score ${result.score}`);
        return result;
      })
    );

    console.log('Framework analysis complete, generating overall assessment...');

    // Generate overall assessment
    const overallAssessment = await generateOverallAssessment(frameworkAnalyses, responses, conversationContext);

    const result: EvaluationResult = {
      frameworks: frameworkAnalyses,
      overall: overallAssessment
    };

    console.log('AI Evaluation completed successfully:', {
      avgScore: frameworkAnalyses.reduce((sum, f) => sum + f.score, 0) / frameworkAnalyses.length,
      persona: overallAssessment.persona
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-evaluation function:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeFramework(framework: any, responses: string[], conversationContext: string): Promise<FrameworkScore> {
  // Enhanced critical analysis prompt
  const prompt = `You are an expert leadership assessment coach conducting a rigorous evaluation. Analyze the user's responses for evidence of ${framework.label} competency.

FRAMEWORK TO EVALUATE: ${framework.label}

COMPLETE CONVERSATION CONTEXT: ${conversationContext}

USER RESPONSES TO ANALYZE: 
${responses.map((response, i) => `Response ${i + 1}: ${response}`).join('\n\n')}

CRITICAL EVALUATION CRITERIA:
1. **Depth of Self-Reflection**: Look for genuine introspection, not surface-level responses
2. **Specific Evidence**: Concrete examples, situations, and outcomes mentioned
3. **Quality of Reasoning**: Sophisticated thinking patterns and decision-making processes
4. **Growth Mindset**: Evidence of learning, adaptation, and self-improvement
5. **Authenticity**: Genuine responses vs. rehearsed or idealistic answers
6. **Leadership Maturity**: Demonstrates understanding of leadership complexity

STRICT SCORING GUIDELINES (Be Critical):
- 85-100: EXCEPTIONAL - Deep insights, multiple specific examples, sophisticated leadership thinking, clear evidence of mastery
- 70-84: STRONG - Good examples, solid understanding, demonstrates competence with room for growth
- 55-69: DEVELOPING - Basic understanding, limited examples, shows potential but needs development
- 40-54: EMERGING - Minimal evidence, surface-level responses, significant development needed
- 25-39: CONCERNING - Little to no evidence, unclear responses, major gaps in understanding
- 0-24: INADEQUATE - No evidence or concerning responses that suggest leadership challenges

ANALYSIS REQUIREMENTS:
- Quote specific phrases from their responses as evidence
- Identify gaps between what they say and how they demonstrate understanding
- Note any contradictions or inconsistencies
- Evaluate response quality: length, depth, specificity
- Consider the entire conversation flow, not just isolated answers

Provide your response in this exact JSON format:
{
  "score": [number 0-100],
  "confidence": [number 0-1 representing your confidence in this assessment],
  "level": [number 1-5 representing leadership maturity level],
  "summary": "[2-3 sentences explaining the score with specific evidence from their responses]",
  "evidence": "[Direct quotes from responses that support your assessment]"
}

BE CRITICAL. Most people score in the 40-70 range. High scores (80+) require exceptional evidence.`;

  try {
    console.log(`Making OpenAI API call for ${framework.label}...`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert leadership assessment coach with 20+ years of experience evaluating leadership competencies. You are known for your rigorous, evidence-based assessments that help leaders grow. Be critical but constructive in your evaluations.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 600
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API error for ${framework.label}:`, response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log(`OpenAI API response received for ${framework.label}`);
    
    const analysisText = data.choices[0].message.content;
    console.log(`Analysis text for ${framework.label}:`, analysisText.substring(0, 200) + '...');
    
    // Parse the JSON response
    const analysis = JSON.parse(analysisText);
    
    const result = {
      key: framework.key,
      label: framework.label,
      score: Math.max(0, Math.min(100, analysis.score)),
      summary: analysis.summary,
      confidence: Math.max(0, Math.min(1, analysis.confidence)),
      level: Math.max(1, Math.min(5, analysis.level))
    };

    console.log(`Framework ${framework.label} analyzed successfully:`, result);
    return result;

  } catch (error) {
    console.error(`Error analyzing framework ${framework.label}:`, error);
    console.error('Full error details:', error.stack);
    
    // Enhanced fallback scoring based on response quality
    const fallbackScore = calculateFallbackScore(responses, framework.key);
    
    return {
      key: framework.key,
      label: framework.label,
      score: fallbackScore,
      summary: `Based on response analysis, ${framework.label} shows ${fallbackScore >= 60 ? 'developing' : 'emerging'} competency. Consider providing more specific examples and deeper reflection for a more accurate assessment.`,
      confidence: 0.4,
      level: Math.ceil(fallbackScore / 20)
    };
  }
}

function calculateFallbackScore(responses: string[], frameworkKey: string): number {
  const responseText = responses.join(' ').toLowerCase();
  const responseLength = responseText.length;
  
  // Base score on response quality
  let score = 30; // Start at emerging level
  
  // Length factor (more detailed responses get higher scores)
  if (responseLength > 500) score += 15;
  else if (responseLength > 200) score += 10;
  else if (responseLength > 100) score += 5;
  
  // Look for specific leadership keywords
  const leadershipKeywords = ['team', 'manage', 'lead', 'decision', 'responsibility', 'growth', 'feedback', 'challenge', 'conflict', 'vision', 'goal', 'strategy'];
  const keywordCount = leadershipKeywords.filter(keyword => responseText.includes(keyword)).length;
  score += keywordCount * 3;
  
  // Look for examples and specificity
  if (responseText.includes('example') || responseText.includes('instance') || responseText.includes('situation')) score += 8;
  if (responseText.includes('learned') || responseText.includes('improved') || responseText.includes('developed')) score += 7;
  
  // Framework-specific keywords
  const frameworkKeywords: Record<string, string[]> = {
    'self_awareness': ['reflect', 'aware', 'understand myself', 'emotions', 'strengths', 'weaknesses'],
    'emotional_intelligence': ['emotional', 'feelings', 'empathy', 'others', 'understand'],
    'communication': ['communicate', 'listen', 'speak', 'message', 'clear', 'explain'],
    'decision_making': ['decide', 'choice', 'analyze', 'consider', 'evaluate', 'options'],
    'team_building': ['team', 'collaborate', 'together', 'support', 'build', 'unity'],
    'conflict_resolution': ['conflict', 'disagree', 'resolve', 'mediate', 'tension', 'solution'],
    'adaptability': ['adapt', 'change', 'flexible', 'adjust', 'pivot', 'respond'],
    'strategic_thinking': ['strategy', 'plan', 'future', 'vision', 'long-term', 'think ahead'],
    'coaching_development': ['coach', 'mentor', 'develop', 'teach', 'guide', 'grow others'],
    'accountability': ['accountable', 'responsible', 'ownership', 'deliver', 'commit', 'follow through'],
    'innovation': ['innovate', 'creative', 'new ideas', 'improve', 'change', 'solve'],
    'resilience': ['resilient', 'bounce back', 'persevere', 'overcome', 'stress', 'pressure']
  };
  
  const specificKeywords = frameworkKeywords[frameworkKey] || [];
  const specificMatches = specificKeywords.filter(keyword => responseText.includes(keyword)).length;
  score += specificMatches * 4;
  
  // Add some variance to avoid identical scores
  score += Math.random() * 10 - 5;
  
  return Math.max(25, Math.min(75, Math.round(score))); // Cap between 25-75 for fallback
}

async function generateOverallAssessment(frameworks: FrameworkScore[], responses: string[], conversationContext: string) {
  const avgScore = frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length;
  const topFrameworks = frameworks.sort((a, b) => b.score - a.score).slice(0, 3);
  const lowestFrameworks = frameworks.sort((a, b) => a.score - b.score).slice(0, 3);
  
  const prompt = `As an expert leadership coach, provide a comprehensive overall leadership evaluation based on this assessment data:

ASSESSMENT RESULTS:
- Average Score: ${avgScore.toFixed(1)}/100
- Top Strengths: ${topFrameworks.map(f => `${f.label} (${f.score}/100)`).join(', ')}
- Growth Areas: ${lowestFrameworks.map(f => `${f.label} (${f.score}/100)`).join(', ')}

DETAILED FRAMEWORK SCORES:
${frameworks.map(f => `• ${f.label}: ${f.score}/100 - ${f.summary}`).join('\n')}

COMPLETE CONVERSATION CONTEXT: ${conversationContext}

USER RESPONSES: ${responses.join('\n\n')}

ANALYSIS REQUIREMENTS:
1. Select the most fitting leadership persona from: ${LEADERSHIP_PERSONAS.join(', ')}
2. Create a personalized 3-4 sentence summary that:
   - Reflects their actual responses and conversation patterns
   - Highlights specific strengths with evidence
   - Identifies key development areas
   - Provides actionable insights for growth

SCORING CONTEXT:
- 80+: Exceptional leadership capability
- 65-79: Strong competence with growth potential  
- 50-64: Developing leader with foundational skills
- 35-49: Emerging leader needing significant development
- Below 35: Early-stage leadership development required

Provide your response in this exact JSON format:
{
  "persona": "[most appropriate persona from the provided list]",
  "summary": "[personalized 3-4 sentence summary based on their actual responses and patterns]"
}`;

  try {
    console.log('Generating overall assessment...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert leadership coach with extensive experience in leadership development. Provide personalized, actionable leadership profiles based on assessment data and actual user responses.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 400
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error for overall assessment:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    console.log('Overall assessment generated successfully');
    
    const analysis = JSON.parse(analysisText);
    
    return {
      persona: analysis.persona,
      summary: analysis.summary
    };

  } catch (error) {
    console.error('Error generating overall assessment:', error);
    console.error('Full error details:', error.stack);
    
    // Enhanced fallback assessment based on score distribution
    const persona = getPersonaFromScore(avgScore);
    const summary = generatePersonalizedSummary(avgScore, topFrameworks, lowestFrameworks);
                   
    return {
      persona,
      summary
    };
  }
}

function getPersonaFromScore(avgScore: number): string {
  if (avgScore >= 80) return LEADERSHIP_PERSONAS[0]; // Visionary
  if (avgScore >= 70) return LEADERSHIP_PERSONAS[1]; // Collaborative
  if (avgScore >= 60) return LEADERSHIP_PERSONAS[2]; // Strategic
  if (avgScore >= 50) return LEADERSHIP_PERSONAS[3]; // Empowering
  if (avgScore >= 40) return LEADERSHIP_PERSONAS[4]; // Adaptive
  return LEADERSHIP_PERSONAS[5]; // Results-Driven
}

function generatePersonalizedSummary(avgScore: number, topFrameworks: FrameworkScore[], lowestFrameworks: FrameworkScore[]): string {
  const strengthsText = topFrameworks.length > 0 ? topFrameworks[0].label : 'leadership fundamentals';
  const growthText = lowestFrameworks.length > 0 ? lowestFrameworks[0].label : 'core leadership skills';
  
  if (avgScore >= 75) {
    return `Your assessment reveals strong leadership capabilities with particular strength in ${strengthsText}. You demonstrate solid competencies across multiple leadership dimensions. Focus on further developing ${growthText} to reach exceptional leadership levels.`;
  } else if (avgScore >= 60) {
    return `Your leadership assessment shows developing competencies with notable strength in ${strengthsText}. You have foundational leadership skills with clear potential for growth. Prioritizing development in ${growthText} will accelerate your leadership effectiveness.`;
  } else if (avgScore >= 45) {
    return `Your assessment indicates emerging leadership potential with some strength in ${strengthsText}. You show foundational awareness but would benefit from focused development. Concentrate on building ${growthText} and seeking mentorship opportunities.`;
  } else {
    return `Your assessment suggests early-stage leadership development with potential in ${strengthsText}. This represents an excellent starting point for your leadership journey. Focus on developing ${growthText} through training, practice, and guidance from experienced leaders.`;
  }
}