// Test file for leadership analysis functionality
import { analyzeLeadershipStyle, extractMCQAnswers, type MCQAnswer } from '../leadershipAnalysis';

describe('Leadership Analysis', () => {
  test('should analyze analytical-reflective leadership style', () => {
    const mcqAnswers: MCQAnswer[] = [
      {
        questionId: 1,
        questionText: 'When you face a significant challenge, what best describes your typical first response?',
        selectedOption: 'I seek input from trusted advisors and reflect on my past performance in similar situations',
        optionIndex: 0
      },
      {
        questionId: 2,
        questionText: 'What best describes how you typically interact with your team members?',
        selectedOption: 'I proactively check in with people to understand their challenges before they become problems',
        optionIndex: 0
      },
      {
        questionId: 3,
        questionText: 'How do you primarily drive organizational alignment and leadership development?',
        selectedOption: 'I consistently connect team activities to our larger organizational mission and strategic goals',
        optionIndex: 0
      },
      {
        questionId: 4,
        questionText: 'Your two strongest department heads are in heated disagreement about resource allocation',
        selectedOption: 'Schedule separate meetings with each leader to understand their full perspective before deciding',
        optionIndex: 0
      }
    ];

    const result = analyzeLeadershipStyle(mcqAnswers);
    
    expect(result.primaryStyle).toBe('Analytical-Reflective');
    expect(result.focusAreas).toContain('Self-Awareness');
    expect(result.potentialBlindSpots).toContain('Action bias');
    expect(result.recommendedQuestionBias.length).toBeGreaterThan(0);
  });

  test('should analyze action-oriented leadership style', () => {
    const mcqAnswers: MCQAnswer[] = [
      {
        questionId: 1,
        questionText: 'When you face a significant challenge, what best describes your typical first response?',
        selectedOption: 'I focus on the lessons I can learn and how this challenge can help me grow as a leader',
        optionIndex: 3
      },
      {
        questionId: 2,
        questionText: 'What best describes how you typically interact with your team members?',
        selectedOption: 'I encourage open debate and disagreement, even when people challenge my ideas',
        optionIndex: 3
      },
      {
        questionId: 3,
        questionText: 'How do you primarily drive organizational alignment and leadership development?',
        selectedOption: 'I make a bold bet on the future direction based on available information',
        optionIndex: 3
      },
      {
        questionId: 4,
        questionText: 'Your two strongest department heads are in heated disagreement about resource allocation',
        selectedOption: 'Analyze the data myself and make the call based on what\'s best for overall company performance',
        optionIndex: 2
      }
    ];

    const result = analyzeLeadershipStyle(mcqAnswers);
    
    expect(result.primaryStyle).toBe('Action-Oriented');
    expect(result.focusAreas).toContain('Self-Responsibility');
    expect(result.potentialBlindSpots).toContain('Over-analysis');
  });

  test('should return default style for insufficient data', () => {
    const mcqAnswers: MCQAnswer[] = [
      {
        questionId: 1,
        questionText: 'Test question',
        selectedOption: 'Test answer',
        optionIndex: 0
      }
    ];

    const result = analyzeLeadershipStyle(mcqAnswers);
    
    expect(result.primaryStyle).toBe('Analytical-Reflective');
    expect(result.secondaryStyle).toBe('Action-Oriented');
  });

  test('should extract MCQ answers from messages', () => {
    const messages = [
      { type: 'bot', content: 'Question 1' },
      { type: 'user', content: 'Answer 1' },
      { type: 'bot', content: 'Question 2' },
      { type: 'user', content: 'Answer 2' },
      { type: 'bot', content: 'Question 3' },
      { type: 'user', content: 'Answer 3' },
      { type: 'bot', content: 'Question 4' },
      { type: 'user', content: 'Answer 4' }
    ];

    const result = extractMCQAnswers(messages);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].selectedOption).toBe('Answer 1');
  });
});
