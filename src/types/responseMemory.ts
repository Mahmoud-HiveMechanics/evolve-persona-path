export interface ResponseMemory {
  id: string;
  conversationId: string;
  messageId: string;
  userId: string;
  principle: string;
  responseText: string;
  sentiment: {
    confidence: number; // 0-1 scale
    uncertainty: number; // 0-1 scale
    passion: number; // 0-1 scale
    resistance: number; // 0-1 scale
  };
  qualityMetrics: {
    depth: number; // 1-5 scale
    specificity: number; // 1-5 scale
    authenticity: number; // 1-5 scale
    coherence: number; // 1-5 scale
  };
  insights: {
    keyThemes: string[];
    contradictions: string[];
    strengths: string[];
    gaps: string[];
  };
  patterns: {
    responseLength: number;
    vocabularyComplexity: number;
    emotionalWords: string[];
    leadership_style_indicators: string[];
  };
  followUpNeeded: boolean;
  createdAt: Date;
}

export interface PrincipleInsight {
  principle: string;
  totalResponses: number;
  averageDepth: number;
  keyPatterns: string[];
  consistency: number; // 0-1 scale
  confidenceLevel: number; // 0-1 scale
  recommendedFollowUp: string[];
}

export interface ConversationAnalysis {
  overallEngagement: number; // 0-1 scale
  dominantSentiment: string;
  communicationStyle: string;
  leadershipStyleEmergent: string[];
  principleReadiness: { [principle: string]: number };
  suggestedDirection: string;
}