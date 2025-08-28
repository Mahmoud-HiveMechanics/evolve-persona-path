export type FrameworkQuestion = {
  id: number;
  section: 'self_perception' | 'scenarios' | 'behavioral';
  title: string;
  assesses: string[];
  type: 'multiple-choice' | 'open-ended';
  text: string;
  options?: string[]; // for MCQ
  followups: {
    insufficient?: string;
    surface?: string;
    alt?: string;
  };
};

export const ASSESSMENT_FRAMEWORK: FrameworkQuestion[] = [
  // SECTION 1: Initial Self-Perception (MCQ)
  {
    id: 1,
    section: 'self_perception',
    title: 'Leadership Foundation',
    assesses: ['Self-Awareness', 'Self-Responsibility'],
    type: 'multiple-choice',
    text: 'When you face a significant leadership challenge, what best describes your typical first response?',
    options: [
      'I seek input from trusted advisors and reflect on my past performance in similar situations',
      'I analyze what I might have contributed to the situation and take ownership of my role',
      'I consider how my leadership style and decisions may have influenced the current circumstances',
      'I focus on the lessons I can learn and how this challenge can help me grow as a leader',
      'I examine the systemic factors while taking responsibility for outcomes within my control'
    ],
    followups: {
      insufficient: 'You selected [X]. Can you give me a specific example from the last 3 months where you faced a significant challenge? What was your actual first response, and how did it play out?',
      surface: 'That sounds thoughtful, but I\'m looking for something more concrete. Walk me through a recent situation where you had to [specific behavior from their choice]. What exactly happened and what others observed?'
    }
  },
  {
    id: 2,
    section: 'self_perception',
    title: 'Team Dynamics',
    assesses: ['Trust and Psychological Safety', 'Empathy and Awareness of Others'],
    type: 'multiple-choice',
    text: 'What best describes how you typically interact with your team members?',
    options: [
      'I proactively check in with people to understand their challenges before they become problems',
      'I create an environment where people feel comfortable bringing me difficult or controversial issues',
      'I adapt my communication approach based on each person\'s working style and needs',
      'I encourage open debate and disagreement, even when people challenge my ideas',
      'I pay close attention to team dynamics and address tensions before they escalate'
    ],
    followups: {
      insufficient: 'You chose [X]. Tell me about a specific example from the last month when this showed up in your leadership. What was the situation and what was the outcome?',
      surface: 'I need a more concrete example. Can you name a particular team member and describe exactly how you\'ve applied this approach with them recently?'
    }
  },
  {
    id: 3,
    section: 'self_perception',
    title: 'Organizational Impact',
    assesses: ['Purpose/Vision/Aligned Outcome', 'Culture of Leadership'],
    type: 'multiple-choice',
    text: 'How do you primarily drive organizational alignment and leadership development?',
    options: [
      'I consistently connect team activities to our larger organizational mission and strategic goals',
      'I delegate meaningful authority to others and hold them accountable for results',
      'I ensure people understand both the what and the why behind our strategic priorities',
      'I empower others to make decisions and solve problems without escalating to me',
      'I communicate our vision in ways that inspire people and drive genuine engagement'
    ],
    followups: {
      insufficient: 'You selected [X]. Give me a real example where you did this in the last quarter. Who was involved, and what tangible changes resulted?',
      surface: 'That sounds like solid leadership practice, but I want to understand your specific approach. Describe a particular conversation or meeting where this happened.'
    }
  },

  // SECTION 2: Adaptive Scenario-Based Dilemmas
  {
    id: 4,
    section: 'scenarios',
    title: 'Resource Allocation Under Pressure',
    assesses: ['Productive Tension Management', 'Stakeholder Impact'],
    type: 'multiple-choice',
    text: 'Your two strongest department heads are in heated disagreement about resource allocation for next quarter. Engineering wants more budget for infrastructure, while Sales demands additional headcount for a major client opportunity. Both have compelling arguments and limited time to decide. How do you approach this?',
    options: [
      'Schedule separate meetings with each leader to understand their full perspective before deciding',
      'Bring both leaders together to debate it out while I facilitate and ask probing questions',
      'Analyze the data myself and make the call based on what\'s best for overall company performance',
      'Push the decision timeline back and gather more stakeholder input before choosing',
      'Split the difference and give each department partial resources to maintain relationships'
    ],
    followups: {
      insufficient: 'Let\'s get more specific. Tell me about a real situation like this you\'ve faced. What did the disagreement look like, how did you navigate the personalities involved, and what happened three months later?',
      alt: 'I notice you picked an option that delays or splits the decision. In reality, leaders often have to make tough calls with incomplete information. Think of a time you had to choose between two good options that would disappoint someone. How did you handle it?'
    }
  },
  {
    id: 5,
    section: 'scenarios',
    title: 'Performance Management Complexity',
    assesses: ['Self-Responsibility', 'Empathy', 'Empowered Responsibility'],
    type: 'multiple-choice',
    text: 'One of your most talented contributors has been consistently missing deadlines and seems disengaged in meetings. They were a star performer until about four months ago. Their work quality is still high, but their behavior is affecting team morale. What\'s your approach?',
    options: [
      'Have a direct conversation about performance expectations and consequences',
      'Try to understand what changed four months ago and address root causes',
      'Involve HR to document performance issues and create an improvement plan',
      'Reassign their work temporarily while figuring out what\'s happening',
      'Ask their closest teammates what they\'ve observed and how it\'s impacting them'
    ],
    followups: {
      insufficient: 'You chose [X]. I want to understand your actual experience. Tell me about a specific person you\'ve managed through a performance decline. What did you discover was really going on?',
      surface: 'That\'s a reasonable approach, but leadership gets messy. Give me the details - what did the conversations actually sound like, and what resistance did you encounter?'
    }
  },
  {
    id: 6,
    section: 'scenarios',
    title: 'Innovation vs. Stability Tension',
    assesses: ['Change/Innovation', 'Purpose/Vision', 'Productive Tension'],
    type: 'multiple-choice',
    text: 'Your organization has been successful with your current business model, but you\'re seeing early signals that customer needs may be shifting. Investing in new capabilities would require significant resources and risk disrupting profitable operations. How do you navigate this?',
    options: [
      'Commission detailed market research before making any major decisions',
      'Start small pilot experiments while maintaining current operations',
      'Focus on optimizing what\'s working now and wait for clearer market signals',
      'Make a bold bet on the future direction based on available information',
      'Engage customers directly to understand where their needs are heading'
    ],
    followups: {
      insufficient: 'You picked the cautious route. Tell me about a time when playing it safe actually hurt your organization. What did you learn about the cost of inaction?',
      alt: 'That\'s decisive. Give me an example of when you made a big bet that didn\'t work out. How did you handle it, and what would you do differently?'
    }
  },

  // SECTION 3: Behavioral Depth Interviews (Open-ended)
  {
    id: 7,
    section: 'behavioral',
    title: 'Self-Leadership Evidence',
    assesses: ['Self-Awareness', 'Continuous Growth'],
    type: 'open-ended',
    text: 'Tell me about a leadership mistake you made in the past year that taught you something important about yourself.',
    followups: {
      insufficient: 'That example feels pretty safe. I\'m looking for something that genuinely surprised you about your own behavior or blind spots. What\'s a time when you really got it wrong?',
      alt: 'You described what happened, but what did you discover about yourself? How has that insight changed how you lead since then?'
    }
  },
  {
    id: 8,
    section: 'behavioral',
    title: 'Trust and Safety in Action',
    assesses: ['Trust/Psychological Safety', 'Empathy'],
    type: 'open-ended',
    text: 'Describe a situation where someone on your team brought you information that was difficult to hear - maybe bad news about a project, a mistake they made, or concerns about your leadership approach.',
    followups: {
      insufficient: 'If you can\'t think of a recent example, that might be telling. What do you think prevents people from bringing you difficult information? How would your direct reports answer that question?',
      surface: 'You mentioned they brought you [issue]. I want to understand your reaction in the moment. What was your first internal response, how did you handle it, and what did that person do the next time they had concerning news?'
    }
  },
  {
    id: 9,
    section: 'behavioral',
    title: 'Authority and Accountability Balance',
    assesses: ['Empowered/Shared Responsibility', 'Culture of Leadership'],
    type: 'open-ended',
    text: 'Think about a decision you delegated to someone else that didn\'t turn out the way you expected. Walk me through what happened and how you handled it.',
    followups: {
      insufficient: 'If you can\'t think of one, that suggests you might not be delegating real authority. What\'s the most significant decision you\'ve let someone else make in the last six months?',
      surface: 'It sounds like you stayed pretty involved. What would have happened if you had completely stepped back? What stopped you from giving them full authority?'
    }
  },
  {
    id: 10,
    section: 'behavioral',
    title: 'Vision Translation',
    assesses: ['Purpose/Vision/Aligned Outcome'],
    type: 'open-ended',
    text: 'How do you ensure that your strategic vision actually translates into changed behavior at the front lines of your organization?',
    followups: {
      insufficient: 'That\'s pretty high-level. Give me a specific example of a strategic priority you set and how you can see it showing up in day-to-day work. How do you know it\'s actually happening?',
      surface: 'You mentioned relying on others to cascade the message. How do you verify that your intent is making it through intact? What do you do when you discover it\'s not?'
    }
  },
  {
    id: 11,
    section: 'behavioral',
    title: 'Conflict and Tension Navigation',
    assesses: ['Productive Tension Management', 'Empathy'],
    type: 'open-ended',
    text: 'Describe a time when you had two experienced people who fundamentally disagreed about an important direction. How did you use that tension productively rather than just resolving it?',
    followups: {
      insufficient: 'It sounds like you moved to solve it quickly. What value might have been lost by not letting the tension exist longer? How do you know when to lean into disagreement versus resolve it?',
      surface: 'You described managing around the conflict. Tell me about a time when you directly engaged two people in productive disagreement. What made it work?'
    }
  },
  {
    id: 12,
    section: 'behavioral',
    title: 'Change Leadership Reality',
    assesses: ['Change/Innovation', 'Culture of Leadership'],
    type: 'open-ended',
    text: 'Tell me about a change initiative you led that met significant resistance. How did you distinguish between legitimate concerns and fear-based pushback?',
    followups: {
      insufficient: 'That sounds like it went well. Now tell me about a change effort that didn\'t go as planned. What did the resistance teach you about your approach?',
      surface: 'You described overcoming resistance. How did you determine which concerns were worth addressing versus which were just change aversion? Give me an example of feedback that actually improved your approach.'
    }
  },
  {
    id: 13,
    section: 'behavioral',
    title: 'Stakeholder Impact Awareness',
    assesses: ['Stakeholder Impact', 'Social/Ethical Stewardship'],
    type: 'open-ended',
    text: 'Describe a decision you made that benefited your immediate team or organization but had negative consequences for another stakeholder group. How did you handle that?',
    followups: {
      insufficient: 'If you can\'t think of one, that might suggest you\'re not seeing the full impact of your decisions. What\'s a recent choice you made where someone outside your direct team might have legitimate concerns?',
      surface: 'You explained why the decision made sense. I\'m more interested in how you handled the negative impact on [stakeholder group]. What did you do about their concerns?'
    }
  },
  {
    id: 14,
    section: 'behavioral',
    title: 'Growth Mindset in Practice',
    assesses: ['Continuous Personal Growth', 'Self-Awareness'],
    type: 'open-ended',
    text: 'What\'s a leadership capability you\'re actively working to develop right now, and what specific actions are you taking to get better at it?',
    followups: {
      insufficient: 'That\'s pretty general. What does \"better at [capability]\" look like in practice? How will you and others know when you\'ve improved?',
      surface: 'You identified what you want to work on, but I don\'t hear concrete development activities. What are you actually doing this week or this month to build that capability?'
    }
  },
  {
    id: 15,
    section: 'behavioral',
    title: 'Systems Thinking and Integration',
    assesses: ['Multiple Principles'],
    type: 'open-ended',
    text: 'Think about a complex organizational challenge you\'re facing right now. How do you balance competing priorities while maintaining your leadership principles and developing others?',
    followups: {
      insufficient: 'You focused mainly on [aspect]. How does this challenge also touch on other leadership areas? What trade-offs are you making between different principles?',
      surface: 'You described your own actions. How are you using this challenge as a development opportunity for other leaders in your organization?'
    }
  }
];
