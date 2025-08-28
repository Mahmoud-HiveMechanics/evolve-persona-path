
import type { EvaluationData, FrameworkScore } from '@/types/shared';

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
    self_awareness: ['aware', 'reflect', 'understand', 'recognize', 'know myself'],
    emotional_intelligence: ['emotion', 'empathy', 'feeling', 'understand people', 'social'],
    communication: ['communicate', 'listen', 'speak', 'explain', 'feedback', 'clear'],
    decision_making: ['decide', 'choice', 'evaluate', 'analyze', 'judgment', 'rational'],
    team_building: ['team', 'collaborate', 'together', 'group', 'unity', 'cooperation'],
    conflict_resolution: ['conflict', 'resolve', 'disagreement', 'mediate', 'solution'],
    adaptability: ['adapt', 'change', 'flexible', 'adjust', 'evolve', 'pivot'],
    strategic_thinking: ['strategy', 'plan', 'vision', 'future', 'long-term', 'goal'],
    coaching_development: ['coach', 'develop', 'mentor', 'grow', 'teach', 'guide'],
    accountability: ['accountable', 'responsible', 'ownership', 'deliver', 'commit'],
    innovation: ['innovate', 'creative', 'new', 'improve', 'change', 'idea'],
    resilience: ['resilient', 'overcome', 'persevere', 'bounce back', 'tough', 'handle']
  };
  return keywordMap[key] || [];
};

const generateFrameworkSummary = (label: string, score: number): string => {
  if (score >= 80) return `You show strong ${label.toLowerCase()} skills with consistent application.`;
  if (score >= 60) return `You demonstrate good ${label.toLowerCase()} with room for growth.`;
  return `${label} is an area where you can develop further with focused effort.`;
};

const getPersonaForScore = (avgScore: number): string => {
  if (avgScore >= 85) return LEADERSHIP_PERSONAS[0]; // Visionary
  if (avgScore >= 75) return LEADERSHIP_PERSONAS[1]; // Collaborative  
  if (avgScore >= 65) return LEADERSHIP_PERSONAS[2]; // Strategic
  if (avgScore >= 55) return LEADERSHIP_PERSONAS[3]; // Empowering
  if (avgScore >= 45) return LEADERSHIP_PERSONAS[4]; // Adaptive
  return LEADERSHIP_PERSONAS[5]; // Results-Driven
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
