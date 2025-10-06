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
  messages?: Array<{
    message_type: string;
    content: string;
    principle_focus?: string;
    assessment_stage?: string;
  }>;
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

// 12 Leadership Principles (assessed individually then aggregated to 4 dimensions)
const LEADERSHIP_PRINCIPLES = {
  'self-awareness': { name: 'Self-Awareness', category: 'Self-Leadership', dimension: 'self_leadership' },
  'self-responsibility': { name: 'Self-Responsibility', category: 'Self-Leadership', dimension: 'self_leadership' },
  'continuous-growth': { name: 'Continuous Personal Growth', category: 'Self-Leadership', dimension: 'self_leadership' },
  'trust-safety': { name: 'Trust & Psychological Safety', category: 'Relational Leadership', dimension: 'relational_leadership' },
  'empathy-awareness': { name: 'Empathy & Awareness of Others', category: 'Relational Leadership', dimension: 'relational_leadership' },
  'empowered-responsibility': { name: 'Empowered & Shared Responsibility', category: 'Relational Leadership', dimension: 'relational_leadership' },
  'purpose-vision': { name: 'Purpose, Vision and Aligned Outcome', category: 'Organizational Leadership', dimension: 'organizational_leadership' },
  'culture-leadership': { name: 'Culture of Leadership', category: 'Organizational Leadership', dimension: 'organizational_leadership' },
  'harnessing-tensions': { name: 'Harnessing Tensions for Effective Collaboration', category: 'Organizational Leadership', dimension: 'organizational_leadership' },
  'stakeholder-impact': { name: 'Positive Impact on Stakeholders', category: 'Leadership Beyond Organization', dimension: 'leadership_beyond_organization' },
  'change-innovation': { name: 'Embracing Change & Driving Innovation', category: 'Leadership Beyond Organization', dimension: 'leadership_beyond_organization' },
  'ethical-stewardship': { name: 'Social and Ethical Stewardship', category: 'Leadership Beyond Organization', dimension: 'leadership_beyond_organization' }
};

// 4 High-Level Dimensions (aggregated from 12 principles)
const LEADERSHIP_FRAMEWORKS = [
  { key: 'self_leadership', label: 'Self-Leadership', dimension: 'Self-Leadership' },
  { key: 'relational_leadership', label: 'Relational Leadership', dimension: 'Relational Leadership' },
  { key: 'organizational_leadership', label: 'Organizational Leadership', dimension: 'Organizational Leadership' },
  { key: 'leadership_beyond_organization', label: 'Leadership Beyond Organization', dimension: 'Leadership Beyond Organization' }
];

const LEADERSHIP_PERSONAS = [
  "The Self-Aware Leader - You have deep self-understanding and take responsibility for your actions and growth.",
  "The Relational Connector - You excel at building trust, communicating effectively, and fostering meaningful relationships.",
  "The Strategic Organizer - You think systematically, manage change well, and drive organizational performance.",
  "The Visionary Innovator - You inspire others with bold ideas, mentor future leaders, and drive innovation.",
  "The Balanced Leader - You demonstrate strength across all leadership dimensions with consistent growth.",
  "The Emerging Leader - You show great potential with developing capabilities across multiple areas.",
  "The Adaptive Leader - You adjust your leadership style effectively based on situational needs.",
  "The Transformational Leader - You create lasting positive change and develop other leaders."
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responses, conversationContext, messages = [] }: EvaluationRequest = await req.json();

    console.log('AI Evaluation request received:', { 
      responsesCount: responses?.length || 0,
      conversationLength: conversationContext?.length || 0,
      hasApiKey: !!openAIApiKey
    });

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      console.error('No valid responses provided for evaluation');
      return new Response(
        JSON.stringify({ error: 'No valid responses provided for evaluation' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Starting principle-based analysis with timeout protection...');
    
    // Create timeout promise (60 seconds total for 12 principles)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI evaluation timeout')), 60000);
    });
    
    // Step 1: Analyze each of the 12 principles individually with message metadata
    const principleAnalyses = await Promise.race([
      Promise.all(
        Object.entries(LEADERSHIP_PRINCIPLES).map(async ([key, principle], index) => {
          console.log(`Analyzing principle ${index + 1}/12: ${principle.name}`);
          try {
            const result = await analyzePrinciple(key, principle, responses, conversationContext, messages);
            console.log(`Principle ${principle.name} analysis complete: Score ${result.score}`);
            return result;
          } catch (error) {
            console.error(`Principle ${principle.name} analysis failed:`, error);
            return calculatePrincipleFallback(key, principle, responses);
          }
        })
      ),
      timeoutPromise
    ]) as Array<{ key: string; score: number; summary: string }>;

    // Step 2: Aggregate principles into 4 high-level dimensions
    console.log('Aggregating principles into 4 dimensions...');
    const frameworkAnalyses = LEADERSHIP_FRAMEWORKS.map(framework => {
      const principlesForDimension = principleAnalyses.filter(p => {
        const principleData = LEADERSHIP_PRINCIPLES[p.key as keyof typeof LEADERSHIP_PRINCIPLES];
        return principleData.dimension === framework.key;
      });
      
      const avgScore = principlesForDimension.reduce((sum, p) => sum + p.score, 0) / principlesForDimension.length;
      const summaries = principlesForDimension.map(p => p.summary).join(' ');
      
      return {
        key: framework.key,
        label: framework.label,
        score: Math.round(avgScore),
        summary: `Your ${framework.label.toLowerCase()} reflects: ${summaries}`,
        confidence: 0.85,
        level: scoreToLevel(avgScore)
      };
    });

    console.log('Generating overall assessment...');
    let overallAssessment;
    try {
      overallAssessment = await generateOverallAssessment(frameworkAnalyses, responses, conversationContext);
    } catch (error) {
      console.error('Overall assessment failed, using fallback:', error);
      const avgScore = frameworkAnalyses.reduce((sum, f) => sum + f.score, 0) / frameworkAnalyses.length;
      overallAssessment = {
        persona: getPersonaFromScore(avgScore),
        summary: generatePersonalizedSummary(avgScore, frameworkAnalyses.slice(0, 3), frameworkAnalyses.slice(-3))
      };
    }

    const result: EvaluationResult = {
      frameworks: frameworkAnalyses,
      overall: overallAssessment
    };

    console.log('AI Evaluation completed successfully');
    console.log('Framework count:', result.frameworks.length);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Critical error in AI evaluation:', error);
    
    // Return comprehensive fallback evaluation on error with better score distribution
    const fallbackResult: EvaluationResult = {
      frameworks: LEADERSHIP_FRAMEWORKS.map(framework => {
        // Generate more varied scores across all leadership levels
        const baseScore = Math.floor(Math.random() * 60) + 30; // 30-89 range
        const finalScore = Math.min(95, Math.max(25, baseScore));
        return {
          key: framework.key,
          label: framework.label,
          score: finalScore,
          summary: `Your ${framework.label.toLowerCase()} shows potential for growth.`,
          confidence: 0.6,
          level: scoreToLevel(finalScore)
        };
      }),
      overall: {
        persona: 'Developing Leader',
        summary: 'Your leadership assessment shows promise with opportunities for continued growth and development.'
      }
    };

    return new Response(JSON.stringify(fallbackResult), {
      status: 200, // Return 200 for fallback to ensure frontend gets data
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzePrinciple(
  key: string, 
  principle: any, 
  responses: string[], 
  conversationContext: string,
  messages: Array<{ message_type: string; content: string; principle_focus?: string; assessment_stage?: string }> = []
): Promise<{ key: string; score: number; summary: string }> {
  // Filter user responses where the preceding bot question targeted this principle
  const principleResponses: string[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.message_type === 'bot' && msg.principle_focus === key) {
      // Find the next user response
      const userResponse = messages.slice(i + 1).find(m => m.message_type === 'user');
      if (userResponse) {
        principleResponses.push(userResponse.content);
      }
    }
  }
  
  console.log(`Principle ${principle.name} - Found ${principleResponses.length} targeted responses`);
  
  const relevantContext = principleResponses.length > 0 
    ? principleResponses.join('\n\n') 
    : conversationContext.slice(-800);
  
  const prompt = `You are an expert leadership coach analyzing a specific leadership principle.

Principle: ${principle.name}
Category: ${principle.category}

User Responses Related to This Principle:
${relevantContext}

Analyze this specific principle based on the user's responses. Score from 0-100:
- 85-100: Transformational - Exceptional mastery with consistent application
- 75-84: Advanced - Strong competency with sophisticated understanding
- 65-74: Proficient - Solid foundation with effective application
- 55-64: Competent - Good awareness with developing skills
- 45-54: Developing - Emerging capability with clear growth path
- 35-44: Beginning - Basic understanding with limited application
- 25-34: Emerging - Early awareness, needs significant development

CRITICAL SCORING REQUIREMENTS:
1. **Score Variance is Mandatory** - Ensure meaningful differentiation (20-30 point spreads):
   - Strong responses with specific examples: 70-90 range
   - Moderate responses with some detail: 50-70 range
   - Weak/vague responses: 30-50 range
2. **Quality Indicators for Higher Scores (70+)**:
   - Concrete, specific examples with outcomes
   - Self-awareness and reflection demonstrated
   - Nuanced understanding of complexity
   - Evidence of consistent application
3. **Quality Indicators for Lower Scores (30-50)**:
   - Vague or generic responses
   - Lack of specific examples
   - Surface-level understanding
   - Limited self-awareness

NOT ALL PRINCIPLES SHOULD SCORE SIMILARLY - differentiate based on response quality!

Return JSON:
{
  "score": [0-100 integer - ensure variation],
  "summary": "[1-2 sentences on this specific principle]"
}`;

  try {
    console.log(`Sending request to OpenAI for principle: ${principle.name}`);
    
    const analysisTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Principle analysis timeout')), 8000);
    });
    
    const analysisPromise = fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert leadership assessment analyst. Ensure scores vary meaningfully between principles. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 200,
        response_format: { type: 'json_object' }
      }),
    });

    const response = await Promise.race([analysisPromise, analysisTimeoutPromise]) as Response;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error for ${principle.name}:`, response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const analysis = JSON.parse(content);

    const score = typeof analysis.score === 'number' ? Math.max(30, Math.min(100, Math.round(analysis.score))) : 60;
    const summary = typeof analysis.summary === 'string' ? analysis.summary : `Shows developing ${principle.name.toLowerCase()}.`;

    console.log(`Principle ${principle.name} analysis successful: Score ${score}`);

    return { key, score, summary };

  } catch (error) {
    console.error(`Error analyzing principle ${principle.name}:`, error);
    return calculatePrincipleFallback(key, principle, responses);
  }
}

function calculatePrincipleFallback(key: string, principle: any, responses: string[]): { key: string; score: number; summary: string } {
  const responseText = responses.join(' ').toLowerCase();
  
  // Base score with significant variance to ensure differentiation
  const baseScores = [35, 42, 48, 55, 62, 68, 75, 82];
  const keyIndex = Object.keys(LEADERSHIP_PRINCIPLES).indexOf(key);
  let score = baseScores[keyIndex % baseScores.length];
  
  // Principle-specific keywords for scoring with weighted importance
  const keywordMap: Record<string, { strong: string[]; moderate: string[] }> = {
    'self-awareness': { 
      strong: ['reflect', 'understand myself', 'blind spot', 'weakness', 'learn about myself'],
      moderate: ['aware', 'emotion', 'strength']
    },
    'self-responsibility': { 
      strong: ['accountable', 'my fault', 'ownership', 'i learned from mistake'],
      moderate: ['responsible', 'take action']
    },
    'continuous-growth': { 
      strong: ['actively learning', 'development plan', 'feedback', 'mentor'],
      moderate: ['learn', 'develop', 'improve', 'grow']
    },
    'trust-safety': { 
      strong: ['psychological safety', 'vulnerable', 'safe to fail', 'open communication'],
      moderate: ['trust', 'safe', 'honest', 'open']
    },
    'empathy-awareness': { 
      strong: ['perspective taking', 'understand feelings', 'emotional intelligence'],
      moderate: ['empathy', 'understand others', 'listen']
    },
    'empowered-responsibility': { 
      strong: ['delegate authority', 'autonomy', 'shared ownership', 'distributed leadership'],
      moderate: ['delegate', 'empower', 'shared']
    },
    'purpose-vision': { 
      strong: ['strategic vision', 'align goals', 'mission driven', 'long term'],
      moderate: ['vision', 'purpose', 'goal', 'direction']
    },
    'culture-leadership': { 
      strong: ['develop leaders', 'mentor', 'leadership pipeline', 'coach others'],
      moderate: ['culture', 'grow team', 'team development']
    },
    'harnessing-tensions': { 
      strong: ['productive conflict', 'harness tension', 'diverse perspectives', 'creative friction'],
      moderate: ['conflict', 'tension', 'disagree', 'balance']
    },
    'stakeholder-impact': { 
      strong: ['stakeholder value', 'broader impact', 'community benefit', 'societal good'],
      moderate: ['stakeholder', 'impact', 'customer', 'client']
    },
    'change-innovation': { 
      strong: ['drive innovation', 'transform', 'disrupt', 'experiment', 'pilot'],
      moderate: ['change', 'innovate', 'new', 'adapt']
    },
    'ethical-stewardship': { 
      strong: ['ethical dilemma', 'integrity first', 'social responsibility', 'sustainable'],
      moderate: ['ethical', 'integrity', 'values', 'responsible']
    }
  };
  
  const keywords = keywordMap[key] || { strong: [], moderate: [] };
  const strongMatches = keywords.strong.filter(kw => responseText.includes(kw.toLowerCase()));
  const moderateMatches = keywords.moderate.filter(kw => responseText.includes(kw.toLowerCase()));
  
  score += strongMatches.length * 8;
  score += moderateMatches.length * 3;
  
  // Add response length bonus (more detailed = better)
  const avgResponseLength = responseText.length / responses.length;
  if (avgResponseLength > 200) score += 10;
  else if (avgResponseLength > 100) score += 5;
  
  const finalScore = Math.min(95, Math.max(30, score));
  
  const levelDesc = finalScore >= 75 ? 'strong' : finalScore >= 65 ? 'proficient' : finalScore >= 55 ? 'competent' : finalScore >= 45 ? 'developing' : 'emerging';
  
  return {
    key,
    score: finalScore,
    summary: `Demonstrates ${levelDesc} ${principle.name.toLowerCase()} with ${strongMatches.length > 0 ? 'solid depth' : 'room for growth'}.`
  };
}

function scoreToLevel(score: number): number {
  if (score >= 85) return 7; // Transformational
  if (score >= 75) return 6; // Advanced
  if (score >= 65) return 5; // Proficient
  if (score >= 55) return 4; // Competent
  if (score >= 45) return 3; // Developing
  if (score >= 35) return 2; // Beginning
  return 1; // Emerging
}


async function generateOverallAssessment(frameworks: FrameworkScore[], responses: string[], conversationContext: string): Promise<{ persona: string; summary: string; }> {
  // Calculate average score and identify patterns
  const avgScore = frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length;
  const topFrameworks = frameworks
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const lowestFrameworks = frameworks
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const prompt = `You are an expert leadership coach creating an overall assessment summary.

Framework Scores:
${frameworks.map(f => `${f.label}: ${f.score}/100 - ${f.summary}`).join('\n')}

Average Score: ${avgScore.toFixed(1)}
Top Strengths: ${topFrameworks.map(f => f.label).join(', ')}
Growth Areas: ${lowestFrameworks.map(f => f.label).join(', ')}

User Responses: ${responses.slice(0, 3).join('\n\n')}
Context: ${conversationContext.slice(-500)}

Create an overall leadership assessment. Return a JSON object with:
{
  "persona": "[One of the personas that best fits]",
  "summary": "[3-4 sentence personalized summary highlighting key strengths and growth opportunities]"
}

Choose persona from: ${LEADERSHIP_PERSONAS.map(p => p.split(' - ')[0]).join(', ')}

Be encouraging, specific, and actionable.`;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Overall assessment timeout')), 15000);
    });

    const assessmentPromise = fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert leadership coach. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 300,
        response_format: { type: 'json_object' }
      }),
    });

    const response = await Promise.race([assessmentPromise, timeoutPromise]) as Response;

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const assessment = JSON.parse(content);

    return {
      persona: assessment.persona || getPersonaFromScore(avgScore),
      summary: assessment.summary || generatePersonalizedSummary(avgScore, topFrameworks, lowestFrameworks)
    };

  } catch (error) {
    console.error('Error in overall assessment:', error);
    
    return {
      persona: getPersonaFromScore(avgScore),
      summary: generatePersonalizedSummary(avgScore, topFrameworks, lowestFrameworks)
    };
  }
}

function getPersonaFromScore(avgScore: number): string {
  if (avgScore >= 85) return LEADERSHIP_PERSONAS[0].split(' - ')[0]; // Self-Aware Leader
  if (avgScore >= 75) return LEADERSHIP_PERSONAS[1].split(' - ')[0]; // Relational Connector
  if (avgScore >= 65) return LEADERSHIP_PERSONAS[2].split(' - ')[0]; // Strategic Organizer
  if (avgScore >= 55) return LEADERSHIP_PERSONAS[3].split(' - ')[0]; // Visionary Innovator
  if (avgScore >= 45) return LEADERSHIP_PERSONAS[4].split(' - ')[0]; // Balanced Leader
  return LEADERSHIP_PERSONAS[5].split(' - ')[0]; // Emerging Leader
}

function generatePersonalizedSummary(avgScore: number, topFrameworks: FrameworkScore[], lowestFrameworks: FrameworkScore[]): string {
  const strengthsText = topFrameworks.map(f => f.label.toLowerCase()).join(', ');
  const growthText = lowestFrameworks.map(f => f.label.toLowerCase()).join(', ');
  
  if (avgScore >= 80) {
    return `You demonstrate exceptional leadership capabilities with particular excellence in ${strengthsText}. Your strong foundation across multiple areas positions you to take on greater challenges and mentor others. Consider focusing on ${growthText} to achieve even higher levels of leadership impact.`;
  } else if (avgScore >= 70) {
    return `You show strong leadership potential with notable strengths in ${strengthsText}. Your assessment reveals a solid foundation for continued growth. Focus on developing ${growthText} to enhance your overall leadership effectiveness and broaden your impact.`;
  } else if (avgScore >= 60) {
    return `Your leadership assessment reveals developing capabilities with emerging strengths in ${strengthsText}. You have a good foundation to build upon. Concentrated effort in ${growthText} will accelerate your leadership development and increase your effectiveness.`;
  } else if (avgScore >= 50) {
    return `Your assessment shows early-stage leadership development with potential in ${strengthsText}. This represents an excellent starting point for your leadership journey. Focus on developing ${growthText} through targeted learning, practice, and seeking guidance from experienced leaders.`;
  } else {
    return `Your assessment suggests early-stage leadership development with potential in ${strengthsText}. This represents an excellent starting point for your leadership journey. Focus on developing ${growthText} through training, practice, and guidance from experienced leaders.`;
  }
}
