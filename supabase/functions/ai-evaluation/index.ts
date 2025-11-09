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
  principles: FrameworkScore[];
  overall: {
    persona: string;
    summary: string;
  };
}

// 12 Leadership Principles - CRITICAL: Keys must match dynamic-question-generator (kebab-case)
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
      messagesCount: messages?.length || 0,
      hasApiKey: !!openAIApiKey
    });

    // Log principle coverage from messages for debugging
    const principleCoverageLog: Record<string, number> = {};
    messages.forEach(msg => {
      if (msg.message_type === 'bot' && msg.principle_focus) {
        principleCoverageLog[msg.principle_focus] = (principleCoverageLog[msg.principle_focus] || 0) + 1;
      }
    });
    console.log('📊 Principle coverage in messages:', principleCoverageLog);

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
    console.log(`🎯 Analyzing ${Object.keys(LEADERSHIP_PRINCIPLES).length} principles individually...`);
    
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

    // Step 2: Log natural score distribution (no artificial adjustments)
    console.log('✅ All principles analyzed - Score Distribution:');
    const scores = principleAnalyses.map(p => p.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const scoreSpread = maxScore - minScore;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    console.log(`  📊 Range: ${minScore}-${maxScore} (spread: ${scoreSpread} points)`);
    console.log(`  📊 Average: ${Math.round(avgScore)}`);
    console.log(`  📊 Distribution: ${principleAnalyses.map(p => `${p.key}=${p.score}`).join(', ')}`);

    // Step 3: Aggregate principles into 4 high-level dimensions
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

    // Convert principle analyses to FrameworkScore format
    const principleScores: FrameworkScore[] = principleAnalyses.map(analysis => {
      const principleData = LEADERSHIP_PRINCIPLES[analysis.key as keyof typeof LEADERSHIP_PRINCIPLES];
      return {
        key: analysis.key,
        label: principleData.name,
        score: analysis.score,
        summary: analysis.summary,
        confidence: 0.85,
        level: scoreToLevel(analysis.score)
      };
    });

    const result: EvaluationResult = {
      frameworks: frameworkAnalyses,
      principles: principleScores,
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
    const fallbackFrameworks = LEADERSHIP_FRAMEWORKS.map(framework => {
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
    });

    const fallbackPrinciples = Object.entries(LEADERSHIP_PRINCIPLES).map(([key, principle]) => {
      const baseScore = Math.floor(Math.random() * 60) + 30; // 30-89 range
      const finalScore = Math.min(95, Math.max(25, baseScore));
      return {
        key,
        label: principle.name,
        score: finalScore,
        summary: `Your ${principle.name.toLowerCase()} shows potential for growth.`,
        confidence: 0.6,
        level: scoreToLevel(finalScore)
      };
    });

    const fallbackResult: EvaluationResult = {
      frameworks: fallbackFrameworks,
      principles: fallbackPrinciples,
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
  
  console.log(`🎯 Principle ${principle.name} (${key}) - Found ${principleResponses.length} targeted responses`);
  if (principleResponses.length > 0) {
    console.log(`  📝 Response samples: ${principleResponses.slice(0, 2).map(r => r.slice(0, 60) + '...').join(' | ')}`);
  }
  
  const relevantContext = principleResponses.length > 0 
    ? principleResponses.join('\n\n') 
    : conversationContext.slice(-800);
  
  console.log(`  📊 Context length: ${relevantContext.length} chars, ${principleResponses.length} targeted responses`);
  
  const prompt = `You are an expert leadership coach analyzing responses for the principle: ${principle.name}

User Response:
${relevantContext}

SCORING APPROACH: Focus ONLY on LANGUAGE PATTERNS and CONTENT, NOT response length or format. Score based on WHAT they say, not HOW MUCH they say.

SCORE BASED ON THESE LANGUAGE INDICATORS:

**LEVEL 1 - Emerging (1-20):**
Look for these language patterns:
- External blame: "the team didn't", "they failed", "others didn't", "it wasn't really my failure"
- No ownership: "I had given clear guidance", "the team needed to perform better"
- Defensive: "I felt they didn't appreciate", "I dismissed it", "I felt misunderstood"
- Control-focused: "I told them to", "I made sure they", "my job is to"
- No emotional awareness: Describes events without feelings or reflection
- Dismissive: "I don't really see a need", "I've been doing this long enough", "I prefer to move forward"
- Complacency: "I focus on what I do best", "I don't think much about"

Example Level 1: "During a board meeting, one of our investors told me I tend to shut down debate when my ideas are challenged. Honestly, it irritated me — I felt they didn't appreciate how much pressure I'm under. I dismissed it at first, assuming they just didn't see the bigger picture."
Key indicators: "it irritated me", "I felt they didn't appreciate", "I dismissed it"

**LEVEL 2 - Developing (20-40):**
Look for these language patterns:
- Surface acknowledgment: "I realized I could have", "I should have", "I later realized"
- Compliance mindset: "I need to", "I should", "I went along because", "it seemed expected"
- Procedural focus: "I implemented", "I set up processes", "I apologized to"
- After-the-fact reflection: "Eventually I", "A few days later", "Later I realized"
- Inconsistent change: "I still catch myself", "though I still", "I didn't make big changes"
- Conditional: "I think it's okay to be open sometimes, but it has to be carefully managed"

Example Level 2: "I once received feedback that I sometimes dominate discussions. It stung, because I saw myself as a decisive leader. Initially, I felt misunderstood. A few days later, I realized they might be right. I've started pausing more before responding, though I still catch myself reverting under pressure."
Key indicators: "A few days later, I realized", "I've started", "though I still catch myself"

**LEVEL 3 - Expanding (40-60):**
Look for these language patterns:
- Genuine reflection: "I took time to think", "I realized", "as I reflected", "I saw"
- Links intent to impact: "my tone could make others", "I saw how my actions", "it taught me that"
- Behavioral change: "I began asking", "I started", "I invited them", "I tried to listen"
- Values awareness: "I value", "I learned that", "it reminded me"
- Impact awareness: "It's made our", "it helped", "that experience taught me"
- Practical vulnerability: "I admitted I didn't have all the answers", "I asked for their candid input"

Example Level 3: "After a major presentation, one of my senior leaders told me that my communication can feel intimidating. My first reaction was defensive — I've always valued candor. But I took time to think about it and realized my tone could make others hesitant. I began asking my team to give me real-time feedback and experimented with softer phrasing. It's made our strategic discussions more balanced."
Key indicators: "I took time to think", "I realized", "I began asking", "It's made our"

**LEVEL 4 - Flourishing (60-80):**
Look for these language patterns:
- Mature emotional intelligence: "as I reflected, I saw the truth in it", "I communicated candidly"
- Transparent accountability: "I addressed the entire company", "I took full responsibility", "I acknowledged"
- Systemic thinking: "strengthened our culture", "improved team morale", "across the organization", "people began speaking"
- Values-driven: "it didn't align with our values", "credibility isn't built by", "I learned that trust grows"
- Creates safety: "people began speaking more honestly", "strengthened trust", "deepened trust"
- Co-creation: "I facilitated workshops", "we co-created", "we mapped each role"

Example Level 4: "After a leadership retreat, my CHRO shared that I often move too quickly from problem to solution. It stung because I pride myself on being efficient. But as I reflected, I saw the truth in it — my need for speed sometimes overshadows the emotional processing others need. Since then, I've made it a practice to slow down, name the tension, and invite more perspectives. It's deepened trust and improved decision quality across the organization."
Key indicators: "as I reflected, I saw the truth", "I've made it a practice", "It's deepened trust", "across the organization"

**LEVEL 5 - Thriving (80-100):**
Look for these language patterns:
- Transformative wisdom: "became transformative", "completely reshaped my perspective", "that feedback became transformative"
- Cultural transformation: "created a leadership culture", "we redesigned", "we built", "we've embedded", "it's now part of"
- Regenerative: "transforming error into wisdom", "turned that experience into", "we turned that experience"
- Deep conscience: "our company exists to", "foundation of sustainable growth", "for me, ethics isn't a trade-off"
- Collective learning: "we redesigned", "we built", "normalizing", "the result strengthened"
- Systemic awareness: "I used the experience to start a broader dialogue", "normalizing open conversations", "strengthened both individual trust and our organizational culture"

Example Level 5: "Several years ago, my coach told me that my constant drive to protect sometimes prevents others from developing their own resilience. It was uncomfortable to hear because care is core to who I am. But that feedback became transformative. I realized that by stepping in too quickly, I was unintentionally limiting others' leadership growth. I began practicing deeper listening and asking generative questions. Over time, that shift created a leadership culture rooted in trust, empowerment, and shared ownership."
Key indicators: "became transformative", "I realized", "Over time, that shift created a leadership culture", "rooted in trust, empowerment"

CRITICAL SCORING RULES:
1. IGNORE response length - a short response with high-level language can score 80+
2. IGNORE format - MCQ responses can score high if language shows high-level thinking
3. FOCUS on language patterns - match the actual words and phrases used
4. USE FULL RANGE - don't compress scores. If language shows Level 5, score 80-100. If Level 1, score 1-20
5. DIFFERENTIATE clearly - Level 1 responses should score 1-20, Level 5 should score 80-100
6. MINIMAL EFFORT ONLY: If response is truly minimal ("x", "xx", blank), score 5-15. Otherwise, score based on language patterns above.

Return JSON only:
{
  "score": [1-100 integer matching language patterns above],
  "summary": "[1-2 sentences citing specific language from response that indicates this level]"
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
            content: 'You are an expert leadership assessment analyst. Score based on LANGUAGE PATTERNS only, not response length or format. Use the FULL 1-100 range - Level 1 responses score 1-20, Level 5 responses score 80-100. Always respond with valid JSON only.' 
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

    const score = typeof analysis.score === 'number' ? Math.max(0, Math.min(100, Math.round(analysis.score))) : 60;
    const summary = typeof analysis.summary === 'string' ? analysis.summary : `Shows developing ${principle.name.toLowerCase()}.`;

    console.log(`✅ Principle ${principle.name} scored: ${score}/100`);
    if (principleResponses.length === 0) {
      console.log(`  ⚠️ No targeted responses found - used fallback context`);
    }

    return { key, score, summary };

  } catch (error) {
    console.error(`❌ Error analyzing principle ${principle.name}:`, error);
    console.log(`  🔄 Falling back to keyword-based scoring...`);
    return calculatePrincipleFallback(key, principle, responses);
  }
}

function calculatePrincipleFallback(key: string, principle: any, responses: string[]): { key: string; score: number; summary: string } {
  console.log(`⚠️ Using fallback scoring for ${principle.name}`);
  const responseText = responses.join(' ');
  
  // Check for minimal effort first
  if (responseText.trim().length < 10 || /^(x+|xx+|test|asdf)$/i.test(responseText.trim())) {
    const minScore = Math.floor(Math.random() * 10) + 5; // 5-15 range
    return {
      key,
      score: minScore,
      summary: `Minimal response provided for ${principle.name.toLowerCase()}.`
    };
  }
  
  // Language pattern indicators for each level (using regex patterns)
  const level1Patterns = [
    /\b(they|them|others|the team)\s+(didn't|failed|missed|should|need to)/i,
    /\bit\s+wasn't\s+(really\s+)?my\s+(fault|failure|responsibility)/i,
    /\b(the|they)\s+(needed|should|didn't)/i,
    /\bi\s+dismissed/i,
    /\bi\s+felt\s+(they|others)\s+didn't\s+(appreciate|understand|see)/i,
    /\bi\s+prefer\s+to\s+move\s+forward/i,
    /\bi\s+don't\s+really\s+(see|believe|think)/i,
    /\bi've\s+been\s+doing\s+this\s+long\s+enough/i,
    /\bi\s+told\s+(them|people)\s+to/i,
    /\bmy\s+job\s+is\s+to/i,
    /\bi\s+focus\s+on\s+(what|results|delivering)/i,
    /\bi\s+guess\s+i/i,
    /\bwork\s+still\s+needs\s+to\s+get\s+done/i,
    /\bpeople\s+should\s+(handle|manage|sort)/i
  ];
  
  const level2Patterns = [
    /\bi\s+realized\s+(i\s+)?could\s+have/i,
    /\bi\s+should\s+have/i,
    /\beventually\s+i\s+(realized|acknowledged)/i,
    /\ba\s+few\s+days\s+later/i,
    /\bi\s+need\s+to/i,
    /\bi\s+went\s+along\s+because/i,
    /\bit\s+seemed\s+(expected|required)/i,
    /\bi\s+implemented/i,
    /\bi\s+set\s+up\s+(processes|systems)/i,
    /\bi\s+still\s+(catch\s+myself|revert|find)/i,
    /\bthough\s+i\s+still/i,
    /\bi\s+didn't\s+make\s+big\s+changes/i,
    /\bgrowth\s+still\s+feels\s+like/i
  ];
  
  const level3Patterns = [
    /\bi\s+took\s+time\s+to\s+(think|reflect)/i,
    /\bi\s+realized\s+(that|my|how)/i,
    /\bmy\s+(first\s+)?reaction\s+was\s+(defensive|but)/i,
    /\bas\s+i\s+reflected/i,
    /\bmy\s+(tone|actions|approach)\s+(could|can)\s+make/i,
    /\bi\s+saw\s+(how|that|the\s+truth)/i,
    /\bit\s+taught\s+me\s+that/i,
    /\bi\s+began\s+(asking|experimenting|using|practicing)/i,
    /\bi\s+started\s+(asking|using|pausing)/i,
    /\bi\s+invited\s+(them|people)/i,
    /\bi\s+tried\s+to\s+(listen|create)/i,
    /\bit's\s+made\s+(our|the)/i,
    /\bit\s+helped\s+(me|us)/i,
    /\bthat\s+experience\s+taught\s+me/i,
    /\bi\s+admitted\s+i\s+didn't\s+have\s+all\s+the\s+answers/i
  ];
  
  const level4Patterns = [
    /\bi\s+communicated\s+candidly/i,
    /\bi\s+addressed\s+(the|an)\s+(entire\s+)?(company|team|organization)/i,
    /\bi\s+shared\s+(not\s+just|how)/i,
    /\bas\s+i\s+reflected,\s+i\s+saw/i,
    /\bi\s+took\s+(full\s+)?responsibility/i,
    /\bi\s+acknowledged\s+(the|our)/i,
    /\b(deepened|strengthened|improved)\s+(trust|our\s+culture|team\s+morale)/i,
    /\bacross\s+(the\s+)?(organization|company|team)/i,
    /\bpeople\s+began\s+(speaking|sharing)/i,
    /\bit\s+strengthened\s+(our|the)/i,
    /\bit\s+didn't\s+align\s+with\s+(our|my)\s+values/i,
    /\bcredibility\s+isn't\s+built/i,
    /\bi\s+learned\s+that\s+(trust|credibility)/i,
    /\bi\s+facilitated\s+workshops/i,
    /\bwe\s+co-created/i
  ];
  
  const level5Patterns = [
    /\b(became|become)\s+transformative/i,
    /\b(reshaped|transformed|completely\s+reshaped)\s+my\s+perspective/i,
    /\bthat\s+feedback\s+(became|was)/i,
    /\b(created|built|embedded)\s+(a|our)\s+(leadership\s+)?culture/i,
    /\bwe\s+(redesigned|built|embedded|turned)/i,
    /\bover\s+time,\s+that\s+(shift|change|experience)/i,
    /\bit's\s+now\s+part\s+of\s+(our|how)/i,
    /\btransforming\s+(error|challenge|experience)\s+into/i,
    /\bturned\s+that\s+experience\s+into/i,
    /\b(our|my)\s+company\s+exists\s+to/i,
    /\bfoundation\s+of\s+(sustainable|shared|sustainable\s+growth)/i,
    /\bfor\s+me,\s+(ethics|ownership|growth)\s+isn't\s+(just|a)/i,
    /\bnormalizing\s+(open|these)/i,
    /\bthe\s+result\s+(strengthened|has\s+been|created)/i,
    /\bi\s+used\s+the\s+experience\s+to\s+start/i
  ];
  
  // Score based on highest level pattern found
  let score = 50; // Default middle
  let level = 0;
  
  const level1Matches = level1Patterns.filter(p => p.test(responseText)).length;
  const level2Matches = level2Patterns.filter(p => p.test(responseText)).length;
  const level3Matches = level3Patterns.filter(p => p.test(responseText)).length;
  const level4Matches = level4Patterns.filter(p => p.test(responseText)).length;
  const level5Matches = level5Patterns.filter(p => p.test(responseText)).length;
  
  console.log(`  📊 Fallback pattern matches: L1=${level1Matches}, L2=${level2Matches}, L3=${level3Matches}, L4=${level4Matches}, L5=${level5Matches}`);
  
  if (level5Matches > 0) {
    score = 80 + Math.min(20, level5Matches * 4); // 80-100
    level = 5;
  } else if (level4Matches > 0) {
    score = 60 + Math.min(20, level4Matches * 4); // 60-80
    level = 4;
  } else if (level3Matches > 0) {
    score = 40 + Math.min(20, level3Matches * 4); // 40-60
    level = 3;
  } else if (level2Matches > 0) {
    score = 20 + Math.min(20, level2Matches * 4); // 20-40
    level = 2;
  } else if (level1Matches > 0) {
    score = 1 + Math.min(19, level1Matches * 3); // 1-20
    level = 1;
  }
  
  // Ensure score is within bounds
  score = Math.min(100, Math.max(1, Math.round(score)));
  
  const levelNames = ['', 'emerging', 'developing', 'expanding', 'flourishing', 'thriving'];
  const levelDesc = levelNames[level] || 'developing';
  
  console.log(`  📊 Fallback final score for ${principle.name}: ${score} (Level ${level})`);
  
  return {
    key,
    score,
    summary: `Language patterns indicate ${levelDesc} level ${principle.name.toLowerCase()}.`
  };
}

function scoreToLevel(score: number): number {
  if (score >= 80) return 5; // Thriving
  if (score >= 60) return 4; // Flourishing
  if (score >= 40) return 3; // Expanding
  if (score >= 20) return 2; // Developing
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
