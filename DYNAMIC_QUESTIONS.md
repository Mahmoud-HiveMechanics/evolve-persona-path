# Dynamic Question Generation System

## Overview

This system implements **Option 1: AI Prompt Engineering** from the assessment briefing, making all questions dynamic based on the first 4 MCQ answers to identify leadership style and bias subsequent questions accordingly.

## How It Works

### 1. Initial Framework Questions (First 3 Questions)
- Uses predefined framework questions from `ASSESSMENT_FRAMEWORK`
- These are structured MCQ questions that establish a baseline

### 2. Leadership Style Analysis (After 4th Question)
- Analyzes the first 4 MCQ answers to determine leadership style
- Identifies primary and secondary leadership styles
- Maps to focus areas, strengths, and potential blind spots
- Generates recommended question bias

### 3. Dynamic Question Generation (Questions 5+)
- All subsequent questions are generated dynamically by AI
- AI prompts are biased based on the leadership style analysis
- Questions focus on identified blind spots and gaps
- Challenges the participant's comfort zone

## Leadership Styles

The system recognizes 5 primary leadership styles:

1. **Analytical-Reflective**: Thoughtful, reflective, seeks input
2. **Action-Oriented**: Decisive, quick to act, risk-tolerant
3. **Collaborative-Relational**: Team-focused, inclusive, stakeholder-oriented
4. **Vision-Strategic**: Strategic thinking, long-term planning, vision-focused
5. **Empathetic-Supportive**: People-focused, supportive, emotionally intelligent

## Question Bias Strategy

For each leadership style, the system generates questions that:

- **Analytical-Reflective**: Focus on quick decisions and action scenarios
- **Action-Oriented**: Probe reflection and collaborative decision-making
- **Collaborative-Relational**: Explore independent leadership and tough decisions
- **Vision-Strategic**: Focus on operational execution and tactical management
- **Empathetic-Supportive**: Explore performance management and difficult conversations

## Implementation Details

### Key Files

- `src/lib/leadershipAnalysis.ts`: Core analysis logic
- `src/pages/Assessment.tsx`: Integration with assessment flow
- `supabase/functions/dynamic-question-generator/index.ts`: AI question generation

### Key Functions

- `analyzeLeadershipStyle()`: Analyzes MCQ answers to determine style
- `extractMCQAnswers()`: Extracts MCQ responses from conversation
- `generateContextualQuestion()`: Generates biased questions based on style

### Data Flow

1. User answers first 4 MCQ questions
2. System analyzes answers to determine leadership style
3. Leadership style is passed to AI question generator
4. AI generates questions biased toward identified blind spots
5. Questions challenge participant's comfort zone

## Benefits

- **Personalized Assessment**: Questions adapt to individual leadership style
- **Comprehensive Coverage**: Ensures all leadership areas are explored
- **Dynamic Experience**: Feels natural and conversational
- **Controlled Direction**: Maintains assessment quality while being adaptive

## Testing

Run the test suite to verify functionality:

```bash
npm test src/lib/__tests__/leadershipAnalysis.test.ts
```

## Future Enhancements

- Add more sophisticated pattern recognition
- Include behavioral indicators from open-ended responses
- Implement real-time style adjustment based on responses
- Add confidence scoring for style analysis
