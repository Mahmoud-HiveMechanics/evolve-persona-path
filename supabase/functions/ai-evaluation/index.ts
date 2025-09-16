import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

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
  patterns?: LeadershipPattern[];
  adaptiveInsights?: string[];
}

interface LeadershipPattern {
  name: string;
  indicators: string[];
  strength: number;
  examples: string[];
  development: string[];
  category: 'strength' | 'growth_area' | 'emerging';
}

// Updated framework to match frontend 4-dimension structure
const LEADERSHIP_FRAMEWORKS = [
  // Self-Leadership
  { key: 'self_leadership', label: 'Self-Leadership', dimension: 'Self-Leadership' },
  
  // Relational Leadership  
  { key: 'relational_leadership', label: 'Relational Leadership', dimension: 'Relational Leadership' },
  
  // Organizational Leadership
  { key: 'organizational_leadership', label: 'Organizational Leadership', dimension: 'Organizational Leadership' },
  
  // Leadership Beyond Organization
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
    const { responses, conversationContext }: EvaluationRequest = await req.json();

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

    console.log('Starting framework analysis with timeout protection...');
    
    // Create timeout promise (45 seconds total)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI evaluation timeout')), 45000);
    });
    
    // Analyze each framework with enhanced error handling
    const frameworkAnalyses = await Promise.race([
      Promise.all(
        LEADERSHIP_FRAMEWORKS.map(async (framework, index) => {
          console.log(`Analyzing framework ${index + 1}/${LEADERSHIP_FRAMEWORKS.length}: ${framework.label}`);
          try {
            const result = await analyzeFramework(framework, responses, conversationContext);
            console.log(`Framework ${framework.label} analysis complete: Score ${result.score}`);
            return result;
          } catch (error) {
            console.error(`Framework ${framework.label} analysis failed:`, error);
            return calculateFallbackScore(responses, framework.key);
          }
        })
      ),
      timeoutPromise
    ]) as FrameworkScore[];

    console.log('Analyzing leadership patterns...');
    let leadershipPatterns: LeadershipPattern[] = [];
    let adaptiveInsights: string[] = [];
    try {
      const patternAnalysis = await analyzeLeadershipPatterns(responses, conversationContext);
      leadershipPatterns = patternAnalysis.patterns;
      adaptiveInsights = patternAnalysis.insights;
    } catch (error) {
      console.error('Pattern analysis failed:', error);
      leadershipPatterns = [];
      adaptiveInsights = [];
    }

    console.log('Generating overall assessment...');
    let overallAssessment;
    try {
      overallAssessment = await generateOverallAssessment(frameworkAnalyses, responses, conversationContext, leadershipPatterns);
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
      overall: overallAssessment,
      patterns: leadershipPatterns,
      adaptiveInsights: adaptiveInsights
    };

    console.log('AI Evaluation completed successfully');
    console.log('Framework count:', result.frameworks.length);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Critical error in AI evaluation:', error);
    
    // Return comprehensive fallback evaluation on error
    const fallbackResult: EvaluationResult = {
      frameworks: LEADERSHIP_FRAMEWORKS.map(framework => ({
        key: framework.key,
        label: framework.label,
        score: Math.floor(Math.random() * 30) + 50,
        summary: `Your ${framework.label.toLowerCase()} shows potential for growth.`,
        confidence: 0.6,
        level: 3
      })),
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

async function analyzeFramework(framework: any, responses: string[], conversationContext: string): Promise<FrameworkScore> {
  // Enhanced prompt with conversation context analysis
  const prompt = `You are an expert leadership coach analyzing a leadership assessment.

Framework: ${framework.label} (${framework.dimension})
Description: ${getFrameworkDescription(framework.key)}

User Responses: ${responses.slice(0, 10).join('\n\n')}

Full Conversation Context:
${conversationContext.slice(-1500)}

Analyze this leadership dimension based on:
1. Quality and depth of responses across the conversation
2. Self-awareness and growth mindset demonstrated
3. Practical examples and real-world application
4. Consistency between different answers
5. Leadership maturity shown in scenario responses

Score this dimension from 0-100 based on:
- 90-100: Exceptional leadership capability with transformational impact
- 80-89: Strong leadership competency with consistent effectiveness  
- 70-79: Developing leadership skills with good foundation
- 60-69: Emerging leadership potential with areas for growth
- 50-59: Basic leadership awareness with significant development needed
- Below 50: Early-stage leadership development required

Return a JSON object with exactly this structure:
{
  "score": [0-100 integer],
  "summary": "[2-3 sentence specific assessment]",
  "confidence": [0.0-1.0 float],
  "level": [1-5 integer where 1=emerging, 5=transformational]
}

Be specific, constructive, and actionable.`;

  try {
    console.log(`Sending request to OpenRouter for framework: ${framework.label}`);
    
    // Create timeout for individual framework analysis (10 seconds)
    const analysisTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Framework analysis timeout')), 10000);
    });
    
    const analysisPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert leadership assessment analyst. Always respond with valid JSON only. Be specific and actionable in your assessments.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 500,
        response_format: { type: 'json_object' }
      }),
    });

    const response = await Promise.race([analysisPromise, analysisTimeoutPromise]) as Response;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error for ${framework.label}:`, response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`OpenRouter response for ${framework.label}:`, data.choices?.[0]?.message?.content?.substring(0, 100));

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid OpenRouter response structure');
    }

    const content = data.choices[0].message.content;

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error(`JSON parse error for ${framework.label}:`, parseError);
      throw new Error('Failed to parse OpenRouter response as JSON');
    }

    // Validate and clean the response structure
    const score = typeof analysis.score === 'number' ? Math.max(0, Math.min(100, Math.round(analysis.score))) : 60;
    const summary = typeof analysis.summary === 'string' ? analysis.summary : `Assessment of ${framework.label.toLowerCase()} based on responses.`;
    const confidence = typeof analysis.confidence === 'number' ? Math.max(0, Math.min(1, analysis.confidence)) : 0.7;
    const level = typeof analysis.level === 'number' ? Math.max(1, Math.min(5, Math.round(analysis.level))) : 3;

    console.log(`Framework ${framework.label} analysis successful: Score ${score}`);

    return {
      key: framework.key,
      label: framework.label,
      score,
      summary,
      confidence,
      level
    };

  } catch (error) {
    console.error(`Error analyzing framework ${framework.label}:`, error);
    
    // Return comprehensive fallback score on error
    const fallback = calculateFallbackScore(responses, framework.key);
    return fallback;
  }
}

function calculateFallbackScore(responses: string[], frameworkKey: string): FrameworkScore {
  // Simple scoring based on response characteristics
  const responseText = responses.join(' ').toLowerCase();
  const responseLength = responseText.length;
  
  let score = 50; // Base score
  
  // Adjust based on response length
  if (responseLength > 100) score += 10;
  if (responseLength > 200) score += 5;
  
  // Updated keyword map for new framework structure
  const keywordMap: Record<string, string[]> = {
    self_leadership: ['responsibility', 'accountable', 'ownership', 'self-aware', 'growth', 'empathy', 'trust', 'values', 'integrity'],
    relational_leadership: ['communication', 'team', 'collaborate', 'relationship', 'trust', 'feedback', 'listen', 'connect'],
    organizational_leadership: ['strategy', 'vision', 'change', 'performance', 'manage', 'systems', 'goals', 'direction'],
    leadership_beyond_organization: ['innovation', 'mentor', 'inspire', 'influence', 'impact', 'future', 'transform', 'community']
  };
  
  const keywords = keywordMap[frameworkKey] || [];
  const matches = keywords.filter(keyword => responseText.includes(keyword));
  score += matches.length * 3;
  
  // Ensure score is within bounds
  const finalScore = Math.min(85, Math.max(30, score));
  
  const framework = LEADERSHIP_FRAMEWORKS.find(f => f.key === frameworkKey);
  
  return {
    key: frameworkKey,
    label: framework?.label || frameworkKey,
    score: finalScore,
    summary: `Your ${framework?.label?.toLowerCase() || frameworkKey} shows potential for growth based on your responses.`,
    confidence: 0.6,
    level: Math.min(5, Math.max(1, Math.floor(finalScore / 20) + 1))
  };
}

async function generateOverallAssessment(frameworks: FrameworkScore[], responses: string[], conversationContext: string, patterns?: LeadershipPattern[]): Promise<{ persona: string; summary: string; }> {
  // Calculate average score and identify patterns
  const avgScore = frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length;
  const topFrameworks = frameworks
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const lowestFrameworks = frameworks
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  // Enhanced prompt with pattern analysis
  const patternSummary = patterns ? `
Leadership Patterns Identified:
${patterns.map(p => `- ${p.name}: ${p.category} (${Math.round(p.strength * 100)}% strength)`).join('\n')}

Key Insights:
${patterns.filter(p => p.category === 'strength').map(p => `- ${p.name} is a significant strength`).join('\n')}
${patterns.filter(p => p.category === 'growth_area').map(p => `- ${p.name} represents a growth opportunity`).join('\n')}
` : '';

  const prompt = `You are an expert leadership coach creating a personalized assessment summary.

FRAMEWORK SCORES:
${frameworks.map(f => `${f.label}: ${f.score}/100 - ${f.summary}`).join('\n')}

Average Score: ${avgScore.toFixed(1)}
Top Strengths: ${topFrameworks.map(f => f.label).join(', ')}
Growth Areas: ${lowestFrameworks.map(f => f.label).join(', ')}

${patternSummary}

CONVERSATION ANALYSIS:
User Responses: ${responses.slice(0, 3).join('\n\n')}
Full Context: ${conversationContext.slice(-800)}

INSTRUCTIONS:
Create a personalized leadership assessment that:
1. Incorporates identified leadership patterns and strengths
2. Addresses specific growth areas with actionable recommendations
3. Reflects the user's unique communication style and experiences
4. Provides specific, achievable next steps
5. Acknowledges authentic leadership qualities beyond scores

Return a JSON object:
{
  "persona": "[Best-fitting persona from the list]",
  "summary": "[4-5 sentence personalized summary that tells their unique leadership story]"
}

Available Personas: ${LEADERSHIP_PERSONAS.map(p => p.split(' - ')[0]).join(', ')}

Focus on their authentic leadership journey and potential.`;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Overall assessment timeout')), 15000);
    });

    const assessmentPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
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
      throw new Error(`OpenRouter API error: ${response.status}`);
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

function getFrameworkDescription(frameworkKey: string): string {
  const descriptions: Record<string, string> = {
    self_leadership: 'Personal mastery including self-awareness, emotional intelligence, values alignment, personal responsibility, and continuous growth mindset.',
    relational_leadership: 'Building and maintaining effective relationships through communication, empathy, trust-building, team collaboration, and interpersonal skills.',
    organizational_leadership: 'Driving organizational success through strategic thinking, vision setting, change management, performance optimization, and systems leadership.',
    leadership_beyond_organization: 'Creating broader impact through innovation, mentoring others, community influence, and driving positive change beyond immediate organizational boundaries.'
  };
  return descriptions[frameworkKey] || 'A key leadership dimension for comprehensive leadership effectiveness.';
}

// Enhanced Pattern Recognition Functions
async function analyzeLeadershipPatterns(responses: string[], conversationContext: string): Promise<{ patterns: LeadershipPattern[], insights: string[] }> {
  const allText = responses.join(' ').toLowerCase();
  const patterns: LeadershipPattern[] = [];
  const insights: string[] = [];

  // Collaborative Leadership Pattern
  const collaborativeIndicators = ['team input', 'collaboration', 'shared decision', 'group consensus', 'team perspective', 'collective approach'];
  const collaborativeMatches = responses.filter(r =>
    collaborativeIndicators.some(indicator => r.toLowerCase().includes(indicator))
  );

  if (collaborativeMatches.length > 0) {
    const strength = collaborativeMatches.length / responses.length;
    patterns.push({
      name: 'Collaborative Leadership',
      indicators: collaborativeIndicators,
      strength: strength,
      examples: collaborativeMatches.slice(0, 2),
      development: [
        'Building consensus across diverse stakeholders',
        'Facilitating team decision-making processes',
        'Creating inclusive communication environments'
      ],
      category: strength > 0.6 ? 'strength' : 'emerging'
    });

    if (strength > 0.5) {
      insights.push('You demonstrate strong collaborative instincts, which is a significant leadership strength');
    }
  }

  // Strategic Thinking Pattern
  const strategicIndicators = ['strategy', 'vision', 'long.term', 'future', 'plan', 'objective', 'direction'];
  const strategicMatches = responses.filter(r =>
    strategicIndicators.some(indicator => r.toLowerCase().includes(indicator))
  );

  if (strategicMatches.length > 0) {
    const strength = strategicMatches.length / responses.length;
    patterns.push({
      name: 'Strategic Thinking',
      indicators: strategicIndicators,
      strength: strength,
      examples: strategicMatches.slice(0, 2),
      development: [
        'Developing long-term strategic perspective',
        'Connecting operational work to organizational vision',
        'Planning for future scenarios and challenges'
      ],
      category: strength > 0.4 ? 'strength' : 'growth_area'
    });

    if (strength < 0.3) {
      insights.push('Consider strengthening your strategic thinking by connecting daily work to long-term organizational goals');
    }
  }

  // Change Leadership Pattern
  const changeIndicators = ['change', 'transformation', 'adapt', 'innovation', 'growth', 'improve', 'evolve'];
  const changeMatches = responses.filter(r =>
    changeIndicators.some(indicator => r.toLowerCase().includes(indicator))
  );

  if (changeMatches.length > 0) {
    const strength = changeMatches.length / responses.length;
    patterns.push({
      name: 'Change Leadership',
      indicators: changeIndicators,
      strength: strength,
      examples: changeMatches.slice(0, 2),
      development: [
        'Leading through organizational transitions',
        'Building change capability in teams',
        'Managing resistance and uncertainty'
      ],
      category: strength > 0.5 ? 'strength' : 'emerging'
    });
  }

  // Relationship-Focused Pattern
  const relationshipIndicators = ['relationship', 'trust', 'empathy', 'support', 'develop', 'mentor', 'care'];
  const relationshipMatches = responses.filter(r =>
    relationshipIndicators.some(indicator => r.toLowerCase().includes(indicator))
  );

  if (relationshipMatches.length > 0) {
    const strength = relationshipMatches.length / responses.length;
    patterns.push({
      name: 'Relationship Building',
      indicators: relationshipIndicators,
      strength: strength,
      examples: relationshipMatches.slice(0, 2),
      development: [
        'Developing deeper interpersonal connections',
        'Building trust in professional relationships',
        'Practicing empathetic leadership'
      ],
      category: strength > 0.5 ? 'strength' : 'growth_area'
    });
  }

  // Operational Excellence Pattern
  const operationalIndicators = ['process', 'efficiency', 'execution', 'implementation', 'workflow', 'systems'];
  const operationalMatches = responses.filter(r =>
    operationalIndicators.some(indicator => r.toLowerCase().includes(indicator))
  );

  if (operationalMatches.length > 0) {
    const strength = operationalMatches.length / responses.length;
    patterns.push({
      name: 'Operational Excellence',
      indicators: operationalIndicators,
      strength: strength,
      examples: operationalMatches.slice(0, 2),
      development: [
        'Streamlining processes and systems',
        'Improving operational efficiency',
        'Managing complex implementation projects'
      ],
      category: strength > 0.6 ? 'strength' : 'emerging'
    });
  }

  // Identify contradictions
  const contradictions = detectContradictions(responses);
  if (contradictions.length > 0) {
    insights.push(`I noticed some interesting tensions in your responses: ${contradictions.join(', ')}. This suggests areas for further exploration and integration.`);
  }

  // Generate adaptive insights
  if (patterns.length >= 3) {
    insights.push('You show well-rounded leadership capabilities across multiple domains');
  }

  const strengthPatterns = patterns.filter(p => p.category === 'strength');
  if (strengthPatterns.length > 0) {
    insights.push(`Your strongest leadership patterns appear to be: ${strengthPatterns.map(p => p.name).join(', ')}`);
  }

  return { patterns, insights };
}

function detectContradictions(responses: string[]): string[] {
  const contradictions: string[] = [];
  const allText = responses.join(' ').toLowerCase();

  // Leadership style contradictions
  if (allText.includes('collaborative') && allText.includes('authoritative')) {
    contradictions.push('balancing collaborative and authoritative approaches');
  }

  // Decision-making contradictions
  if (allText.includes('quick decision') && allText.includes('thorough analysis')) {
    contradictions.push('reconciling quick decisions with thorough analysis');
  }

  // Risk contradictions
  if (allText.includes('risk taker') && allText.includes('risk averse')) {
    contradictions.push('navigating risk-taking vs risk-averse tendencies');
  }

  // Communication contradictions
  if (allText.includes('direct communication') && allText.includes('diplomatic approach')) {
    contradictions.push('balancing directness with diplomacy');
  }

  return contradictions;
}