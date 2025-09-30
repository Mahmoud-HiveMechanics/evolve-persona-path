import { ResponseMemory, PrincipleInsight, ConversationAnalysis } from '@/types/responseMemory';

export class ResponseAnalyzer {
  
  // Analyze individual response and create memory record
  static analyzeResponse(
    conversationId: string,
    messageId: string,
    userId: string,
    principle: string,
    responseText: string
  ): ResponseMemory {
    
    const sentiment = this.analyzeSentiment(responseText);
    const qualityMetrics = this.analyzeQuality(responseText);
    const insights = this.extractInsights(responseText, principle);
    const patterns = this.analyzePatterns(responseText);
    
    return {
      id: crypto.randomUUID(),
      conversationId,
      messageId,
      userId,
      principle,
      responseText,
      sentiment,
      qualityMetrics,
      insights,
      patterns,
      followUpNeeded: this.needsFollowUp(qualityMetrics, sentiment),
      createdAt: new Date()
    };
  }

  // Sentiment analysis using keyword patterns and linguistic cues
  private static analyzeSentiment(text: string) {
    const words = text.toLowerCase().split(/\s+/);
    
    // Confidence indicators
    const confidenceWords = ['certain', 'sure', 'confident', 'definitely', 'absolutely', 'always', 'never'];
    const uncertaintyWords = ['maybe', 'perhaps', 'might', 'could', 'sometimes', 'unsure', 'not sure'];
    
    // Passion indicators
    const passionWords = ['love', 'passionate', 'excited', 'energized', 'motivated', 'inspired'];
    const resistanceWords = ['difficult', 'challenge', 'struggle', 'hard', 'problem', 'issue'];

    const confidence = this.calculateWordScore(words, confidenceWords) - this.calculateWordScore(words, uncertaintyWords);
    const uncertainty = this.calculateWordScore(words, uncertaintyWords);
    const passion = this.calculateWordScore(words, passionWords);
    const resistance = this.calculateWordScore(words, resistanceWords);

    return {
      confidence: Math.max(0, Math.min(1, confidence)),
      uncertainty: Math.max(0, Math.min(1, uncertainty)),
      passion: Math.max(0, Math.min(1, passion)),
      resistance: Math.max(0, Math.min(1, resistance))
    };
  }

  // Quality analysis based on response characteristics
  private static analyzeQuality(text: string) {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentenceCount;

    // Depth: longer, more detailed responses score higher
    const depth = Math.min(5, Math.max(1, Math.floor(wordCount / 20) + 1));
    
    // Specificity: presence of specific examples, numbers, names
    const specificityIndicators = ['example', 'instance', 'specifically', 'particularly', '%', '$'];
    const specificity = Math.min(5, this.calculateWordScore(text.toLowerCase().split(/\s+/), specificityIndicators) * 2 + 1);
    
    // Authenticity: personal pronouns and emotional language
    const authenticityWords = ['i', 'my', 'me', 'personally', 'feel', 'believe', 'think'];
    const authenticity = Math.min(5, this.calculateWordScore(text.toLowerCase().split(/\s+/), authenticityWords) * 1.5 + 1);
    
    // Coherence: sentence structure and flow
    const coherence = avgWordsPerSentence > 5 && avgWordsPerSentence < 25 ? 5 : 3;

    return {
      depth: Math.round(depth),
      specificity: Math.round(specificity),
      authenticity: Math.round(authenticity),
      coherence: Math.round(coherence)
    };
  }

  // Extract key insights and themes
  private static extractInsights(text: string, principle: string) {
    const words = text.toLowerCase().split(/\s+/);
    
    // Key themes based on leadership principles
    const leadershipThemes = {
      'self_awareness': ['reflection', 'understanding', 'aware', 'recognize'],
      'emotional_intelligence': ['emotion', 'feeling', 'empathy', 'understand'],
      'decision_making': ['decision', 'choose', 'analyze', 'evaluate'],
      'communication': ['communicate', 'listen', 'speak', 'message'],
      'team_building': ['team', 'collaboration', 'together', 'group']
    };

    const keyThemes = Object.entries(leadershipThemes)
      .filter(([_, keywords]) => keywords.some(keyword => text.toLowerCase().includes(keyword)))
      .map(([theme, _]) => theme);

    // Look for contradictions (opposing viewpoints in same response)
    const contradictions = this.findContradictions(text);
    
    // Identify strengths mentioned
    const strengthWords = ['good', 'strong', 'excellent', 'effective', 'successful'];
    const strengths = strengthWords.filter(word => text.toLowerCase().includes(word));
    
    // Identify gaps or areas for improvement
    const gapWords = ['improve', 'better', 'lack', 'need', 'struggle', 'challenge'];
    const gaps = gapWords.filter(word => text.toLowerCase().includes(word));

    return {
      keyThemes,
      contradictions,
      strengths,
      gaps
    };
  }

  // Analyze response patterns
  private static analyzePatterns(text: string) {
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    
    // Emotional words
    const emotionalWords = ['feel', 'emotion', 'passionate', 'excited', 'frustrated', 'angry', 'happy'];
    const foundEmotionalWords = emotionalWords.filter(word => text.toLowerCase().includes(word));
    
    // Leadership style indicators
    const leadershipIndicators = ['collaborate', 'direct', 'support', 'challenge', 'innovate', 'organize'];
    const foundIndicators = leadershipIndicators.filter(word => text.toLowerCase().includes(word));

    return {
      responseLength: words.length,
      vocabularyComplexity: uniqueWords.size / words.length,
      emotionalWords: foundEmotionalWords,
      leadership_style_indicators: foundIndicators
    };
  }

  // Helper method to calculate word score
  private static calculateWordScore(words: string[], targetWords: string[]): number {
    const matches = words.filter(word => targetWords.includes(word)).length;
    return matches / words.length;
  }

  // Find contradictory statements
  private static findContradictions(text: string): string[] {
    const contradictions = [];
    const lowerText = text.toLowerCase();
    
    // Simple contradiction patterns
    if (lowerText.includes('but ') || lowerText.includes('however')) {
      contradictions.push('contradictory_statement');
    }
    
    if (lowerText.includes('always') && lowerText.includes('never')) {
      contradictions.push('absolute_contradiction');
    }

    return contradictions;
  }

  // Determine if follow-up is needed
  private static needsFollowUp(qualityMetrics: any, sentiment: any): boolean {
    return qualityMetrics.depth <= 2 || 
           qualityMetrics.specificity <= 2 || 
           sentiment.uncertainty > 0.7 ||
           sentiment.resistance > 0.6;
  }

  // Analyze conversation-level patterns
  static analyzeConversation(responses: ResponseMemory[]): ConversationAnalysis {
    if (responses.length === 0) {
      return {
        overallEngagement: 0,
        dominantSentiment: 'neutral',
        communicationStyle: 'unknown',
        leadershipStyleEmergent: [],
        principleReadiness: {},
        suggestedDirection: 'start_assessment'
      };
    }

    // Calculate overall engagement
    const avgDepth = responses.reduce((sum, r) => sum + r.qualityMetrics.depth, 0) / responses.length;
    const avgLength = responses.reduce((sum, r) => sum + r.patterns.responseLength, 0) / responses.length;
    const overallEngagement = Math.min(1, (avgDepth / 5 + avgLength / 100) / 2);

    // Determine dominant sentiment
    const avgConfidence = responses.reduce((sum, r) => sum + r.sentiment.confidence, 0) / responses.length;
    const avgUncertainty = responses.reduce((sum, r) => sum + r.sentiment.uncertainty, 0) / responses.length;
    const avgPassion = responses.reduce((sum, r) => sum + r.sentiment.passion, 0) / responses.length;
    
    let dominantSentiment = 'neutral';
    if (avgConfidence > 0.6) dominantSentiment = 'confident';
    else if (avgUncertainty > 0.6) dominantSentiment = 'uncertain';
    else if (avgPassion > 0.6) dominantSentiment = 'passionate';

    // Analyze communication style
    const avgComplexity = responses.reduce((sum, r) => sum + r.patterns.vocabularyComplexity, 0) / responses.length;
    const communicationStyle = avgComplexity > 0.7 ? 'analytical' : avgComplexity > 0.5 ? 'balanced' : 'direct';

    // Extract emerging leadership styles
    const allIndicators = responses.flatMap(r => r.patterns.leadership_style_indicators);
    const leadershipStyleEmergent = [...new Set(allIndicators)];

    // Calculate principle readiness
    const principleReadiness: { [principle: string]: number } = {};
    responses.forEach(response => {
      const readinessScore = (
        response.qualityMetrics.depth + 
        response.qualityMetrics.authenticity + 
        response.sentiment.confidence * 5
      ) / 15;
      principleReadiness[response.principle] = readinessScore;
    });

    // Suggest direction
    let suggestedDirection = 'continue_assessment';
    if (overallEngagement < 0.3) suggestedDirection = 'increase_engagement';
    else if (avgUncertainty > 0.7) suggestedDirection = 'provide_clarification';
    else if (Object.keys(principleReadiness).length >= 8) suggestedDirection = 'deep_dive_phase';

    return {
      overallEngagement,
      dominantSentiment,
      communicationStyle,
      leadershipStyleEmergent,
      principleReadiness,
      suggestedDirection
    };
  }

  // Generate principle insights
  static generatePrincipleInsights(responses: ResponseMemory[]): PrincipleInsight[] {
    const principleGroups = responses.reduce((groups, response) => {
      if (!groups[response.principle]) {
        groups[response.principle] = [];
      }
      groups[response.principle].push(response);
      return groups;
    }, {} as { [principle: string]: ResponseMemory[] });

    return Object.entries(principleGroups).map(([principle, principleResponses]) => {
      const totalResponses = principleResponses.length;
      const averageDepth = principleResponses.reduce((sum, r) => sum + r.qualityMetrics.depth, 0) / totalResponses;
      
      // Extract key patterns
      const allThemes = principleResponses.flatMap(r => r.insights.keyThemes);
      const keyPatterns = [...new Set(allThemes)];
      
      // Calculate consistency (how similar responses are to each other)
      const avgConfidence = principleResponses.reduce((sum, r) => sum + r.sentiment.confidence, 0) / totalResponses;
      const consistency = 1 - (principleResponses.reduce((sum, r) => sum + Math.abs(r.sentiment.confidence - avgConfidence), 0) / totalResponses);
      
      // Determine follow-up needs
      const needsFollowUp = principleResponses.some(r => r.followUpNeeded);
      const recommendedFollowUp = needsFollowUp ? 
        ['deeper_exploration', 'specific_examples', 'clarification'] : 
        ['integration_questions'];

      return {
        principle,
        totalResponses,
        averageDepth,
        keyPatterns,
        consistency,
        confidenceLevel: avgConfidence,
        recommendedFollowUp
      };
    });
  }
}