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

// Enhanced Depth System Interfaces
interface ResponseQuality {
  depth: 'surface' | 'moderate' | 'deep';
  evidence: 'none' | 'some' | 'concrete';
  specificity: 'vague' | 'general' | 'specific';
  requiresFollowup: boolean;
  followupType: 'insufficient' | 'surface' | 'contradiction' | 'clarification' | 'behavioral' | 'impact' | 'learning';
}

interface DepthAnalysis {
  averageDepth: number;
  needsMoreConcreteExamples: boolean;
  needsBehavioralDetails: boolean;
  needsImpactAnalysis: boolean;
  contradictionsDetected: string[];
  recommendedDepthLevel: 'high' | 'medium' | 'low';
}

// Enhanced Response Analysis for Adaptive System
interface ResponseAnalysis {
  depth: 'surface' | 'moderate' | 'deep';
  quality: 'poor' | 'adequate' | 'good' | 'excellent';
  communicationStyle: 'concise' | 'detailed' | 'narrative' | 'analytical';
  requiresFollowup: boolean;
  followupType: 'clarify' | 'deepen' | 'explore' | 'connect';
  patterns: string[];
  confidence: number;
}

interface UserContext {
  profile: {
    position: string;
    role: string;
    teamSize: number;
    motivation: string;
  };
  communicationStyle: 'concise' | 'detailed' | 'narrative' | 'analytical';
  leadershipPatterns: string[];
  strengths: string[];
  growthAreas: string[];
  questionPhase: 'structured' | 'adaptive';
  questionCount: number;
  confidenceLevels: Record<string, number>;
  keyThemes: string[];
}

interface LeadershipPattern {
  name: string;
  indicators: string[];
  strength: number;
  examples: string[];
  development: string[];
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

// Behavioral Interview Techniques
const BEHAVIORAL_PROBES = {
  situation: "Tell me more about the specific situation. What was happening?",
  task: "What was your role and responsibility in that situation?",
  action: "What specific actions did you take? Walk me through your decision-making process.",
  result: "What was the outcome? How did you measure success?",
  impact: "How did this affect your team/colleagues? What feedback did you receive?",
  learning: "What did you learn from this experience? How has it changed your approach?"
};

// Enhanced Follow-up Templates
const DEPTH_FOLLOWUPS = {
  insufficient: "I need a more concrete example. Can you give me a specific situation with names, timing, and measurable outcomes?",
  surface: "That sounds like a general approach. Walk me through a specific instance where this actually happened. What exactly did you do and say?",
  contradiction: "I notice this seems different from what you mentioned earlier about [previous answer]. Can you help me understand how these connect?",
  clarification: "I want to make sure I understand correctly. Can you be more specific about [specific detail]?",
  behavioral: "Let's use the STAR method here. What was the specific Situation, what Task were you responsible for, what Actions did you take, and what was the Result?",
  impact: "How did this decision/action affect others? What feedback did you receive from your team or stakeholders?",
  learning: "What did you learn from this experience? How has it changed your leadership approach since then?"
};

// Enhanced Context Analysis Functions
function buildUserContext(conversationHistory: any[], profile: any): UserContext {
  const context: UserContext = {
    profile,
    communicationStyle: 'detailed', // default
    leadershipPatterns: [],
    strengths: [],
    growthAreas: [],
    questionPhase: 'structured',
    questionCount: conversationHistory.length,
    confidenceLevels: {},
    keyThemes: []
  };

  // Determine phase (5 structured + 15 adaptive = 20 total)
  context.questionPhase = conversationHistory.length < 5 ? 'structured' : 'adaptive';

  // Analyze conversation for patterns
  const userResponses = conversationHistory
    .filter(msg => msg.type === 'user')
    .map(msg => msg.content);

  // Extract leadership patterns from responses
  context.leadershipPatterns = extractPatternsFromHistory(userResponses);

  // Identify communication style
  context.communicationStyle = analyzeConversationStyle(userResponses);

  // Extract confidence levels from structured questions
  context.confidenceLevels = extractConfidenceLevels(userResponses);

  // Identify key themes
  context.keyThemes = identifyKeyThemes(userResponses);

  return context;
}

function extractPatternsFromHistory(responses: string[]): string[] {
  const patterns: string[] = [];

  // Collaborative patterns
  if (responses.some(r => /\b(team|collaborate|together|group|shared)\b/i.test(r))) {
    patterns.push('collaborative');
  }

  // Strategic patterns
  if (responses.some(r => /\b(strategy|vision|long.term|future|plan)\b/i.test(r))) {
    patterns.push('strategic');
  }

  // Operational patterns
  if (responses.some(r => /\b(process|efficiency|operations|execution|implement)\b/i.test(r))) {
    patterns.push('operational');
  }

  // Change leadership patterns
  if (responses.some(r => /\b(change|transformation|adapt|innovation|growth)\b/i.test(r))) {
    patterns.push('change-oriented');
  }

  // Relationship patterns
  if (responses.some(r => /\b(relationship|trust|empathy|support|develop)\b/i.test(r))) {
    patterns.push('relationship-focused');
  }

  return patterns;
}

function analyzeConversationStyle(responses: string[]): 'concise' | 'detailed' | 'narrative' | 'analytical' {
  const avgLength = responses.reduce((sum, r) => sum + r.length, 0) / responses.length;

  if (avgLength < 50) return 'concise';
  if (avgLength > 200) return 'detailed';
  if (responses.some(r => /\b(story|happened|then|after|before)\b/i.test(r))) return 'narrative';
  return 'analytical';
}

function extractConfidenceLevels(responses: string[]): Record<string, number> {
  const confidenceLevels: Record<string, number> = {};

  responses.forEach((response, index) => {
    // Look for scale responses (1-10)
    const scaleMatch = response.match(/(\d+)\/10|(\d+)\s*out\s*of\s*10/i);
    if (scaleMatch) {
      const value = parseInt(scaleMatch[1] || scaleMatch[2]);
      if (value >= 1 && value <= 10) {
        // Map question indices to meaningful context keys
        switch(index) {
          case 0: // Q1 - Communication confidence (if scale)
            confidenceLevels['communication_confidence'] = value;
            break;
          case 1: // Q2 - General confidence scale
            confidenceLevels['general_confidence'] = value;
            break;
          case 2: // Q3 - Feedback comfort (if scale)
            confidenceLevels['feedback_comfort'] = value;
            break;
          case 3: // Q4 - Change leadership comfort
            confidenceLevels['change_comfort'] = value;
            break;
          case 4: // Q5 - Team development priority
            confidenceLevels['team_development_priority'] = value;
            break;
          default:
            confidenceLevels[`q${index + 1}`] = value;
        }
      }
    }
  });

  return confidenceLevels;
}

function identifyKeyThemes(responses: string[]): string[] {
  const themes: string[] = [];
  const allText = responses.join(' ').toLowerCase();

  // Extract from specific structured responses
  responses.forEach((response, index) => {
    const lowerResponse = response.toLowerCase();

    switch(index) {
      case 0: // Q1 - Leadership style
        if (lowerResponse.includes('collaborative') || lowerResponse.includes('team')) {
          themes.push('leadership_style', 'collaborative');
        } else if (lowerResponse.includes('direct') || lowerResponse.includes('results')) {
          themes.push('leadership_style', 'direct');
        } else if (lowerResponse.includes('supportive') || lowerResponse.includes('people')) {
          themes.push('leadership_style', 'supportive');
        } else if (lowerResponse.includes('visionary') || lowerResponse.includes('strategic')) {
          themes.push('leadership_style', 'visionary');
        }
        break;

      case 1: // Q2 - Communication confidence
        if (lowerResponse.includes('3') || lowerResponse.includes('low')) {
          themes.push('communication_challenge');
        }
        break;

      case 2: // Q2 - Decision-making preferences
        if (lowerResponse.includes('gather input')) {
          themes.push('collaborative_decisions');
        } else if (lowerResponse.includes('quick decisions')) {
          themes.push('decisive_actions');
        } else if (lowerResponse.includes('data and analysis')) {
          themes.push('data_driven');
        } else if (lowerResponse.includes('long-term')) {
          themes.push('strategic_focus');
        }
        break;

      case 3: // Q3 - Leadership challenge
        if (lowerResponse.includes('influence') || lowerResponse.includes('buy-in')) {
          themes.push('leadership_challenge', 'executive-influence');
        } else if (lowerResponse.includes('team performance') || lowerResponse.includes('motivation')) {
          themes.push('leadership_challenge', 'team-motivation');
        } else if (lowerResponse.includes('innovation') || lowerResponse.includes('change')) {
          themes.push('leadership_challenge', 'change-management');
        } else if (lowerResponse.includes('efficiency') || lowerResponse.includes('development')) {
          themes.push('leadership_challenge', 'operational-balance');
        }
        break;

      case 4: // Q3 - Feedback preferences (most/least)
        if (lowerResponse.includes('giving feedback')) {
          themes.push('feedback_challenge');
        } else if (lowerResponse.includes('receiving feedback')) {
          themes.push('feedback_openness');
        }
        break;
    }
  });

  // Additional themes from all responses
  if (allText.includes('influence') || allText.includes('persuade')) themes.push('executive-influence');
  if (allText.includes('team') && allText.includes('develop')) themes.push('team-development');
  if (allText.includes('change') || allText.includes('transform')) themes.push('change-management');
  if (allText.includes('strategy') || allText.includes('vision')) themes.push('strategic-thinking');
  if (allText.includes('decision') && allText.includes('tough')) themes.push('decision-making');

  return Array.from(new Set(themes)); // Remove duplicates
}

// Enhanced Response Analysis with Context Awareness
function analyzeResponseQuality(response: string, questionType: string, userContext?: UserContext): ResponseAnalysis {
  const lowerResponse = response.toLowerCase().trim();

  // Accept diverse communication styles - be less rigid
  const isValidResponse =
    lowerResponse.length >= 5 && // Minimum viable response
    !['skip', 'pass', 'no comment'].includes(lowerResponse) &&
    (!lowerResponse.includes('don\'t know') || lowerResponse.length > 50); // Allow "I don't know" if elaborated

  if (!isValidResponse) {
    return {
      depth: 'surface',
      quality: 'poor',
      communicationStyle: 'concise',
      requiresFollowup: true,
      followupType: 'clarify',
      patterns: [],
      confidence: 0.3
    };
  }

  // Analyze communication style
  const communicationStyle = userContext?.communicationStyle || detectCommunicationStyle(response);

  // More nuanced depth analysis
  const depth = calculateDepth(response, communicationStyle);

  // Extract meaningful patterns
  const patterns = extractLeadershipPatterns(response, userContext);

  return {
    depth,
    quality: depth === 'deep' ? 'excellent' : depth === 'moderate' ? 'good' : 'adequate',
    communicationStyle,
    requiresFollowup: depth === 'surface',
    followupType: depth === 'surface' ? 'deepen' : 'explore',
    patterns,
    confidence: calculateConfidence(response, patterns)
  };
}

function detectCommunicationStyle(response: string): 'concise' | 'detailed' | 'narrative' | 'analytical' {
  const lowerResponse = response.toLowerCase();

  if (response.length < 50) return 'concise';
  if (response.length > 200) return 'detailed';
  if (/\b(story|happened|then|after|before|when i)\b/i.test(lowerResponse)) return 'narrative';
  if (/\b(analysis|because|therefore|however|data|metrics)\b/i.test(lowerResponse)) return 'analytical';

  return 'detailed'; // default
}

function calculateDepth(response: string, communicationStyle: string): 'surface' | 'moderate' | 'deep' {
  let score = 0;

  // Length factor (adjusted for communication style)
  const lengthMultiplier = communicationStyle === 'concise' ? 1.5 : communicationStyle === 'detailed' ? 0.8 : 1.0;
  if (response.length > 100 * lengthMultiplier) score += 2;
  else if (response.length > 50 * lengthMultiplier) score += 1;

  // Specific details
  if (/\b(specific|particular|exact|concrete|named?)\b/i.test(response)) score += 1;
  if (/\b(january|february|march|\d{1,2}\/\d{1,2}\/\d{2,4}|last week|two months ago)\b/i.test(response)) score += 1;
  if (/\b(ceo|manager|director|team|department|client|customer)\b/i.test(response)) score += 1;

  // Action verbs
  if (/\b(called|emailed|met|decided|implemented|created|organized|facilitated)\b/i.test(response)) score += 1;

  // Numbers and metrics
  if (/\b(\d+%|\$\d+|\d+ people|\d+ months)\b/i.test(response)) score += 1;

  // Self-reflection
  if (/\b(i learned|i realized|i changed|i improved|i developed)\b/i.test(response)) score += 1;

  if (score >= 5) return 'deep';
  if (score >= 3) return 'moderate';
  return 'surface';
}

function extractLeadershipPatterns(response: string, userContext?: UserContext): string[] {
  const patterns: string[] = [];
  const lowerResponse = response.toLowerCase();

  // Collaborative patterns
  if (/\b(team|collaborate|together|group|shared|consensus)\b/i.test(lowerResponse)) {
    patterns.push('collaborative');
  }

  // Strategic patterns
  if (/\b(strategy|vision|long.term|future|plan|objective)\b/i.test(lowerResponse)) {
    patterns.push('strategic');
  }

  // Operational patterns
  if (/\b(process|efficiency|operations|execution|implement|workflow)\b/i.test(lowerResponse)) {
    patterns.push('operational');
  }

  // Change patterns
  if (/\b(change|transformation|adapt|innovation|growth|improve)\b/i.test(lowerResponse)) {
    patterns.push('change-oriented');
  }

  // Relationship patterns
  if (/\b(relationship|trust|empathy|support|develop|mentor)\b/i.test(lowerResponse)) {
    patterns.push('relationship-focused');
  }

  return patterns;
}

function calculateConfidence(response: string, patterns: string[]): number {
  let confidence = 0.5; // base confidence

  // Length indicates thoughtfulness
  if (response.length > 150) confidence += 0.2;
  else if (response.length < 30) confidence -= 0.2;

  // Specific examples increase confidence
  if (/\b(specific|particular|for example|instance)\b/i.test(response)) confidence += 0.1;

  // Multiple patterns suggest richer understanding
  confidence += patterns.length * 0.05;

  return Math.max(0.1, Math.min(1.0, confidence));
}

// Enhanced Depth Analysis Functions
function analyzeResponseQualityLegacy(response: string, questionType: string): ResponseQuality {
  const lowerResponse = response.toLowerCase().trim();
  
  // CRITICAL: Immediately catch extremely shallow responses
  const isExtremelyShallow = 
    lowerResponse.length < 20 || 
    lowerResponse === 'none' || 
    lowerResponse === 'nothing' ||
    lowerResponse === 'i just try my hardest' ||
    lowerResponse === 'i try my best' ||
    lowerResponse === 'i do my best' ||
    lowerResponse === 'i work hard' ||
    lowerResponse === 'i try hard' ||
    lowerResponse === 'i do what i can' ||
    lowerResponse === 'i try to do my best' ||
    lowerResponse === 'i try to work hard' ||
    lowerResponse === 'i try to do what i can' ||
    lowerResponse === 'i just try' ||
    lowerResponse === 'i just work hard' ||
    lowerResponse === 'not sure' ||
    lowerResponse === 'i dont know' ||
    lowerResponse === "i don't know" ||
    lowerResponse === 'maybe' ||
    lowerResponse === 'i think' ||
    lowerResponse === 'probably' ||
    lowerResponse === 'good' ||
    lowerResponse === 'bad' ||
    lowerResponse === 'yes' ||
    lowerResponse === 'no' ||
    /^i (just |simply |try to |attempt to )?(work|try|do|give)( hard| my best| what i can)?\.?$/.test(lowerResponse) ||
    /^(good|bad|okay|fine|alright)\.?$/.test(lowerResponse);

  if (isExtremelyShallow) {
    return {
      depth: 'surface',
      evidence: 'none',
      specificity: 'vague',
      requiresFollowup: true,
      followupType: 'behavioral'
    };
  }
  
  // Analyze depth indicators (more comprehensive)
  const hasSpecificTiming = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|q1|q2|q3|q4|2023|2024|2025|last week|last month|last quarter|yesterday|today|tomorrow|this morning|this afternoon|last year|two weeks ago|three months ago)\b/.test(lowerResponse);
  const hasSpecificRoles = /\b(?:ceo|cto|vp|director|manager|supervisor|team lead|senior|junior|intern|analyst|engineer|developer|designer|consultant|client|customer|stakeholder|board|executive)\b/.test(lowerResponse);
  const hasNumbers = /\b(?:[0-9]+%|[0-9]+k|[0-9]+ people|[0-9]+ team|[0-9]+ months|[0-9]+ weeks|[0-9]+ days|[0-9]+ hours|[0-9]+ minutes|budget|revenue|profit|cost|increase|decrease|growth)\b/.test(lowerResponse);
  const hasConcreteActions = /\b(?:called|emailed|met with|presented|decided|implemented|created|developed|launched|completed|finished|organized|scheduled|delegated|negotiated|facilitated|analyzed|reviewed|approved|rejected|hired|fired|promoted)\b/.test(lowerResponse);
  const hasSpecificDetails = /\b(?:project|meeting|deadline|budget|client|customer|team|department|office|remote|strategy|plan|goal|objective|kpi|metric|result|outcome|feedback|review|report|presentation|document|email|call|conference|workshop|training)\b/.test(lowerResponse);
  
  // Analyze evidence level
  let evidence: 'none' | 'some' | 'concrete' = 'none';
  if ((hasSpecificTiming && hasNumbers && hasConcreteActions) || (hasSpecificRoles && hasNumbers && hasSpecificDetails)) {
    evidence = 'concrete';
  } else if (hasSpecificTiming || hasNumbers || hasConcreteActions || hasSpecificDetails) {
    evidence = 'some';
  }
  
  // Analyze specificity
  let specificity: 'vague' | 'general' | 'specific' = 'vague';
  if ((hasSpecificTiming && hasConcreteActions) || (hasSpecificRoles && hasSpecificDetails)) {
    specificity = 'specific';
  } else if (hasConcreteActions || hasSpecificTiming || hasSpecificDetails) {
    specificity = 'general';
  }
  
  // Analyze depth (much more strict)
  let depth: 'surface' | 'moderate' | 'deep' = 'surface';
  if (evidence === 'concrete' && specificity === 'specific' && response.length > 150) {
    depth = 'deep';
  } else if ((evidence === 'some' && specificity === 'general' && response.length > 80) || 
             (evidence === 'concrete' && response.length > 60)) {
    depth = 'moderate';
  }
  
  // Determine if follow-up is needed (much more aggressive)
  const requiresFollowup = depth === 'surface' || evidence === 'none' || specificity === 'vague' || response.length < 60;
  
  // Determine follow-up type
  let followupType: ResponseQuality['followupType'] = 'behavioral';
  if (response.length < 30 || evidence === 'none') {
    followupType = 'insufficient';
  } else if (depth === 'surface') {
    followupType = 'behavioral';
  } else if (specificity === 'vague') {
    followupType = 'clarification';
  }
  
  return {
    depth,
    evidence,
    specificity,
    requiresFollowup,
    followupType
  };
}

function analyzeConversationDepth(conversationHistory: any[], userContext?: UserContext): DepthAnalysis {
  const userResponses = conversationHistory
    .filter(msg => msg.type === 'user')
    .map(msg => msg.content);

  if (userResponses.length === 0) {
    return {
      averageDepth: 0,
      needsMoreConcreteExamples: true,
      needsBehavioralDetails: true,
      needsImpactAnalysis: true,
      contradictionsDetected: [],
      recommendedDepthLevel: 'high'
    };
  }

  // Use enhanced analysis for better insights
  const analysisResults = userResponses.map(response => {
    const analysis = analyzeResponseQuality(response, 'open-ended', userContext);
    return {
      depth: analysis.depth === 'deep' ? 3 : analysis.depth === 'moderate' ? 2 : 1,
      quality: analysis.quality === 'excellent' ? 4 : analysis.quality === 'good' ? 3 : analysis.quality === 'adequate' ? 2 : 1,
      confidence: analysis.confidence
    };
  });

  // Calculate weighted averages
  const totalWeight = analysisResults.reduce((sum, result) => sum + result.confidence, 0);
  const averageDepth = analysisResults.reduce((sum, result) => sum + (result.depth * result.confidence), 0) / totalWeight;
  const averageQuality = analysisResults.reduce((sum, result) => sum + (result.quality * result.confidence), 0) / totalWeight;

  // Determine needs based on context
  const needsMoreConcreteExamples = averageDepth < 2 || userResponses.some(r => r.toLowerCase().includes('i don\'t know'));
  const needsBehavioralDetails = averageQuality < 2.5;
  const needsImpactAnalysis = !userResponses.some(r => /\b(impact|effect|result|outcome|feedback)\b/i.test(r));

  // Enhanced contradiction detection
  const contradictionsDetected = detectContradictions(userResponses, userContext);

  // Smarter depth level recommendation
  let recommendedDepthLevel: 'high' | 'medium' | 'low' = 'low';
  if (userContext?.questionPhase === 'structured') {
    recommendedDepthLevel = 'low'; // Keep it structured for first 5
  } else if (averageDepth < 2 || contradictionsDetected.length > 0) {
    recommendedDepthLevel = 'high';
  } else if (averageDepth < 2.5 || needsImpactAnalysis) {
    recommendedDepthLevel = 'medium';
  }

  return {
    averageDepth,
    needsMoreConcreteExamples,
    needsBehavioralDetails,
    needsImpactAnalysis,
    contradictionsDetected,
    recommendedDepthLevel
  };
}

function detectContradictions(responses: string[], userContext?: UserContext): string[] {
  const contradictions: string[] = [];
  const allText = responses.join(' ').toLowerCase();

  // Leadership style contradictions
  if (allText.includes('collaborative') && allText.includes('authoritative')) {
    contradictions.push('Leadership style: collaborative vs authoritative approaches');
  }

  // Decision-making contradictions
  if (allText.includes('quick decision') && allText.includes('thorough analysis')) {
    contradictions.push('Decision-making: quick vs thorough approaches');
  }

  // Communication contradictions
  if (allText.includes('direct communication') && allText.includes('diplomatic approach')) {
    contradictions.push('Communication: direct vs diplomatic styles');
  }

  // Risk contradictions
  if (allText.includes('risk taker') && allText.includes('risk averse')) {
    contradictions.push('Risk approach: taker vs averse');
  }

  return contradictions;
}

function generateDepthGuidance(depthAnalysis: DepthAnalysis, questionCount: number): string {
  let guidance = "";
  
  if (depthAnalysis.recommendedDepthLevel === 'high') {
    guidance += "🚨 CRITICAL: Previous responses are extremely shallow (like 'none', 'i just try my hardest'). \n";
    guidance += "YOU MUST generate behavioral interview questions that force specific examples:\n";
    guidance += "- MANDATORY: Use phrases like 'Tell me about a specific time when...'\n";
    guidance += "- MANDATORY: Ask for STAR method details (Situation, Task, Action, Result)\n";
    guidance += "- MANDATORY: Require names, dates, timelines, and measurable outcomes\n";
    guidance += "- FORBIDDEN: Generic questions about 'strategies' or 'approaches'\n";
    guidance += "- FORBIDDEN: Questions that can be answered with platitudes\n";
  } else if (depthAnalysis.recommendedDepthLevel === 'medium') {
    guidance += "⚠️ MODERATE: Some depth present but needs improvement. Focus on:\n";
    guidance += "- More concrete examples and specific situations\n";
    guidance += "- Behavioral details and decision-making processes\n";
    guidance += "- Ask 'walk me through...' or 'tell me about a time when...' questions\n";
  } else {
    guidance += "✅ GOOD: Responses show good depth. Can explore:\n";
    guidance += "- Advanced leadership concepts and complex scenarios\n";
    guidance += "- Self-awareness and growth areas\n";
  }
  
  if (depthAnalysis.contradictionsDetected.length > 0) {
    guidance += `\n🔍 CONTRADICTIONS DETECTED: ${depthAnalysis.contradictionsDetected.join(', ')}\n`;
    guidance += "- Address these inconsistencies directly in your question\n";
  }
  
  if (depthAnalysis.needsMoreConcreteExamples) {
    guidance += "- 🎯 REQUIRED: Ask for specific examples with names, timing, and outcomes\n";
  }
  
  if (depthAnalysis.needsBehavioralDetails) {
    guidance += "- 📋 REQUIRED: Use behavioral interview techniques (STAR method)\n";
    guidance += "- Example: 'Tell me about a specific time when you had to...\n";
  }
  
  if (depthAnalysis.needsImpactAnalysis) {
    guidance += "- 📊 REQUIRED: Explore impact on others and feedback received\n";
  }
  
  return guidance;
}

// Enhanced follow-up check with context awareness
function checkForFollowUpNeededEnhanced(conversationHistory: any[], profile: any, userContext: UserContext): QuestionResponse | null {
  if (conversationHistory.length < 2) {
    return null; // Need at least one question and one response
  }

  // Get the most recent user response
  const lastUserMessage = conversationHistory
    .filter(msg => msg.type === 'user')
    .slice(-1)[0];

  if (!lastUserMessage) {
    return null;
  }

  // Get the most recent bot question to understand the context
  const lastBotMessage = conversationHistory
    .filter(msg => msg.type === 'bot')
    .slice(-1)[0];

  if (!lastBotMessage) {
    return null;
  }

  // Use enhanced analysis with user context
  const responseAnalysis = analyzeResponseQuality(lastUserMessage.content, 'open-ended', userContext);

  // Generate intelligent follow-up if needed
  if (responseAnalysis.requiresFollowup) {
    console.log('Response requires follow-up:', {
      depth: responseAnalysis.depth,
      quality: responseAnalysis.quality,
      followupType: responseAnalysis.followupType
    });

    return generateIntelligentFollowup(lastBotMessage.content, lastUserMessage.content, responseAnalysis, userContext, conversationHistory.length);
  }

  return null;
}

// Legacy function for backward compatibility
function checkForFollowUpNeeded(conversationHistory: any[], profile: any): QuestionResponse | null {
  const userContext = buildUserContext(conversationHistory, profile);
  return checkForFollowUpNeededEnhanced(conversationHistory, profile, userContext);
}

// Generate intelligent follow-up based on user context and communication style
function generateIntelligentFollowup(
  originalQuestion: string,
  response: string,
  responseAnalysis: ResponseAnalysis,
  userContext: UserContext,
  questionNumber: number
): QuestionResponse | null {

  if (!responseAnalysis.requiresFollowup) {
    return null;
  }

  console.log('Generating intelligent follow-up for:', {
    communicationStyle: responseAnalysis.communicationStyle,
    followupType: responseAnalysis.followupType,
    patterns: responseAnalysis.patterns,
    questionNumber
  });

  // Generate follow-up that both clarifies AND asks a new question
  const followupQuestion = generateDualPurposeFollowup(
    originalQuestion,
    response,
    responseAnalysis,
    userContext,
    questionNumber
  );

  return followupQuestion;
}

function generateDualPurposeFollowup(
  originalQuestion: string,
  response: string,
  responseAnalysis: ResponseAnalysis,
  userContext: UserContext,
  questionNumber: number
): QuestionResponse {

  const topic = extractTopicFromQuestion(originalQuestion);
  const baseClarification = getClarificationForStyle(responseAnalysis, userContext.communicationStyle);

  // Add a new question that gathers additional data
  const additionalQuestion = generateAdditionalDataQuestion(topic, userContext, questionNumber);

  const combinedQuestion = `${baseClarification} And ${additionalQuestion}`;

  return {
    question: combinedQuestion,
    type: 'open-ended' as const,
    reasoning: `Dual-purpose follow-up: clarifies response AND gathers additional data on ${topic}`
  };
}

function getClarificationForStyle(responseAnalysis: ResponseAnalysis, communicationStyle: string): string {
  const clarifications = {
    concise: "I'd like to understand better - can you share a bit more detail?",
    detailed: "I want to make sure I understand your perspective correctly. Could you elaborate on that aspect?",
    narrative: "That sounds like an interesting situation. Could you tell me what happened next or what that experience was like?",
    analytical: "That's a thoughtful point. What factors led you to that conclusion, or what data influenced your thinking?"
  };

  return clarifications[communicationStyle] || clarifications.detailed;
}

function generateAdditionalDataQuestion(topic: string, userContext: UserContext, questionNumber: number): string {
  const additionalQuestions = {
    communication: [
      "how do you typically prepare for important conversations with your team?",
      "what's one communication skill you'd like to develop further?",
      "how has your communication approach changed over time in your role?"
    ],
    feedback: [
      "what's your biggest challenge when giving feedback to team members?",
      "how do you typically receive feedback from others?",
      "what's one feedback experience that significantly impacted your leadership?"
    ],
    team: [
      "how do you balance individual development with team performance?",
      "what's your approach to building trust within your team?",
      "how do you handle team conflicts or disagreements?"
    ],
    leadership: [
      "what's one leadership decision you're particularly proud of?",
      "how do you balance short-term results with long-term development?",
      "what's your biggest learning from a leadership challenge?"
    ]
  };

  const questions = additionalQuestions[topic] || additionalQuestions.leadership;
  const questionIndex = (questionNumber + userContext.leadershipPatterns.length) % questions.length;

  return questions[questionIndex];
}

function generateClarificationQuestion(
  originalQuestion: string,
  response: string,
  userContext: UserContext
): QuestionResponse {
  const prompts = {
    concise: "I'd like to understand better. Can you give me a bit more context?",
    detailed: "I want to make sure I understand your perspective correctly. Could you elaborate on that point?",
    narrative: "Your story touched on something important. Could you tell me more about what happened next?",
    analytical: "That's an interesting perspective. What data or reasoning led you to that conclusion?"
  };

  const prompt = prompts[userContext.communicationStyle] || prompts.detailed;

  return {
    question: `${prompt} I'm particularly interested in understanding more about ${extractTopicFromQuestion(originalQuestion)}.`,
    type: 'open-ended',
    reasoning: `Clarification follow-up adapted to ${userContext.communicationStyle} communication style`
  };
}

function generateDeepeningQuestion(
  originalQuestion: string,
  response: string,
  userContext: UserContext
): QuestionResponse {
  const topic = extractTopicFromQuestion(originalQuestion);

  const deepeningPrompts = {
    concise: `Can you walk me through a specific example?`,
    detailed: `I'd love to hear more about this. Can you share a concrete situation where this happened?`,
    narrative: `That sounds like an interesting story. Can you tell me what specifically happened in that situation?`,
    analytical: `What specific factors or data influenced your approach here?`
  };

  const prompt = deepeningPrompts[userContext.communicationStyle] || deepeningPrompts.detailed;

  return {
    question: `${prompt} I'm curious about your experience with ${topic.toLowerCase()}.`,
    type: 'open-ended',
    reasoning: `Deepening question for ${userContext.communicationStyle} style, exploring ${topic}`
  };
}

function generateExplorationQuestion(
  originalQuestion: string,
  response: string,
  userContext: UserContext
): QuestionResponse {
  // Use patterns from context to guide exploration
  const patterns = userContext.leadershipPatterns;
  let explorationFocus = '';

  if (patterns.includes('collaborative')) {
    explorationFocus = 'how you involved others in the process';
  } else if (patterns.includes('strategic')) {
    explorationFocus = 'the bigger picture implications';
  } else if (patterns.includes('operational')) {
    explorationFocus = 'the practical execution details';
  } else {
    explorationFocus = 'the impact on your team or stakeholders';
  }

  const explorationPrompts = {
    concise: `How did that affect ${explorationFocus}?`,
    detailed: `I'm interested in understanding more about ${explorationFocus}. Can you share your thoughts on that aspect?`,
    narrative: `That leads me to wonder about ${explorationFocus}. What's your story there?`,
    analytical: `From an analytical perspective, what was the impact on ${explorationFocus}?`
  };

  const prompt = explorationPrompts[userContext.communicationStyle] || explorationPrompts.detailed;

  return {
    question: prompt,
    type: 'open-ended',
    reasoning: `Exploration question based on ${patterns.join(', ')} patterns, adapted for ${userContext.communicationStyle} style`
  };
}

function generateConnectionQuestion(
  originalQuestion: string,
  response: string,
  userContext: UserContext
): QuestionResponse {
  // Connect to previous themes or growth areas
  const themes = userContext.keyThemes;
  let connectionPoint = '';

  if (themes.includes('executive-influence') && userContext.growthAreas.includes('influence')) {
    connectionPoint = 'influencing senior leaders';
  } else if (themes.includes('team-development')) {
    connectionPoint = 'developing your team members';
  } else if (themes.includes('change-management')) {
    connectionPoint = 'leading through change';
  } else {
    connectionPoint = 'your overall leadership approach';
  }

  const connectionPrompts = {
    concise: `How does this connect to ${connectionPoint}?`,
    detailed: `I'm seeing some interesting connections here to ${connectionPoint}. How do you see these ideas relating to each other?`,
    narrative: `This reminds me of your experience with ${connectionPoint}. How do these two situations connect in your leadership journey?`,
    analytical: `From a broader perspective, how does this situation inform your approach to ${connectionPoint}?`
  };

  const prompt = connectionPrompts[userContext.communicationStyle] || connectionPrompts.detailed;

  return {
    question: prompt,
    type: 'open-ended',
    reasoning: `Connection question linking to ${connectionPoint}, adapted for ${userContext.communicationStyle} communication style`
  };
}

// Legacy function for backward compatibility
function generateBehavioralFollowUp(
  originalQuestion: string,
  shallowResponse: string,
  responseQuality: ResponseQuality,
  profile: any
): QuestionResponse {
  // Create minimal user context for legacy compatibility
  const userContext: UserContext = {
    profile,
    communicationStyle: 'detailed',
    leadershipPatterns: [],
    strengths: [],
    growthAreas: [],
    questionPhase: 'adaptive',
    questionCount: 5,
    confidenceLevels: {},
    keyThemes: []
  };

  // Convert legacy ResponseQuality to ResponseAnalysis
  const responseAnalysis: ResponseAnalysis = {
    depth: responseQuality.depth,
    quality: responseQuality.depth === 'deep' ? 'excellent' : responseQuality.depth === 'moderate' ? 'good' : 'adequate',
    communicationStyle: 'detailed',
    requiresFollowup: responseQuality.requiresFollowup,
    followupType: responseQuality.followupType === 'behavioral' ? 'deepen' : responseQuality.followupType === 'surface' ? 'clarify' : 'deepen',
    patterns: [],
    confidence: 0.5
  };

  return generateIntelligentFollowup(originalQuestion, shallowResponse, responseAnalysis, userContext) ||
         generateDeepeningQuestion(originalQuestion, shallowResponse, userContext);
}

// Extract topic from question for follow-up context
function extractTopicFromQuestion(question: string): string {
  const lowerQuestion = question.toLowerCase();
  
  // Common leadership topics
  if (lowerQuestion.includes('communication')) return 'communicate with stakeholders';
  if (lowerQuestion.includes('team')) return 'lead your team';
  if (lowerQuestion.includes('decision')) return 'make a difficult decision';
  if (lowerQuestion.includes('conflict')) return 'handle conflict';
  if (lowerQuestion.includes('feedback')) return 'give feedback';
  if (lowerQuestion.includes('change')) return 'lead through change';
  if (lowerQuestion.includes('awareness')) return 'demonstrate self-awareness';
  if (lowerQuestion.includes('stakeholder')) return 'work with stakeholders';
  if (lowerQuestion.includes('strategy')) return 'develop strategy';
  if (lowerQuestion.includes('performance')) return 'manage performance';
  
  // Default fallback
  return 'demonstrate leadership';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterApiKey) {
    console.error('OPENROUTER_API_KEY is not set');
    return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), {
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
      openRouterApiKey
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
      ? ['multiple-choice', 'scale', 'most-least-choice'] // First 5: Structured formats
      : ['open-ended']; // Questions 6-20: STRICTLY open-ended only

    const varietyGuidance = generateVarietyGuidance(questionTypeCount, allowedTypes, questionCount);
    
    // Build comprehensive user context
    const userContext = buildUserContext(conversationHistory, profile);

    // CRITICAL: Check if we need a follow-up question first
    const followUpQuestion = checkForFollowUpNeededEnhanced(conversationHistory, profile, userContext);
    if (followUpQuestion) {
      console.log('Generating intelligent follow-up question');
      return followUpQuestion;
    }

    // Analyze conversation depth and generate depth guidance
    const depthAnalysis = analyzeConversationDepth(conversationHistory, userContext);
    const depthGuidance = generateDepthGuidance(depthAnalysis, questionCount);

    // Use intelligent structured templates for first 5 questions
    if (questionCount < 5) {
      console.log(`Using intelligent structured template for question ${questionCount + 1}`);
      return generateStructuredQuestion(questionCount + 1, profile);
    }

    // Use intelligent adaptive templates for Q6-Q20
    if (questionCount >= 5 && questionCount < 20) {
      console.log(`Using adaptive template for question ${questionCount + 1}`);
      return generateAdaptiveQuestion(questionCount + 1, userContext, conversationHistory);
    }

    // Enhanced prompt with user context and hybrid approach
    const prompt = generateAdaptivePrompt(userContext, conversationHistory, depthGuidance, varietyGuidance, allowedTypes, questionTypeCount, questionCount);

    console.log('Sending prompt to OpenRouter...');
    
    // Wrap the API call with timeout
    const apiCall = fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
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
        type: "multiple-choice" as const,
        options: ["Collaborative and team-focused", "Direct and results-oriented", "Supportive and people-first", "Visionary and strategic"],
        reasoning: "Fallback question for leadership style identification"
      },
      {
        question: "What motivates you most as a leader?",
        type: "open-ended" as const,
        reasoning: "Fallback question for motivation exploration"
      },
      {
        question: "On a scale of 1-10, how confident are you in your ability to handle conflict within your team?",
        type: "scale" as const,
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

// Generate adaptive prompt based on user context and phase
function generateAdaptivePrompt(
  userContext: UserContext,
  conversationHistory: any[],
  depthGuidance: string,
  varietyGuidance: string,
  allowedTypes: string[],
  questionTypeCount: Record<string, number>,
  questionCount: number
): string {

  const formattedHistory = conversationHistory
    .map(msg => `${msg.type === 'bot' ? 'Coach' : 'User'}: ${msg.content}`)
    .join('\n');

  // Base prompt components
  let prompt = `You are an expert leadership coach conducting a personalized assessment.

USER PROFILE:
- Position: ${userContext.profile.position}
- Role: ${userContext.profile.role}
- Team Size: ${userContext.profile.teamSize}
- Motivation: ${userContext.profile.motivation}

USER CONTEXT ANALYSIS:
- Communication Style: ${userContext.communicationStyle}
- Leadership Patterns: ${userContext.leadershipPatterns.join(', ') || 'Still emerging'}
- Key Themes: ${userContext.keyThemes.join(', ') || 'Building understanding'}
- Strengths: ${userContext.strengths.join(', ') || 'Developing'}
- Growth Areas: ${userContext.growthAreas.join(', ') || 'Exploring'}

QUESTION PHASE: ${userContext.questionPhase.toUpperCase()}
QUESTION COUNT: ${questionCount + 1}/20

RECENT CONVERSATION:
${formattedHistory.slice(-1000)}

DEPTH ANALYSIS:
${depthGuidance}

QUESTION TYPE GUIDANCE:
${varietyGuidance}
- Allowed types: ${allowedTypes.join(', ')}
- Used so far: ${Object.entries(questionTypeCount).map(([type, count]) => `${type}: ${count}`).join(', ') || 'None'}
`;

  // Phase-specific instructions
  if (userContext.questionPhase === 'structured') {
    prompt += `
PHASE 1: STRUCTURED DATA COLLECTION (Questions 1-5)
🎯 OBJECTIVE: Gather baseline information through structured questions

REQUIREMENTS:
- Use multiple-choice, scale, or most-least-choice formats ONLY
- Focus on collecting foundational data about leadership style and preferences
- Keep questions clear, focused, and easy to answer
- Build context for personalized assessment in later phases
- Ask about: leadership approach, confidence levels, decision-making preferences

EXAMPLES OF GOOD QUESTIONS:
- "Which leadership style best describes how you work with your team?"
- "On a scale of 1-10, how confident do you feel in [specific area]?"
- "When making decisions, which approach is most/least like you?"
`;
  } else {
    prompt += `
PHASE 2+: DEEP LEADERSHIP COACHING (Questions 6-20)
🎯 OBJECTIVE: Explore real leadership challenges through authentic conversation

CRITICAL REQUIREMENTS:
- ONLY GENERATE OPEN-ENDED QUESTIONS - NO SCALE, MULTIPLE CHOICE, OR STRUCTURED FORMATS
- Draw inspiration from behavioral interview questions about self-awareness, trust, innovation, etc.
- Avoid logistics-focused questions - use broader leadership themes
- Make questions challenging and thought-provoking, not easy or surface level
- Reference their specific role and context briefly, but don't make it the core topic

QUESTION BANK INSPIRATION:
- Self-awareness: "Recall feedback that initially stung but proved valuable"
- Trust building: "Time when you built trust in a skeptical team"
- Innovation: "Time you drove significant change and handled resistance"
- Ethical dilemmas: "Balancing business interests with social considerations"
- Growth: "Deliberately stepping outside comfort zone to grow as leader"

CONVERSATION FLOW:
- Build on their previous answers authentically
- Ask about impact and learning from experiences
- Explore contradictions or tensions in their leadership approach
- Help them reflect on patterns in their behavior
- Challenge their assumptions gently
`;
  }

  // Common requirements for all phases
  prompt += `
QUALITY REQUIREMENTS:
- Build authentically on their previous responses
- Choose question type that maximizes insight for their context
- Avoid repetition of similar questions
- Progress naturally from their current understanding
- Generate questions that feel like a genuine coaching conversation`;

  // Dynamic response format based on allowed types
  if (allowedTypes.includes('open-ended') && allowedTypes.length === 1) {
    // Q6+ - Only open-ended
    prompt += `
RESPONSE FORMAT (OPEN-ENDED ONLY):
{
  "question": "Natural, personalized open-ended question that invites deep reflection",
  "type": "open-ended",
  "reasoning": "Why this specific question based on their context and conversation history"
}`;
  } else {
    // Q1-5 - Structured formats
    prompt += `
RESPONSE FORMAT (STRUCTURED):
{
  "question": "Clear, focused question for baseline data collection",
  "type": "${allowedTypes.join('|')}",
  "options": ["A", "B", "C", "D"] (for multiple-choice),
  "most_least_options": ["Option A", "Option B", "Option C", "Option D"] (for most-least-choice),
  "scale_info": {"min": 1, "max": 10, "min_label": "Description", "max_label": "Description"} (for scale),
  "reasoning": "Why this specific question based on their context"
}`;
  }

  return prompt;
}

// Intelligent Personalized Templates for First 5 Questions
const STRUCTURED_QUESTION_TEMPLATES = [
  {
    questionNumber: 1,
    template: "As a {position} leading a team of {teamSize} people, which of these best describes your primary leadership approach when making important decisions?",
    type: "multiple-choice" as const,
    options: [
      "I involve my team extensively and seek consensus before deciding",
      "I gather key input but ultimately make the final call myself",
      "I focus on data and analysis to guide my decisions",
      "I consider the bigger picture and long-term implications"
    ],
    context: ['position', 'teamSize'],
    reasoning: "Personalized leadership style assessment based on role and team size"
  },
  {
    questionNumber: 2,
    template: "Given that you're a {position} with {teamSize} team members and your goal is to {motivation}, how do you find managing this scope of responsibility?",
    type: "scale" as const,
    scale_info: {
      min: 1,
      max: 10,
      min_label: "Very challenging - often overwhelming",
      max_label: "Very manageable - clear and structured"
    },
    context: ['position', 'teamSize', 'motivation'],
    reasoning: "Personalized confidence assessment for their specific role and goals"
  },
  {
    questionNumber: 3,
    template: "With your team of {teamSize} people and your focus on {motivation}, which of these approaches do you find most and least effective?",
    type: "most-least-choice" as const,
    most_least_options: [
      "Regular one-on-one check-ins with team members",
      "Group meetings and team-wide discussions",
      "Data-driven performance reviews",
      "Informal feedback and casual conversations"
    ],
    context: ['teamSize', 'motivation'],
    reasoning: "Personalized preference assessment for their team size and goals"
  },
  {
    questionNumber: 4,
    template: "As a {position} managing {teamSize} people, what's your biggest challenge when trying to {motivation}?",
    type: "multiple-choice" as const,
    options: [
      "Getting buy-in from senior leadership or stakeholders",
      "Developing and growing my team's capabilities",
      "Balancing short-term results with long-term strategy",
      "Maintaining team morale and engagement",
      "Navigating organizational politics or bureaucracy"
    ],
    context: ['position', 'teamSize', 'motivation'],
    reasoning: "Personalized challenge identification for their specific context"
  },
  {
    questionNumber: 5,
    template: "Given your experience as a {position} with {teamSize} team members, how much do you prioritize each of these aspects of leadership?",
    type: "scale" as const,
    scale_info: {
      min: 1,
      max: 10,
      min_label: "Low priority",
      max_label: "Top priority"
    },
    context: ['position', 'teamSize'],
    reasoning: "Personalized priority assessment for their leadership context"
  }
];

// Question Bank Inspired Templates for Q6-Q20 - Real Leadership Questions
const ADAPTIVE_QUESTION_TEMPLATES = {
  self_leadership: [
    {
      template: "Recall a time when you received feedback that initially stung but later proved valuable. How did you process it, and what changed in your leadership as a result?",
      context: [],
      themes: ['self-awareness', 'growth', 'feedback']
    },
    {
      template: "Describe a recent situation where greater self-awareness could have changed the outcome. What would you do differently?",
      context: [],
      themes: ['self-awareness', 'reflection', 'decision-making']
    },
    {
      template: "How do you typically reflect on your emotions and decisions? Do you have a method that works for you?",
      context: [],
      themes: ['self-awareness', 'emotional-regulation', 'reflection']
    },
    {
      template: "What is one insight about yourself that you've discovered recently, and how has it influenced your actions?",
      context: [],
      themes: ['self-awareness', 'personal-growth', 'action']
    }
  ],
  relational_leadership: [
    {
      template: "Tell me about a time when you successfully built trust within a team that was initially skeptical or guarded. What specific actions did you take?",
      context: [],
      themes: ['trust', 'psychological-safety', 'relationship-building']
    },
    {
      template: "Describe a situation where you needed to adapt your leadership approach to meet the needs of a specific team member. How did you recognize their needs?",
      context: [],
      themes: ['empathy', 'awareness-of-others', 'adaptability']
    },
    {
      template: "Tell me about a time when you delegated a high-stakes project. How did you decide what to delegate and how did you support them while maintaining their autonomy?",
      context: [],
      themes: ['empowerment', 'delegation', 'shared-responsibility']
    },
    {
      template: "How have you modeled behavioral expectations that foster psychological safety and trust? Can you share a specific example?",
      context: [],
      themes: ['psychological-safety', 'modeling', 'trust']
    }
  ],
  organizational_leadership: [
    {
      template: "Describe a time when you needed to align your team around a shared purpose or vision. How did you approach this and what impact did it have?",
      context: [],
      themes: ['vision', 'purpose', 'alignment']
    },
    {
      template: "Tell me about a time when you drove significant innovation or change. How did you approach resistance and what results came from embracing this change?",
      context: [],
      themes: ['innovation', 'change-management', 'resistance']
    },
    {
      template: "Tell me about a time when you shifted from directing a team to empowering them to lead themselves. What approach did you take and what were the results?",
      context: [],
      themes: ['empowerment', 'culture-of-leadership', 'transformation']
    },
    {
      template: "Describe a time when you were completely in a flow state at work. What made that possible?",
      context: [],
      themes: ['purpose', 'flow', 'meaningful-work']
    }
  ],
  leadership_beyond_organization: [
    {
      template: "How do you or your organization leave positive impact on customers or clients. What approach do you take?",
      context: [],
      themes: ['stakeholder-impact', 'positive-impact', 'customer-focus']
    },
    {
      template: "Describe a time when you had to balance business interests with broader social or ethical considerations. How did you approach this?",
      context: [],
      themes: ['ethical-leadership', 'social-stewardship', 'balance']
    },
    {
      template: "Tell me about a time when conflict within your team led to a better outcome than would have been possible without the tension. What was your approach?",
      context: [],
      themes: ['harnessing-tensions', 'conflict', 'collaboration']
    },
    {
      template: "How do you ensure that your work remains aligned with both your personal purpose and your organization's mission?",
      context: [],
      themes: ['purpose', 'alignment', 'personal-values']
    }
  ],
  harnessing_tensions: [
    {
      template: "What are the biggest challenges you face when trying to embrace change, and how do you work through them?",
      context: [],
      themes: ['continuous-growth', 'change', 'resilience']
    },
    {
      template: "Tell me about a time when you deliberately stepped outside your comfort zone to grow as a leader. What was difficult about it?",
      context: [],
      themes: ['continuous-growth', 'comfort-zone', 'leadership-development']
    },
    {
      template: "Describe how you leverage tension or allow conflict within your team. How do you create safety for difficult conversations?",
      context: [],
      themes: ['harnessing-tensions', 'conflict-management', 'safety']
    },
    {
      template: "What's one tension or paradox you've learned to embrace as a leader - something that seemed contradictory at first but turned out to be complementary?",
      context: [],
      themes: ['paradox-navigation', 'leadership-wisdom', 'complexity']
    }
  ]
};

// Generate intelligent structured question for first 5 questions
function generateStructuredQuestion(questionNumber: number, profile: any): QuestionResponse {
  const template = STRUCTURED_QUESTION_TEMPLATES.find(t => t.questionNumber === questionNumber);

  if (!template) {
    // Fallback if template not found
    return {
      question: `Question ${questionNumber}: Tell us about your leadership experience.`,
      type: 'open-ended' as const,
      reasoning: 'Fallback structured question'
    };
  }

  // Personalize the template with profile data
  let personalizedQuestion = template.template;
  let personalizedOptions = template.options;
  let personalizedScaleInfo = template.scale_info;
  let personalizedMostLeastOptions = template.most_least_options;

  // Replace placeholders with actual profile data
  personalizedQuestion = personalizedQuestion
    .replace('{position}', profile.position || 'leader')
    .replace('{teamSize}', profile.teamSize?.toString() || 'your team')
    .replace('{motivation}', profile.motivation || 'develop as a leader');

  // For Q5 scale question, make it about leadership aspects
  if (questionNumber === 5) {
    personalizedQuestion = `As a ${profile.position || 'leader'} with ${profile.teamSize || 'a team'} of people, how much do you prioritize developing your team's skills and capabilities?`;
  }

  return {
    question: personalizedQuestion,
    type: template.type,
    options: personalizedOptions,
    scale_info: personalizedScaleInfo,
    most_least_options: personalizedMostLeastOptions,
    reasoning: template.reasoning
  };
}

// Generate intelligent adaptive question for Q6-Q20
function generateAdaptiveQuestion(
  questionNumber: number,
  userContext: UserContext,
  conversationHistory: any[]
): QuestionResponse {

  // Determine which leadership dimension to explore next
  const leadershipDimension = getLeadershipDimensionForQuestion(questionNumber);
  const templates = ADAPTIVE_QUESTION_TEMPLATES[leadershipDimension];

  // Select the most relevant template based on user context
  const selectedTemplate = selectBestTemplate(templates, userContext);

  // Personalize the template with user data
  const personalizedQuestion = personalizeTemplate(selectedTemplate.template, userContext);

  return {
    question: personalizedQuestion,
    type: 'open-ended' as const,
    reasoning: `Adaptive question for ${leadershipDimension} dimension, personalized for ${userContext.communicationStyle} communication style`
  };
}

function getLeadershipDimensionForQuestion(questionNumber: number): keyof typeof ADAPTIVE_QUESTION_TEMPLATES {
  const dimensionSequence: (keyof typeof ADAPTIVE_QUESTION_TEMPLATES)[] = [
    'self_leadership',      // Q6
    'relational_leadership', // Q7
    'organizational_leadership', // Q8
    'relational_leadership', // Q9
    'organizational_leadership', // Q10
    'organizational_leadership', // Q11
    'leadership_beyond_organization', // Q12
    'leadership_beyond_organization', // Q13
    'harnessing_tensions', // Q14
    'harnessing_tensions',  // Q15
    'self_leadership',      // Q16
    'relational_leadership', // Q17
    'organizational_leadership', // Q18
    'leadership_beyond_organization', // Q19
    'harnessing_tensions'   // Q20
  ];

  return dimensionSequence[questionNumber - 6] || 'self_leadership';
}

function selectBestTemplate(templates: any[], userContext: UserContext): any {
  // Score templates based on how well they match user context
  const scoredTemplates = templates.map(template => {
    let score = 0;

    // Check if template context requirements are met
    template.context.forEach((ctx: string) => {
      if (userContext.confidenceLevels[ctx] !== undefined) score += 2;
      if (userContext.keyThemes.includes(ctx)) score += 1;
    });

    // Prefer templates that match user's communication style
    if (template.themes.some((theme: string) => userContext.leadershipPatterns.includes(theme))) {
      score += 1;
    }

    return { template, score };
  });

  // Return highest scoring template
  scoredTemplates.sort((a, b) => b.score - a.score);
  return scoredTemplates[0].template;
}

function personalizeTemplate(template: string, userContext: UserContext): string {
  // For adaptive questions (Q6+), templates are now pure conversational questions
  // without placeholders, so we return them as-is
  return template;
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

  // Early stage questions (0-4) - simple types only with variety
  if (questionCount < 5) {
    const allowedTypes = ['multiple-choice', 'scale', 'most-least-choice'];
    const leastUsedType = allowedTypes.reduce((least, type) => 
      (questionTypeCount[type] || 0) < (questionTypeCount[least] || 0) ? type : least
    );

    if (!hasDiscussedStyle && leastUsedType === 'multiple-choice') {
      return {
        question: `As a ${profile.position} in ${profile.role} leading ${profile.teamSize} people, how would you describe your natural leadership approach?`,
        type: "multiple-choice",
        options: [
          "Collaborative - I involve my team in decisions and value input",
          "Direct - I set clear expectations and drive for results", 
          "Supportive - I focus on developing and empowering my people",
          "Strategic - I emphasize vision and long-term thinking"
        ],
        reasoning: `Contextual fallback exploring leadership style for ${profile.position} role`
      };
    } else if (leastUsedType === 'scale') {
      return {
        question: `On a scale of 1-10, how confident do you feel in your ability to ${profile.motivation.toLowerCase()} as a leader?`,
        type: "scale",
        scale_info: {
          min: 1,
          max: 10,
          min_label: "Not confident at all",
          max_label: "Extremely confident"
        },
        reasoning: `Contextual fallback assessing confidence in achieving ${profile.motivation}`
      };
    } else {
      return {
        question: "When making important leadership decisions, which approach most and least reflects your style?",
        type: "most-least-choice",
        most_least_options: [
          "Gather extensive input from team members",
          "Make quick decisions based on experience", 
          "Focus on data and analytical evidence",
          "Consider long-term strategic implications"
        ],
        reasoning: "Contextual fallback exploring decision-making preferences"
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
}