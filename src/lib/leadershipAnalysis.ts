// Leadership style analysis based on first 4 MCQ answers
// Implements Option 1: AI Prompt Engineering from the assessment briefing

export interface LeadershipStyle {
  primaryStyle: string;
  secondaryStyle: string;
  focusAreas: string[];
  strengths: string[];
  potentialBlindSpots: string[];
  recommendedQuestionBias: string[];
}

export interface MCQAnswer {
  questionId: number;
  questionText: string;
  selectedOption: string;
  optionIndex: number;
}

/**
 * Analyzes the first 4 MCQ answers to determine leadership style
 * This drives the AI prompt engineering for subsequent questions
 */
export function analyzeLeadershipStyle(mcqAnswers: MCQAnswer[]): LeadershipStyle {
  if (mcqAnswers.length < 4) {
    return getDefaultLeadershipStyle();
  }

  // Extract the selected options from the first 4 questions
  const selections = mcqAnswers.slice(0, 4).map(answer => answer.selectedOption);
  
  // Analyze patterns in the selections
  const analysis = analyzeSelectionPatterns(selections);
  
  return {
    primaryStyle: analysis.primaryStyle,
    secondaryStyle: analysis.secondaryStyle,
    focusAreas: analysis.focusAreas,
    strengths: analysis.strengths,
    potentialBlindSpots: analysis.potentialBlindSpots,
    recommendedQuestionBias: analysis.recommendedQuestionBias
  };
}

/**
 * Analyzes patterns in MCQ selections to determine leadership style
 */
function analyzeSelectionPatterns(selections: string[]): LeadershipStyle {
  // Define leadership style indicators based on common patterns
  const styleIndicators = {
    'Analytical-Reflective': {
      keywords: ['analyze', 'reflect', 'consider', 'examine', 'understand', 'input', 'perspective'],
      focusAreas: ['Self-Awareness', 'Continuous Personal Growth'],
      strengths: ['Thoughtful decision-making', 'Self-reflection', 'Learning orientation'],
      blindSpots: ['Action bias', 'Quick decision-making', 'Risk-taking']
    },
    'Action-Oriented': {
      keywords: ['immediate', 'decisive', 'action', 'quick', 'direct', 'bold', 'bet'],
      focusAreas: ['Self-Responsibility', 'Change/Innovation'],
      strengths: ['Decisiveness', 'Action bias', 'Risk tolerance'],
      blindSpots: ['Over-analysis', 'Collaboration', 'Stakeholder input']
    },
    'Collaborative-Relational': {
      keywords: ['team', 'input', 'stakeholders', 'together', 'collaborate', 'involve', 'gather'],
      focusAreas: ['Trust and Psychological Safety', 'Empathy and Awareness of Others'],
      strengths: ['Team building', 'Stakeholder management', 'Inclusive decision-making'],
      blindSpots: ['Independent action', 'Speed of execution', 'Tough decisions']
    },
    'Vision-Strategic': {
      keywords: ['vision', 'mission', 'strategic', 'purpose', 'direction', 'alignment', 'future'],
      focusAreas: ['Purpose/Vision/Aligned Outcome', 'Culture of Leadership'],
      strengths: ['Strategic thinking', 'Vision communication', 'Long-term planning'],
      blindSpots: ['Operational details', 'Immediate execution', 'Tactical management']
    },
    'Empathetic-Supportive': {
      keywords: ['understand', 'support', 'help', 'care', 'empathy', 'needs', 'challenges'],
      focusAreas: ['Empathy and Awareness of Others', 'Trust and Psychological Safety'],
      strengths: ['People development', 'Emotional intelligence', 'Supportive leadership'],
      blindSpots: ['Performance management', 'Difficult conversations', 'Accountability']
    }
  };

  // Score each style based on keyword matches
  const styleScores: { [key: string]: number } = {};
  
  Object.keys(styleIndicators).forEach(style => {
    styleScores[style] = 0;
    const keywords = styleIndicators[style as keyof typeof styleIndicators].keywords;
    
    selections.forEach(selection => {
      const lowerSelection = selection.toLowerCase();
      keywords.forEach(keyword => {
        if (lowerSelection.includes(keyword)) {
          styleScores[style]++;
        }
      });
    });
  });

  // Find primary and secondary styles
  const sortedStyles = Object.entries(styleScores)
    .sort(([,a], [,b]) => b - a)
    .map(([style]) => style);

  const primaryStyle = sortedStyles[0] || 'Analytical-Reflective';
  const secondaryStyle = sortedStyles[1] || 'Action-Oriented';

  // Get the style details
  const primaryDetails = styleIndicators[primaryStyle as keyof typeof styleIndicators];
  const secondaryDetails = styleIndicators[secondaryStyle as keyof typeof styleIndicators];

  // Combine focus areas, strengths, and blind spots
  const focusAreas = [...new Set([...primaryDetails.focusAreas, ...secondaryDetails.focusAreas])];
  const strengths = [...new Set([...primaryDetails.strengths, ...secondaryDetails.strengths])];
  const potentialBlindSpots = [...new Set([...primaryDetails.blindSpots, ...secondaryDetails.blindSpots])];

  // Generate recommended question bias based on blind spots and gaps
  const recommendedQuestionBias = generateQuestionBias(primaryStyle, secondaryStyle, potentialBlindSpots);

  return {
    primaryStyle,
    secondaryStyle,
    focusAreas,
    strengths,
    potentialBlindSpots,
    recommendedQuestionBias
  };
}

/**
 * Generates question bias recommendations based on leadership style analysis
 */
function generateQuestionBias(primaryStyle: string, _secondaryStyle: string, blindSpots: string[]): string[] {
  const biasRecommendations: string[] = [];

  // Add bias based on blind spots
  if (blindSpots.includes('Action bias')) {
    biasRecommendations.push('Focus on decision-making speed and risk-taking scenarios');
  }
  if (blindSpots.includes('Over-analysis')) {
    biasRecommendations.push('Explore quick decision-making and time pressure situations');
  }
  if (blindSpots.includes('Collaboration')) {
    biasRecommendations.push('Probe independent leadership and solo decision-making');
  }
  if (blindSpots.includes('Performance management')) {
    biasRecommendations.push('Focus on difficult conversations and accountability');
  }
  if (blindSpots.includes('Operational details')) {
    biasRecommendations.push('Explore tactical execution and day-to-day management');
  }

  // Add style-specific biases
  if (primaryStyle === 'Analytical-Reflective') {
    biasRecommendations.push('Challenge with action-oriented scenarios and time pressure');
  }
  if (primaryStyle === 'Action-Oriented') {
    biasRecommendations.push('Explore reflective practices and collaborative decision-making');
  }
  if (primaryStyle === 'Collaborative-Relational') {
    biasRecommendations.push('Probe independent leadership and tough decision-making');
  }
  if (primaryStyle === 'Vision-Strategic') {
    biasRecommendations.push('Focus on operational execution and tactical management');
  }
  if (primaryStyle === 'Empathetic-Supportive') {
    biasRecommendations.push('Explore performance management and difficult conversations');
  }

  return biasRecommendations;
}

/**
 * Returns a default leadership style when insufficient data is available
 */
function getDefaultLeadershipStyle(): LeadershipStyle {
  return {
    primaryStyle: 'Analytical-Reflective',
    secondaryStyle: 'Action-Oriented',
    focusAreas: ['Self-Awareness', 'Self-Responsibility'],
    strengths: ['Thoughtful approach', 'Balanced perspective'],
    potentialBlindSpots: ['Action bias', 'Risk-taking'],
    recommendedQuestionBias: ['Focus on decision-making scenarios', 'Explore leadership challenges']
  };
}

/**
 * Extracts MCQ answers from conversation messages
 */
export function extractMCQAnswers(messages: any[]): MCQAnswer[] {
  const mcqAnswers: MCQAnswer[] = [];
  
  // Filter for user messages that are responses to MCQ questions
  const userMessages = messages.filter(msg => msg.type === 'user');
  
  // Look for patterns that indicate MCQ responses
  userMessages.forEach((message, index) => {
    // Check if this looks like an MCQ answer (typically shorter, more structured)
    if (message.content && message.content.length < 200) {
      // Try to match against framework questions
      const frameworkQuestion = ASSESSMENT_FRAMEWORK[index];
      if (frameworkQuestion && frameworkQuestion.type === 'multiple-choice') {
        mcqAnswers.push({
          questionId: frameworkQuestion.id,
          questionText: frameworkQuestion.text,
          selectedOption: message.content,
          optionIndex: -1 // We'll need to match this against options
        });
      }
    }
  });
  
  return mcqAnswers;
}

// Import the framework for reference
import { ASSESSMENT_FRAMEWORK } from '@/config/assessmentFramework';
