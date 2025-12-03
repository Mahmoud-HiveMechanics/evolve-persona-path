import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Analysis functions for adaptive AI questioning
function analyzeUserResponses(responses: string[], profile: any): string {
  if (!responses || responses.length === 0) {
    return `Initial assessment - no prior responses to analyze. Focus on role-specific scenarios for ${profile.position} leading ${profile.teamSize} people.`;
  }

  const totalWords = responses.join(' ').split(' ').length;
  const avgResponseLength = totalWords / responses.length;
  
  // Analyze communication style
  const communicationStyle = avgResponseLength < 15 ? 'brief' : avgResponseLength > 50 ? 'detailed' : 'moderate';
  
  // Look for patterns in responses
  const patterns: string[] = [];
  const responseText = responses.join(' ').toLowerCase();
  
  // Leadership style indicators
  if (responseText.includes('team') || responseText.includes('people') || responseText.includes('support')) {
    patterns.push('Shows team-focused leadership orientation');
  }
  if (responseText.includes('challenge') || responseText.includes('difficult') || responseText.includes('problem')) {
    patterns.push('Comfortable discussing challenges and obstacles');
  }
  if (responseText.includes('growth') || responseText.includes('learn') || responseText.includes('develop')) {
    patterns.push('Values learning and development');
  }
  if (responseText.includes('decision') || responseText.includes('choose') || responseText.includes('decide')) {
    patterns.push('Shows awareness of decision-making responsibility');
  }

  // Analyze response depth and engagement
  const engagementLevel = responses.some(r => r.length > 100) ? 'high' : 'moderate';
  
  return `Communication Style: ${communicationStyle} responses (avg ${Math.round(avgResponseLength)} words)
Engagement Level: ${engagementLevel}
Observed Patterns: ${patterns.length > 0 ? patterns.join('; ') : 'Building initial understanding'}
Adaptive Guidance: ${getAdaptiveGuidance(communicationStyle, patterns, profile)}`;
}

function getAdaptiveGuidance(style: string, patterns: string[], profile: any): string {
  const guidance: string[] = [];
  
  // Style-based guidance
  if (style === 'brief') {
    guidance.push('Use engaging scenarios to encourage more detailed responses');
  } else if (style === 'detailed') {
    guidance.push('Dive deeper into specific behaviors and patterns they\'ve revealed');
  }
  
  // Pattern-based guidance
  if (patterns.some(p => p.includes('team-focused'))) {
    guidance.push('Explore servant leadership and emotional intelligence principles');
  }
  if (patterns.some(p => p.includes('challenges'))) {
    guidance.push('Focus on resilience and adaptability scenarios');
  }
  if (patterns.some(p => p.includes('learning'))) {
    guidance.push('Probe continuous learning and growth mindset');
  }
  
  // Role-specific guidance
  if (profile.position === 'ceo' || profile.position === 'executive') {
    guidance.push('Focus on strategic vision and organizational impact');
  } else if (profile.position === 'manager' || profile.position === 'director') {
    guidance.push('Emphasize team development and operational excellence');
  } else if (profile.position === 'team lead' || profile.position === 'supervisor') {
    guidance.push('Focus on peer influence and day-to-day leadership challenges');
  }
  
  return guidance.length > 0 ? guidance.join('; ') : 'Continue building rapport and understanding';
}

function getRoleSpecificContext(profile: any): string {
  const contexts: Record<string, string> = {
    'ceo': 'Strategic decision-making, organizational vision, board relations, company culture',
    'executive': 'Cross-functional leadership, strategic initiatives, stakeholder management',
    'director': 'Department oversight, resource allocation, performance management, strategic planning',
    'manager': 'Team performance, staff development, project delivery, day-to-day operations',
    'team lead': 'Peer leadership, project coordination, skill development, team dynamics',
    'supervisor': 'Direct supervision, quality control, training, operational efficiency',
    'entrepreneur': 'Vision casting, resource constraints, rapid growth, uncertainty management'
  };

  const roleContext = contexts[profile.position?.toLowerCase()] || 'Leadership responsibilities and team coordination';
  const teamContext = getTeamSizeContext(profile.teamSize);
  
  return `${roleContext}. ${teamContext}`;
}

function getTeamSizeContext(teamSize: number): string {
  if (teamSize <= 5) {
    return 'Leading a small, close-knit team requiring direct engagement and personal attention';
  } else if (teamSize <= 15) {
    return 'Managing a mid-sized team requiring structured coordination and delegation';
  } else if (teamSize <= 50) {
    return 'Leading a large team requiring systematic processes and sub-team coordination';
  } else {
    return 'Overseeing a large organization requiring strategic leadership and multiple management layers';
  }
}
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
    principle_focus?: string;
    assessment_stage?: string;
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
  principle_focus?: string;
  assessment_stage?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  // 12 Evolve Leadership Principles Framework
  const LEADERSHIP_PRINCIPLES = {
    'self-awareness': {
      name: 'Self-Awareness',
      category: 'Self-Leadership',
      description: 'Understanding one\'s own emotions, strengths, weaknesses, and impact on others'
    },
    'self-responsibility': {
      name: 'Self-Responsibility', 
      category: 'Self-Leadership',
      description: 'Taking ownership of actions, decisions, and their consequences'
    },
    'continuous-growth': {
      name: 'Continuous Personal Growth',
      category: 'Self-Leadership', 
      description: 'Commitment to ongoing learning and self-improvement'
    },
    'trust-safety': {
      name: 'Trust & Psychological Safety',
      category: 'Relational Leadership',
      description: 'Creating environments where people feel safe to be vulnerable and take risks'
    },
    'empathy-awareness': {
      name: 'Empathy & Awareness of Others',
      category: 'Relational Leadership',
      description: 'Understanding and responding to others\' emotions and perspectives'
    },
    'empowered-responsibility': {
      name: 'Empowered & Shared Responsibility',
      category: 'Relational Leadership',
      description: 'Delegating effectively and sharing accountability'
    },
    'purpose-vision': {
      name: 'Purpose, Vision and Aligned Outcome',
      category: 'Organizational Leadership',
      description: 'Creating clear direction and aligning team efforts toward shared goals'
    },
    'culture-leadership': {
      name: 'Culture of Leadership',
      category: 'Organizational Leadership',
      description: 'Developing leadership capabilities in others'
    },
    'harnessing-tensions': {
      name: 'Harnessing Tensions for Effective Collaboration',
      category: 'Organizational Leadership',
      description: 'Managing conflicts and different perspectives constructively'
    },
    'stakeholder-impact': {
      name: 'Positive Impact on Stakeholders',
      category: 'Leadership Beyond Organization',
      description: 'Considering and balancing the needs of all stakeholders beyond immediate team'
    },
    'change-innovation': {
      name: 'Embracing Change & Driving Innovation',
      category: 'Leadership Beyond Organization',
      description: 'Leading transformational change and fostering innovation across the organization'
    },
    'ethical-stewardship': {
      name: 'Social and Ethical Stewardship',
      category: 'Leadership Beyond Organization',
      description: 'Acting with integrity and considering broader social and environmental impact'
    }
  };

  const ASSESSMENT_STAGES = {
    'baseline': 'Quantitative baseline across all 12 principles',
    'deep-dive': 'Qualitative deep dives into priority areas',
    'integration': 'Integration questions to resolve contradictions',
    'wrap-up': 'Reflective questions to prepare for evaluation'
  };

  // Track principle coverage to ensure systematic assessment
  const getPrincipleCoverage = (conversationHistory: any[]): { [key: string]: number } => {
    const coverage: { [key: string]: number } = {};
    Object.keys(LEADERSHIP_PRINCIPLES).forEach(key => coverage[key] = 0);
    
    conversationHistory.forEach(msg => {
      if (msg.type === 'bot' && msg.principle_focus) {
        coverage[msg.principle_focus] = (coverage[msg.principle_focus] || 0) + 1;
      }
    });
    
    return coverage;
  };

  const determineAssessmentStage = (questionCount: number, coverage: { [key: string]: number }): string => {
    // Check if all principles have at least 1 question (baseline complete)
    const allHaveBaseline = Object.values(coverage).every(count => count >= 1);
    
    // Check if all principles have at least 2 questions (minimum requirement met)
    const allHaveMinimum = Object.values(coverage).every(count => count >= 2);
    
    // Stage 1: Baseline (First 12 questions) - One question per principle
    if (!allHaveBaseline) return 'baseline';
    
    // Stage 2: Deep-dive (Next 12 questions) - Second question per principle  
    if (!allHaveMinimum) return 'deep-dive';
    
    // Stage 3: Wrap-up (Questions 25-26) - Preparatory reflective questions
    if (questionCount >= 24 && questionCount < 26) return 'wrap-up';
    
    // Stage 4: Integration (Questions 27+) - Third question for principles needing depth
    return 'integration';
  };

  const getNextPrincipleToAssess = (stage: string, coverage: { [key: string]: number }, conversationHistory: any[]): string | null => {
    const principleKeys = Object.keys(LEADERSHIP_PRINCIPLES);
    
    if (stage === 'baseline') {
      // Rotate through categories to ensure variety
      const categories = ['Self-Leadership', 'Relational Leadership', 'Organizational Leadership', 'Organizational Leadership'];
      
      for (const category of categories) {
        const principlesInCategory = principleKeys.filter(key => 
          LEADERSHIP_PRINCIPLES[key as keyof typeof LEADERSHIP_PRINCIPLES].category === category &&
          coverage[key] === 0
        );
        
        if (principlesInCategory.length > 0) {
          return principlesInCategory[0];
        }
      }
      
      // Fallback: Find ANY principle with no coverage
      const uncovered = principleKeys.find(key => coverage[key] === 0);
      return uncovered || null;
    }
    
    if (stage === 'deep-dive') {
      // Find principles with exactly 1 question (need second question for minimum)
      const principlesNeedingSecond = principleKeys.filter(key => coverage[key] === 1);
      
      // Rotate through categories for variety
      const categories = ['Self-Leadership', 'Relational Leadership', 'Organizational Leadership', 'Organizational Leadership'];
      
      for (const category of categories) {
        const principleInCategory = principlesNeedingSecond.find(key =>
          LEADERSHIP_PRINCIPLES[key as keyof typeof LEADERSHIP_PRINCIPLES].category === category
        );
        if (principleInCategory) return principleInCategory;
      }
      
      // Fallback: Return first principle needing second question
      return principlesNeedingSecond[0] || null;
    }
    
    // Integration stage - find principles with less than 3 questions, prioritize lowest scores
    const principlesNeedingMore = principleKeys.filter(key => coverage[key] < 3);
    
    // Sort by coverage (lowest first) for balanced assessment
    principlesNeedingMore.sort((a, b) => coverage[a] - coverage[b]);
    
    return principlesNeedingMore[0] || null;
  };

// Helper to validate JWT and get user
async function validateAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.log('No Authorization header provided');
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration');
    return null;
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  
  if (error || !user) {
    console.log('Auth validation failed:', error?.message);
    return null;
  }

  return { userId: user.id };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authentication
  const auth = await validateAuth(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized - valid authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('Authenticated user:', auth.userId);

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

    // Parse conversation history and prepare principle tracking
    const conversationHistoryWithTracking = conversationHistory.map(msg => ({
      ...msg,
      principle_focus: (msg as any).principle_focus || null,
      assessment_stage: (msg as any).assessment_stage || null
    }));

    // Calculate principle coverage and determine current stage
    const principleCoverage = getPrincipleCoverage(conversationHistoryWithTracking);
    const currentStage = determineAssessmentStage(questionCount, principleCoverage);
    const nextPrinciple = getNextPrincipleToAssess(currentStage, principleCoverage, conversationHistoryWithTracking);
    
    console.log('Assessment Status:', {
      questionCount,
      currentStage,
      nextPrinciple,
      principleCoverage
    });

    // Generate contextual question based on full conversation history
    const questionResponse = await generateContextualQuestion(
      profile,
      conversationHistoryWithTracking,
      questionCount,
      questionTypeHistory,
      openAIApiKey,
      currentStage,
      nextPrinciple,
      principleCoverage
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

// Generate contextual question based on full conversation history with systematic principle coverage
async function generateContextualQuestion(
  profile: any,
  conversationHistory: any[],
  questionCount: number,
  questionTypeHistory: string[],
  apiKey: string,
  currentStage: string,
  nextPrinciple: string | null,
  principleCoverage: { [key: string]: number }
): Promise<QuestionResponse> {
  try {
    console.log('Generating contextual question with GPT-4.1');

    // Add 35-second timeout for the entire operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Question generation timeout after 35 seconds')), 35000);
    });

    // Enhanced conversation analysis and formatting
    const formattedHistory = conversationHistory
      .map(msg => `${msg.type === 'bot' ? 'Assistant' : 'User'}: ${msg.content}`)
      .join('\n');

    // Analyze user responses for adaptive insights
    const userResponses = conversationHistory
      .filter(msg => msg.type === 'user')
      .map(msg => msg.content);

    const responseAnalysis = analyzeUserResponses(userResponses, profile);
    
    // Analyze question type variety and progression
    const questionTypeCount = questionTypeHistory.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Strict type enforcement based on question number for Q1-6
    let allowedTypes: string[];
    const nextQuestionNum = questionCount + 1;
    
    if (nextQuestionNum === 1 || nextQuestionNum === 4) {
      allowedTypes = ['most-least-choice'];
    } else if (nextQuestionNum === 2 || nextQuestionNum === 5) {
      allowedTypes = ['multiple-choice'];
    } else if (nextQuestionNum === 3 || nextQuestionNum === 6) {
      allowedTypes = ['scale'];
    } else {
      allowedTypes = ['multiple-choice', 'open-ended', 'scale', 'most-least-choice'];
    }

    const varietyGuidance = generateVarietyGuidance(questionTypeCount, allowedTypes, questionCount);

    // Enhanced EvolveAI conversational prompt with systematic principle coverage
    const prompt = `You are EvolveAI, a warm and insightful leadership coach conducting a comprehensive assessment using the 12 Evolve Leadership Principles Framework. You must ensure SYSTEMATIC coverage of all 12 principles through a structured 3-stage approach.

CURRENT ASSESSMENT STATUS:
- Question Count: ${questionCount}
- Current Stage: ${currentStage} (${ASSESSMENT_STAGES[currentStage as keyof typeof ASSESSMENT_STAGES]})
- Next Principle to Assess: ${nextPrinciple ? LEADERSHIP_PRINCIPLES[nextPrinciple as keyof typeof LEADERSHIP_PRINCIPLES].name : 'Stage complete'}

PRINCIPLE COVERAGE TRACKING:
${Object.entries(principleCoverage).map(([key, count]) => 
  `- ${LEADERSHIP_PRINCIPLES[key as keyof typeof LEADERSHIP_PRINCIPLES].name}: ${count} question(s)`
).join('\n')}

CRITICAL REQUIREMENTS - MANDATORY ENFORCEMENT:

**1. DIVERSE QUESTION FORMATS** - Mix question types throughout all stages for deeper understanding:

   **Question Type Rotation (Apply Throughout All Stages):**
   
   A. **Most-Least Comparative Questions** - Self-assessment format:
      - Format: "Please mark which statement is MOST like you and which is LEAST like you"
      - Example: "Which of these leadership approaches is MOST and LEAST like you?
        • I focus on building consensus before making decisions
        • I make quick decisions and adjust based on feedback
        • I delegate decisions to those closest to the work
        • I analyze data thoroughly before deciding"
      - Purpose: Reveals authentic leadership patterns through comparative self-assessment
   
   B. **Behavioral Questions with Emotional Depth** - Past experience exploration:
      - Format: "Recall a time when [specific situation]... How did you process it?"
      - Example: "Recall a time when you received feedback that initially stung but later proved valuable. How did you process it, and what changed in your leadership as a result?"
      - Follow-up probes: "What emotions came up for you in that moment?" "How did that make you feel?" "What did you learn about yourself?"
      - Purpose: Explores emotional intelligence and self-awareness through reflection
   
   C. **Scenario-Based Questions** - Hypothetical situations:
      - Format: "Imagine [specific leadership scenario]... How would you approach this?"
      - Example: "Imagine your team is hesitant to share ideas due to fear of criticism. How would you foster psychological safety?"
      - Purpose: Assesses principle application in realistic contexts
   
   D. **Complex Executive Scenarios** - Multi-stakeholder challenges:
      - Format: "As [their role], you're facing [complex situation with competing interests]... How would you approach this?"
      - Example: "As the ${profile.position} of your ${profile.role} organization, you're facing a conflict between two key leaders. The CPO wants to prioritize new features for market share, while the CTO insists on fixing critical technical debt. Both have valid data. Their disagreement is affecting team morale and upcoming investor discussions. How would you approach this situation?"
      - Purpose: Tests integration of multiple principles and stakeholder management

**2. QUESTION TYPE DISTRIBUTION PATTERN:**
   
   **Phase 1: Low-Friction Introduction (Questions 1-6):**
   - Q1: Most-Least Comparative (self-assessment)
   - Q2: Multiple Choice (simple selection)
   - Q3: 1-10 Scale (self-rating with descriptive labels)
   - Q4: Most-Least Comparative (self-assessment)
   - Q5: Multiple Choice (simple selection)
   - Q6: 1-10 Scale (self-rating with descriptive labels)
   Purpose: Build comfort and engagement with easy-to-answer questions
   
   **Phase 2: Increasing Complexity (Questions 7-24):**
   - Q7, 10, 13, 16, 19, 22: Scenario-Based (use type "open-ended" - hypothetical situations)
   - Q8, 11, 14, 17, 20, 23: Behavioral with Emotional Probes (use type "open-ended" - past experiences)
   - Q9, 12, 15, 18, 21, 24: Most-Least Comparative or Complex Executive Scenarios (use type "most-least-choice" or "open-ended")
   Purpose: Deep assessment with varied formats
   NOTE: "scenario-based" is NOT a valid type - always use "open-ended" for scenarios
   
   **Phase 3: Wrap-Up (Questions 25-26):**
   - Q25: "As we wrap up, what's one insight about your leadership style that has become clearer during this assessment?" (open-ended, reflective)
   - Q26: "What aspect of leadership are you most curious to learn more about from your results?" (open-ended, forward-looking)
   Purpose: Prepare user for evaluation and create smooth transition

**3. EMOTIONAL DEPTH INSTRUCTIONS:**
   - For behavioral questions, ALWAYS probe emotional responses: "What emotions came up?" "How did that feel?" "What surprised you?"
   - Explore the "why behind the what" - understand motivations, fears, values
   - Create space for vulnerability and authentic reflection

**4. FORBIDDEN QUESTION PATTERNS** - NEVER use these generic formats:
   ❌ "How do you typically..."
   ❌ "What is your approach to..."  
   ❌ "How would you ensure..."
   ❌ "What strategies do you use for..."
   ❌ Generic "tell me about your leadership style" questions
   ❌ Repetitive "Imagine..." for every single question
   ❌ REFORMULATING OR REPHRASING PREVIOUS QUESTIONS - Each question MUST be genuinely different

**5. SYSTEMATIC COVERAGE** - Each principle requires MINIMUM 2 questions using DIVERSE formats:
   - Questions 1-12: First round through all 12 principles (using mixed question types)
   - Questions 13-24: Second round through all 12 principles (MUST use COMPLETELY DIFFERENT ANGLES - not reformulations)
   - Questions 25+: Deeper integration questions for specific principles
   - IMPORTANT: Apply the question type rotation pattern (#2) to ensure variety
   
   ⚠️ CRITICAL FOR SECOND ROUND PRINCIPLE QUESTIONS (13-24):
   - DO NOT simply rephrase the first question on this principle
   - Explore a DIFFERENT scenario, context, or leadership challenge
   - Use a DIFFERENT question type than the first round
   - Example: If Q3 asked about "handling team conflict" (scenario), Q15 must ask about 
     something entirely different like "building trust with a new team" (behavioral) or 
     "rating importance of feedback mechanisms" (scale)

**6. DIMENSION ROTATION** - Rotate through all 4 leadership dimensions:
   - Self-Leadership (self-awareness, self-responsibility, continuous-growth)
   - Relational Leadership (trust-safety, empathy-awareness, empowered-responsibility)
   - Organizational Leadership (purpose-vision, culture-leadership, harnessing-tensions)
   - Leadership Beyond Organization (stakeholder-impact, change-innovation, ethical-stewardship)

${nextPrinciple ? `
FOCUS PRINCIPLE FOR THIS QUESTION: ${LEADERSHIP_PRINCIPLES[nextPrinciple as keyof typeof LEADERSHIP_PRINCIPLES].name}
Category: ${LEADERSHIP_PRINCIPLES[nextPrinciple as keyof typeof LEADERSHIP_PRINCIPLES].category}
Description: ${LEADERSHIP_PRINCIPLES[nextPrinciple as keyof typeof LEADERSHIP_PRINCIPLES].description}

Your question MUST assess this specific principle and be tagged appropriately.
` : ''}

PROFILE ANALYSIS:
- Position: ${profile.position} in ${profile.role} 
- Team Size: ${profile.teamSize} people
- Primary Motivation: ${profile.motivation}
- Role-Specific Context: ${getRoleSpecificContext(profile)}

CONVERSATION HISTORY:
${formattedHistory}

USER RESPONSE ANALYSIS:
${responseAnalysis}

QUESTION TYPE GUIDANCE:
${varietyGuidance}
- Allowed types: ${allowedTypes.join(', ')}
- Used so far: ${Object.entries(questionTypeCount).map(([type, count]) => `${type}: ${count}`).join(', ') || 'None'}

JSON FORMAT (REQUIRED - ALL FIELDS MANDATORY):
{
  "question": "Use format based on question number pattern - most-least comparative, behavioral, scenario, or complex executive",
  "type": "${allowedTypes.length === 1 ? allowedTypes[0] : 'MUST BE ONE OF: ' + allowedTypes.join('|')}",
  "options": ["Option A", "Option B", "Option C", "Option D"] (only for multiple-choice),
  "most_least_options": [
    "Complete descriptive statement (5-15 words)",
    "Complete descriptive statement (5-15 words)", 
    "Complete descriptive statement (5-15 words)",
    "Complete descriptive statement (5-15 words)"
  ] (only for most-least-choice - use for comparative self-assessment questions),
  "scale_info": {"min": 1, "max": 10, "min_label": "Low label", "max_label": "High label"} (only for scale),
  "principle_focus": "${nextPrinciple || 'REQUIRED - MUST MATCH ONE OF THE 12 PRINCIPLES'}",
  "assessment_stage": "${currentStage}",
  "reasoning": "Explain how this question assesses the target principle, which format you chose, and why it builds on conversation context"
}

ALLOWED QUESTION TYPES FOR THIS QUESTION: ${allowedTypes.join(', ')}
${allowedTypes.length === 1 ? `YOU MUST USE TYPE: "${allowedTypes[0]}" - No other type is allowed for question ${nextQuestionNum}` : ''}

**MANDATORY TYPE REQUIREMENTS (STRICTLY ENFORCED):**

CURRENT QUESTION NUMBER: ${nextQuestionNum}

${nextQuestionNum === 1 || nextQuestionNum === 4 ? `
✅ YOU MUST USE: type "most-least-choice"
✅ REQUIRED FORMAT: "Please mark which is MOST and LEAST like you..."
✅ MUST INCLUDE: 4 complete statements in "most_least_options" array
❌ FORBIDDEN: Any other type (multiple-choice, scale, open-ended)
` : ''}${nextQuestionNum === 2 || nextQuestionNum === 5 ? `
✅ YOU MUST USE: type "multiple-choice"
✅ REQUIRED FORMAT: Question with 4 distinct answer options
✅ MUST INCLUDE: 4 options in "options" array
❌ FORBIDDEN: Any other type (most-least-choice, scale, open-ended)
` : ''}${nextQuestionNum === 3 || nextQuestionNum === 6 ? `
✅ YOU MUST USE: type "scale"
✅ REQUIRED FORMAT: "On a scale of 1-10, how [assessment]..."
✅ MUST INCLUDE: "scale_info" with min: 1, max: 10, min_label, max_label
❌ FORBIDDEN: Any other type (most-least-choice, multiple-choice, open-ended)
` : ''}${nextQuestionNum >= 7 && nextQuestionNum <= 24 ? `
✅ ALLOWED TYPES: "open-ended", "most-least-choice", "multiple-choice", "scale"
✅ SCENARIO QUESTIONS (7, 10, 13, 16, 19, 22): Use "open-ended" type
✅ BEHAVIORAL QUESTIONS (8, 11, 14, 17, 20, 23): Use "open-ended" type
✅ COMPLEX/COMPARATIVE (9, 12, 15, 18, 21, 24): Use "most-least-choice" or "open-ended" type
` : ''}${nextQuestionNum === 25 || nextQuestionNum === 26 ? `
✅ YOU MUST USE: type "open-ended"
✅ Q25 FORMAT: "As we wrap up, what's one insight about your leadership style that has become clearer during this assessment?"
✅ Q26 FORMAT: "What aspect of leadership are you most curious to learn more about from your results?"
❌ FORBIDDEN: Any other type
` : ''}

**REJECTION CRITERIA - YOUR RESPONSE WILL BE REJECTED IF:**
- Question ${nextQuestionNum} does not use the required type
- Type "scenario-based" is used (NOT A VALID TYPE - use "open-ended" instead)
- most-least-choice type is used without 4 complete statements in most_least_options
- scale type is used without proper scale_info object
- multiple-choice type is used without 4 options

**CRITICAL VALIDATION RULES:**
1. "type" MUST be one of: "multiple-choice", "open-ended", "scale", "most-least-choice" (NEVER "scenario-based")
2. "type" for question ${nextQuestionNum} MUST be from allowed types: ${allowedTypes.join(', ')}
3. "principle_focus" MUST be one of these EXACT keys: self-awareness, self-responsibility, continuous-growth, trust-safety, empathy-awareness, empowered-responsibility, purpose-vision, culture-leadership, harnessing-tensions, stakeholder-impact, change-innovation, ethical-stewardship
4. "assessment_stage" MUST be one of: baseline, deep-dive, wrap-up, integration
5. For scenario questions (7, 10, 13, 16, 19, 22): Use type "open-ended" - NOT "scenario-based"
6. For behavioral questions (8, 11, 14, 17, 20, 23): Use type "open-ended" and include emotional depth probes
7. For wrap-up questions (25-26): Use type "open-ended" and focus on reflection
6. These fields are MANDATORY in every response - missing them will cause assessment failure

IMPORTANT FOR MOST-LEAST-CHOICE QUESTIONS:
- Each option in "most_least_options" must be a complete, descriptive statement (NOT single letters)
- Options should be meaningful leadership approaches, behaviors, or strategies
- Each option should be 5-15 words describing a specific approach or behavior
- Make options contextually relevant to their role and team size
- Examples: "Hold one-on-one meetings with each team member", "Send a detailed email outlining expectations", "Schedule a team workshop to align on goals"`;

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
      
      // Parse the AI response and add principle tracking data
      questionData = JSON.parse(content);
      
      // Validate required fields
      if (!questionData.question || !questionData.type || !questionData.reasoning) {
        throw new Error('Missing required fields in response');
      }
      
      // Add principle tracking metadata
      questionData.principle_focus = nextPrinciple || 'integration';
      questionData.assessment_stage = currentStage;
      
      console.log('Generated question for principle:', questionData.principle_focus, 'Stage:', questionData.assessment_stage);
      
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