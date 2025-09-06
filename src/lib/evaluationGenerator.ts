
import type { EvaluationData, FrameworkScore } from '@/types/shared';

const LEADERSHIP_FRAMEWORKS = [
  // Self-Leadership (3 frameworks)
  { key: 'self_responsibility', label: 'Self Responsibility' },
  { key: 'trust_safety', label: 'Trust & Safety' },
  { key: 'empathy', label: 'Empathy' },
  
  // Relational Leadership (3 frameworks)
  { key: 'communication', label: 'Communication' },
  { key: 'team_building', label: 'Team Building' },
  { key: 'conflict_resolution', label: 'Conflict Resolution' },
  
  // Organizational Leadership (3 frameworks)
  { key: 'strategic_thinking', label: 'Strategic Thinking' },
  { key: 'change_management', label: 'Change Management' },
  { key: 'performance_management', label: 'Performance Management' },
  
  // Leadership Beyond Organization (3 frameworks)
  { key: 'innovation', label: 'Innovation' },
  { key: 'mentoring', label: 'Mentoring' },
  { key: 'vision', label: 'Vision' }
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

export const generateEvaluationFromResponses = (responses: string[]): EvaluationData => {
  console.log('Generating evaluation from responses:', responses);
  
  if (responses.length === 0) {
    console.log('No responses found, returning default evaluation');
    return getDefaultEvaluation();
  }

  // Analyze responses for leadership indicators
  const responseText = responses.join(' ').toLowerCase();
  
  // Score each framework based on response content
  const frameworks: FrameworkScore[] = LEADERSHIP_FRAMEWORKS.map(framework => {
    let score = 50; // Base score
    
    // Look for keywords and patterns in responses
    const keywords = getKeywordsForFramework(framework.key);
    const mentions = keywords.filter(keyword => responseText.includes(keyword.toLowerCase()));
    
    // Adjust score based on keyword matches and response quality
    score += mentions.length * 5;
    
    // Bonus for longer, more thoughtful responses
    const avgResponseLength = responses.reduce((sum, r) => sum + r.length, 0) / responses.length;
    if (avgResponseLength > 50) score += 10;
    if (avgResponseLength > 100) score += 5;
    
    // Ensure score is within bounds
    score = Math.min(95, Math.max(35, score));
    
    return {
      key: framework.key,
      label: framework.label,
      score,
      summary: generateFrameworkSummary(framework.label, score)
    };
  });

  // Calculate overall persona
  const avgScore = frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length;
  const persona = getPersonaForScore(avgScore);
  
  return {
    frameworks,
    overall: {
      persona,
      summary: `Based on your assessment responses, you demonstrate ${getScoreDescription(avgScore)} leadership capabilities. Your responses show particular strength in areas like ${getTopFrameworks(frameworks).join(', ').toLowerCase()}.`
    }
  };
};

const getKeywordsForFramework = (key: string): string[] => {
  const keywordMap: Record<string, string[]> = {
    self_responsibility: ['responsibility', 'accountable', 'ownership', 'self-aware', 'growth', 'personal'],
    trust_safety: ['trust', 'safety', 'secure', 'psychological', 'safe', 'reliable'],
    empathy: ['empathy', 'understand', 'feeling', 'perspective', 'compassion', 'connect'],
    communication: ['communicate', 'speak', 'listen', 'message', 'feedback', 'clear'],
    team_building: ['team', 'group', 'collaborate', 'together', 'unity', 'culture'],
    conflict_resolution: ['conflict', 'resolve', 'mediate', 'problem', 'solution', 'disagree'],
    strategic_thinking: ['strategy', 'plan', 'future', 'goal', 'systems', 'analyze'],
    change_management: ['change', 'transition', 'adapt', 'implement', 'resistance', 'transform'],
    performance_management: ['performance', 'manage', 'improve', 'feedback', 'develop', 'results'],
    innovation: ['innovate', 'creative', 'new', 'improve', 'ideas', 'breakthrough'],
    mentoring: ['mentor', 'teach', 'guide', 'develop', 'coach', 'knowledge'],
    vision: ['vision', 'future', 'direction', 'purpose', 'inspire', 'goals']
  };
  return keywordMap[key] || [];
};

const generateFrameworkSummary = (label: string, score: number): string => {
  if (score >= 80) return `You show strong ${label.toLowerCase()} skills with consistent application.`;
  if (score >= 60) return `You demonstrate good ${label.toLowerCase()} with room for growth.`;
  return `${label} is an area where you can develop further with focused effort.`;
};

const getPersonaForScore = (avgScore: number): string => {
  if (avgScore >= 85) return LEADERSHIP_PERSONAS[0]; // Self-Aware Leader
  if (avgScore >= 75) return LEADERSHIP_PERSONAS[1]; // Relational Connector
  if (avgScore >= 65) return LEADERSHIP_PERSONAS[2]; // Strategic Organizer
  if (avgScore >= 55) return LEADERSHIP_PERSONAS[3]; // Visionary Innovator
  if (avgScore >= 45) return LEADERSHIP_PERSONAS[4]; // Balanced Leader
  if (avgScore >= 35) return LEADERSHIP_PERSONAS[5]; // Emerging Leader
  if (avgScore >= 25) return LEADERSHIP_PERSONAS[6]; // Adaptive Leader
  return LEADERSHIP_PERSONAS[7]; // Transformational Leader
};

const getScoreDescription = (score: number): string => {
  if (score >= 80) return 'excellent';
  if (score >= 70) return 'strong';
  if (score >= 60) return 'good';
  if (score >= 50) return 'developing';
  return 'emerging';
};

const getTopFrameworks = (frameworks: FrameworkScore[]): string[] => {
  return frameworks
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(f => f.label);
};

const getDefaultEvaluation = (): EvaluationData => {
  const frameworks: FrameworkScore[] = LEADERSHIP_FRAMEWORKS.map(framework => ({
    key: framework.key,
    label: framework.label,
    score: Math.floor(Math.random() * 30) + 50, // Random score between 50-80
    summary: `Your ${framework.label.toLowerCase()} shows potential for growth.`
  }));

  return {
    frameworks,
    overall: {
      persona: LEADERSHIP_PERSONAS[2], // Strategic Leader
      summary: 'Your leadership assessment is complete. Continue developing your skills through practice and feedback.'
    }
  };
};
