import { FrameworkQuestion } from './assessmentFramework';

// ===== LEADERSHIP STYLE ROUTING SYSTEM =====

export type LeadershipStyleType = 'analytical-reflective' | 'action-oriented' | 'collaborative-relational' | 'vision-strategic';

// MCQ Questions 1-4: Leadership Style Detection Questions
export const STYLE_DETECTION_QUESTIONS: FrameworkQuestion[] = [
  {
    id: 1,
    section: 'self_perception',
    title: 'Decision Making Approach',
    assesses: ['Self-Awareness', 'Self-Responsibility'],
    type: 'multiple-choice',
    text: 'When facing an important decision with limited time, what best describes your approach?',
    options: [
      'I gather input from key stakeholders and analyze past similar situations before deciding',
      'I make the call quickly based on available information and adjust as needed',
      'I bring the team together to discuss options and build consensus on the path forward',
      'I consider the long-term strategic implications and how this aligns with our vision'
    ],
    followups: {
      insufficient: 'Tell me about a specific recent decision where you used this approach. What was the outcome?'
    }
  },
  {
    id: 2,
    section: 'self_perception', 
    title: 'Team Leadership Style',
    assesses: ['Trust and Psychological Safety', 'Empathy and Awareness of Others'],
    type: 'multiple-choice',
    text: 'How do you typically approach leading and developing your team?',
    options: [
      'I provide thoughtful coaching and encourage people to reflect on their growth areas',
      'I set clear expectations, give direct feedback, and focus on results and accountability',
      'I facilitate collaboration, ensure everyone has a voice, and build strong team relationships',
      'I inspire people with a compelling vision and help them see how their work contributes to bigger goals'
    ],
    followups: {
      insufficient: 'Give me a specific example of how you developed someone on your team recently.'
    }
  },
  {
    id: 3,
    section: 'self_perception',
    title: 'Change and Innovation',
    assesses: ['Change/Innovation', 'Purpose/Vision'],
    type: 'multiple-choice', 
    text: 'When your organization needs to adapt or innovate, what role do you typically play?',
    options: [
      'I carefully analyze what\'s working and not working, then propose thoughtful improvements',
      'I drive change quickly, experiment with new approaches, and pivot based on results',
      'I engage stakeholders to understand different perspectives and build buy-in for changes',
      'I create a compelling vision for the future and align the organization around strategic transformation'
    ],
    followups: {
      insufficient: 'Describe a specific change you led. How did you approach it and what happened?'
    }
  },
  {
    id: 4,
    section: 'self_perception',
    title: 'Problem Solving Preference',
    assesses: ['Productive Tension Management', 'Self-Responsibility'],
    type: 'multiple-choice',
    text: 'When your team faces a complex challenge, what\'s your natural tendency?',
    options: [
      'I step back to understand root causes, gather data, and develop a comprehensive solution',
      'I focus on immediate actions we can take and iterate our way to a solution',
      'I facilitate discussions to leverage diverse perspectives and find collaborative solutions',
      'I help the team see how solving this challenge advances our strategic objectives'
    ],
    followups: {
      insufficient: 'Walk me through a recent complex challenge. How did you approach it?'
    }
  }
];

// Leadership Style Specific Question Sets (11 questions each)
export const LEADERSHIP_STYLE_QUESTIONS: Record<LeadershipStyleType, FrameworkQuestion[]> = {
  'analytical-reflective': [
    // Challenge: Speed up decision-making, embrace action bias, take more risks
    {
      id: 101,
      section: 'behavioral',
      title: 'Action Under Pressure',
      assesses: ['Self-Responsibility', 'Productive Tension Management'],
      type: 'multiple-choice',
      text: 'Your team needs to make a critical decision by end of day, but you feel you don\'t have enough information. What do you do?',
      options: [
        'Make the best decision possible with available information and communicate the reasoning clearly',
        'Delegate the decision to the most knowledgeable team member and support their choice',
        'Quickly gather the most critical data points and decide based on that',
        'Extend the deadline to ensure we make the right decision with proper analysis'
      ],
      followups: {
        insufficient: 'Tell me about a time when you had to act without complete information. What happened?'
      }
    },
    {
      id: 102,
      section: 'behavioral',
      title: 'Risk Taking',
      assesses: ['Change/Innovation', 'Self-Responsibility'],
      type: 'open-ended',
      text: 'Describe a time when you had to take a calculated risk that made you uncomfortable. How did you approach it?',
      followups: {
        insufficient: 'What made it uncomfortable for you? How did you push through that discomfort?'
      }
    },
    {
      id: 103,
      section: 'behavioral',
      title: 'Quick Decision Making',
      assesses: ['Self-Responsibility', 'Productive Tension Management'],
      type: 'multiple-choice',
      text: 'You\'re in a meeting and need to make an immediate decision that will affect your team\'s work for the next month. Your instinct is to gather more data, but the window is closing. What do you do?',
      options: [
        'Trust your experience and make the call, then adjust course if needed',
        'Ask for 24 hours to think it through and present a well-reasoned decision',
        'Poll the room quickly to get input before deciding',
        'Make a provisional decision and set a review point to reassess with more data'
      ],
      followups: {
        insufficient: 'Tell me about a time when your natural tendency to analyze conflicted with the need for speed.'
      }
    },
    {
      id: 104,
      section: 'behavioral',
      title: 'Embracing Ambiguity',
      assesses: ['Change/Innovation', 'Self-Awareness'],
      type: 'open-ended',
      text: 'Describe a situation where you had to lead through significant uncertainty. How did you handle not having all the answers?',
      followups: {
        insufficient: 'What was most challenging about the uncertainty? How did you communicate with your team about the unknowns?'
      }
    },
    {
      id: 105,
      section: 'behavioral',
      title: 'Bias Toward Action',
      assesses: ['Self-Responsibility', 'Culture of Leadership'],
      type: 'multiple-choice',
      text: 'Your team has been analyzing a problem for two weeks and still wants more time to research. You see a clear path forward. How do you proceed?',
      options: [
        'Set a firm deadline for analysis and move to action, explaining the cost of delay',
        'Give them one more week but with specific deliverables and decision criteria',
        'Start implementing small experiments while they continue their analysis',
        'Let them finish their analysis since thorough preparation usually pays off'
      ],
      followups: {
        insufficient: 'Tell me about a time when your team\'s desire for more analysis conflicted with the need to act.'
      }
    },
    {
      id: 106,
      section: 'behavioral',
      title: 'Imperfect Information',
      assesses: ['Self-Responsibility', 'Productive Tension Management'],
      type: 'open-ended',
      text: 'Tell me about a significant decision you made with incomplete information that turned out well. What gave you confidence to proceed?',
      followups: {
        insufficient: 'How do you balance your natural desire for complete information with the need to move forward?'
      }
    },
    {
      id: 107,
      section: 'behavioral',
      title: 'Speed vs Quality',
      assesses: ['Productive Tension Management', 'Stakeholder Impact'],
      type: 'multiple-choice',
      text: 'Your stakeholders are pushing for a quick solution, but you know a more thoughtful approach would yield better results. The timeline is non-negotiable. What\'s your approach?',
      options: [
        'Deliver a quick solution now and plan for improvements in the next iteration',
        'Negotiate for just enough time to ensure quality while meeting core requirements',
        'Push back firmly on the timeline to avoid compromising on quality',
        'Find creative ways to accelerate your process without sacrificing thoroughness'
      ],
      followups: {
        insufficient: 'Describe a time when you had to compromise between speed and your preferred level of analysis.'
      }
    },
    {
      id: 108,
      section: 'behavioral',
      title: 'Gut Instinct',
      assesses: ['Self-Awareness', 'Self-Responsibility'],
      type: 'open-ended',
      text: 'Tell me about a time when your gut instinct told you one thing, but your analysis suggested another. How did you handle it?',
      followups: {
        insufficient: 'How do you balance intuition with analysis in your decision-making now?'
      }
    },
    {
      id: 109,
      section: 'behavioral',
      title: 'Rapid Iteration',
      assesses: ['Change/Innovation', 'Culture of Leadership'],
      type: 'multiple-choice',
      text: 'Your team is used to thorough planning before execution. You want to try a more iterative, "fail fast" approach on a new project. How do you introduce this?',
      options: [
        'Start with a small pilot to demonstrate the value of rapid iteration',
        'Explain the benefits and ask the team to trust the new approach',
        'Gradually introduce more iterative elements while maintaining some planning',
        'Let the team continue their preferred approach since it works for them'
      ],
      followups: {
        insufficient: 'How do you help analytical teams become more comfortable with experimentation and iteration?'
      }
    },
    {
      id: 110,
      section: 'behavioral',
      title: 'Crisis Leadership',
      assesses: ['Self-Responsibility', 'Productive Tension Management'],
      type: 'open-ended',
      text: 'Describe a crisis situation where you had to act immediately without your usual analysis process. What was that experience like?',
      followups: {
        insufficient: 'What did you learn about your ability to lead in high-pressure, low-information situations?'
      }
    },
    {
      id: 111,
      section: 'behavioral',
      title: 'Experimentation Mindset',
      assesses: ['Change/Innovation', 'Self-Awareness'],
      type: 'multiple-choice',
      text: 'You have an idea that could significantly improve your team\'s performance, but it\'s unproven and carries some risk. How do you approach it?',
      options: [
        'Design a small, low-risk experiment to test the core assumptions',
        'Research similar approaches used by other teams or organizations first',
        'Present the idea to stakeholders and get buy-in before proceeding',
        'Develop a comprehensive plan that addresses potential risks and benefits'
      ],
      followups: {
        insufficient: 'How do you balance your natural caution with the need to innovate and experiment?'
      }
    }
  ],
  
  'action-oriented': [
    // Challenge: Slow down for collaboration, seek input, reflect more deeply
    {
      id: 201,
      section: 'behavioral',
      title: 'Collaborative Decision Making',
      assesses: ['Trust and Psychological Safety', 'Empathy and Awareness of Others'],
      type: 'multiple-choice',
      text: 'You have a clear vision for how to solve a problem, but your team seems to want more discussion. How do you handle this?',
      options: [
        'Take time to understand their concerns and incorporate their input into the solution',
        'Explain your reasoning and ask for their commitment to move forward',
        'Facilitate a structured discussion to align on the best path forward',
        'Let the team work through the discussion while you focus on removing obstacles'
      ],
      followups: {
        insufficient: 'Tell me about a specific time when your team wanted more input than you initially planned to give.'
      }
    },
    {
      id: 202,
      section: 'behavioral',
      title: 'Reflection and Learning',
      assesses: ['Self-Awareness', 'Continuous Personal Growth'],
      type: 'open-ended',
      text: 'Tell me about a decision you made quickly that you later realized could have benefited from more reflection or input.',
      followups: {
        insufficient: 'What did you learn about balancing speed with thoroughness? How has this changed your approach?'
      }
    },
    {
      id: 203,
      section: 'behavioral',
      title: 'Building Consensus',
      assesses: ['Trust and Psychological Safety', 'Empathy and Awareness of Others'],
      type: 'multiple-choice',
      text: 'Your team is split on an important decision. You have a preference, but you want to build genuine buy-in. What\'s your approach?',
      options: [
        'Facilitate a structured debate where each side presents their case thoroughly',
        'Share your perspective and ask the team to help you understand what you might be missing',
        'Set up smaller conversations to understand individual concerns before reconvening',
        'Present the decision criteria and let the team work through the logic together'
      ],
      followups: {
        insufficient: 'Describe a time when you had to slow down your natural pace to build consensus. What was that like?'
      }
    },
    {
      id: 204,
      section: 'behavioral',
      title: 'Stakeholder Input',
      assesses: ['Empathy and Awareness of Others', 'Stakeholder Impact'],
      type: 'open-ended',
      text: 'Tell me about a time when you initially wanted to move fast on something, but stakeholder input changed your approach significantly.',
      followups: {
        insufficient: 'What did you learn about the value of slowing down for input? How do you balance speed with inclusion now?'
      }
    },
    {
      id: 205,
      section: 'behavioral',
      title: 'Process and Structure',
      assesses: ['Culture of Leadership', 'Empowered/Shared Responsibility'],
      type: 'multiple-choice',
      text: 'Your team keeps getting bogged down in process and meetings. You want to streamline, but they seem to value the structure. How do you approach this?',
      options: [
        'Work with them to redesign processes that maintain structure but improve efficiency',
        'Implement streamlined processes and help them adapt to the new approach',
        'Create parallel tracks - structured process for some decisions, fast track for others',
        'Focus on outcomes and let them choose the processes that work best for them'
      ],
      followups: {
        insufficient: 'Tell me about a time when your desire for speed conflicted with your team\'s need for process.'
      }
    },
    {
      id: 206,
      section: 'behavioral',
      title: 'Deep Listening',
      assesses: ['Empathy and Awareness of Others', 'Trust and Psychological Safety'],
      type: 'open-ended',
      text: 'Describe a situation where really listening to someone changed your mind about an important decision.',
      followups: {
        insufficient: 'How do you create space for deep listening when your instinct is to move to action quickly?'
      }
    },
    {
      id: 207,
      section: 'behavioral',
      title: 'Inclusive Planning',
      assesses: ['Trust and Psychological Safety', 'Culture of Leadership'],
      type: 'multiple-choice',
      text: 'You need to develop a strategy for next quarter. Your instinct is to draft something and get feedback, but you want to be more inclusive. What do you do?',
      options: [
        'Start with a collaborative planning session to gather input before drafting',
        'Create a rough framework and use it as a starting point for team input',
        'Assign different team members to research and present on different aspects',
        'Draft your initial thoughts but schedule multiple rounds of feedback and revision'
      ],
      followups: {
        insufficient: 'How do you balance your natural efficiency with the need for inclusive planning processes?'
      }
    },
    {
      id: 208,
      section: 'behavioral',
      title: 'Patience with Process',
      assesses: ['Self-Awareness', 'Empathy and Awareness of Others'],
      type: 'open-ended',
      text: 'Tell me about a time when you had to be patient with a slower, more deliberate process than you preferred. How did you handle it?',
      followups: {
        insufficient: 'What strategies do you use to stay engaged and add value in slower-paced processes?'
      }
    },
    {
      id: 209,
      section: 'behavioral',
      title: 'Seeking Diverse Perspectives',
      assesses: ['Empathy and Awareness of Others', 'Stakeholder Impact'],
      type: 'multiple-choice',
      text: 'You\'re confident about a solution, but you want to make sure you\'re not missing anything. How do you seek out different perspectives?',
      options: [
        'Actively seek out people who might disagree and ask them to challenge your thinking',
        'Present your solution to diverse stakeholders and ask specific questions about concerns',
        'Set up a formal review process with people from different functions or backgrounds',
        'Test your assumptions with a small group before broader implementation'
      ],
      followups: {
        insufficient: 'How do you overcome your natural confidence to genuinely seek out dissenting views?'
      }
    },
    {
      id: 210,
      section: 'behavioral',
      title: 'Reflective Practice',
      assesses: ['Self-Awareness', 'Continuous Personal Growth'],
      type: 'open-ended',
      text: 'How do you build reflection into your routine when your natural tendency is to keep moving forward?',
      followups: {
        insufficient: 'What specific practices help you slow down and learn from your experiences?'
      }
    },
    {
      id: 211,
      section: 'behavioral',
      title: 'Collaborative Problem Solving',
      assesses: ['Trust and Psychological Safety', 'Culture of Leadership'],
      type: 'multiple-choice',
      text: 'Your team is facing a complex problem. You have some ideas, but you want to leverage collective intelligence. What\'s your approach?',
      options: [
        'Start with a brainstorming session where everyone contributes ideas before evaluation',
        'Share your initial thoughts and ask the team to build on or challenge them',
        'Break the problem into pieces and have different people lead different aspects',
        'Facilitate a structured problem-solving process that draws out diverse thinking'
      ],
      followups: {
        insufficient: 'How do you resist the urge to drive toward your preferred solution and genuinely collaborate?'
      }
    }
  ],
  
  'collaborative-relational': [
    // Challenge: Make tough independent decisions, have difficult conversations, drive accountability
    {
      id: 301,
      section: 'behavioral',
      title: 'Independent Leadership',
      assesses: ['Self-Responsibility', 'Empowered/Shared Responsibility'],
      type: 'multiple-choice',
      text: 'You need to make an unpopular decision that you know is right, but your team is likely to resist. What\'s your approach?',
      options: [
        'Make the decision and then work to help the team understand the reasoning',
        'Find ways to involve the team in shaping how the decision gets implemented',
        'Look for compromise solutions that address the team\'s main concerns',
        'Delay the decision to build more consensus and buy-in first'
      ],
      followups: {
        insufficient: 'Describe a time when you had to make a decision your team didn\'t like. How did you handle it?'
      }
    },
    {
      id: 302,
      section: 'behavioral',
      title: 'Difficult Conversations',
      assesses: ['Trust and Psychological Safety', 'Productive Tension Management'],
      type: 'open-ended',
      text: 'Tell me about a time when you had to have a difficult performance conversation with someone you care about.',
      followups: {
        insufficient: 'What made it difficult for you? How did you balance being caring with being direct?'
      }
    },
    {
      id: 303,
      section: 'behavioral',
      title: 'Accountability Without Consensus',
      assesses: ['Self-Responsibility', 'Culture of Leadership'],
      type: 'multiple-choice',
      text: 'One of your team members consistently misses deadlines, affecting others. The team hasn\'t raised it directly, but you can see the impact. How do you handle this?',
      options: [
        'Address it directly with the individual and set clear expectations going forward',
        'Bring it up in a team meeting to establish shared accountability standards',
        'Have individual conversations with affected team members first to understand the impact',
        'Create team processes that make deadline accountability more visible and systematic'
      ],
      followups: {
        insufficient: 'Tell me about a time when you had to hold someone accountable despite it being uncomfortable.'
      }
    },
    {
      id: 304,
      section: 'behavioral',
      title: 'Decisive Leadership',
      assesses: ['Self-Responsibility', 'Productive Tension Management'],
      type: 'open-ended',
      text: 'Describe a situation where your natural inclination to seek input and build consensus was actually counterproductive.',
      followups: {
        insufficient: 'What did you learn about when collaboration helps versus when it hinders? How do you decide now?'
      }
    },
    {
      id: 305,
      section: 'behavioral',
      title: 'Performance Management',
      assesses: ['Trust and Psychological Safety', 'Self-Responsibility'],
      type: 'multiple-choice',
      text: 'You have a high performer who is brilliant but difficult to work with. The team is starting to complain. What\'s your approach?',
      options: [
        'Have a direct conversation with them about the impact of their behavior on the team',
        'Work with the team to develop strategies for collaborating more effectively with this person',
        'Set up a team discussion about working styles and collaboration expectations',
        'Focus on the results they deliver and help the team adapt to their style'
      ],
      followups: {
        insufficient: 'Tell me about a time when you had to balance individual performance with team dynamics.'
      }
    },
    {
      id: 306,
      section: 'behavioral',
      title: 'Unpopular Decisions',
      assesses: ['Self-Responsibility', 'Stakeholder Impact'],
      type: 'open-ended',
      text: 'Tell me about a time when you had to make a decision that you knew would disappoint people you care about.',
      followups: {
        insufficient: 'How do you handle the emotional difficulty of disappointing people while still doing what\'s right?'
      }
    },
    {
      id: 307,
      section: 'behavioral',
      title: 'Direct Feedback',
      assesses: ['Trust and Psychological Safety', 'Continuous Personal Growth'],
      type: 'multiple-choice',
      text: 'You need to give someone feedback that will likely be hard for them to hear, but it\'s important for their growth. How do you approach it?',
      options: [
        'Be direct and clear about the issue while expressing care for their success',
        'Start with positive feedback and gradually work toward the difficult message',
        'Focus on specific behaviors and their impact rather than personal characteristics',
        'Ask them to self-assess first and see if they identify the issue themselves'
      ],
      followups: {
        insufficient: 'How do you overcome your natural desire to avoid causing discomfort when giving tough feedback?'
      }
    },
    {
      id: 308,
      section: 'behavioral',
      title: 'Solo Decision Making',
      assesses: ['Self-Responsibility', 'Self-Awareness'],
      type: 'open-ended',
      text: 'Describe a significant decision you made entirely on your own, without seeking input from others. What was that experience like?',
      followups: {
        insufficient: 'How do you build confidence in your own judgment when you can\'t rely on group consensus?'
      }
    },
    {
      id: 309,
      section: 'behavioral',
      title: 'Conflict Resolution',
      assesses: ['Productive Tension Management', 'Self-Responsibility'],
      type: 'multiple-choice',
      text: 'Two team members are in ongoing conflict that\'s affecting the whole team. They want you to mediate, but previous attempts haven\'t worked. What do you do?',
      options: [
        'Make a clear decision about how they need to work together and hold them accountable to it',
        'Separate their responsibilities so they don\'t have to collaborate as closely',
        'Give them one final chance to resolve it themselves with a clear deadline',
        'Bring in an external mediator or HR to help resolve the conflict'
      ],
      followups: {
        insufficient: 'How do you balance your desire to help people work things out with the need to make tough calls?'
      }
    },
    {
      id: 310,
      section: 'behavioral',
      title: 'Tough Love Leadership',
      assesses: ['Self-Responsibility', 'Culture of Leadership'],
      type: 'open-ended',
      text: 'Tell me about a time when being kind meant being tough - when you had to push someone or set firm boundaries for their own good.',
      followups: {
        insufficient: 'How do you distinguish between being supportive and being enabling? Where do you draw the line?'
      }
    },
    {
      id: 311,
      section: 'behavioral',
      title: 'Leadership Authority',
      assesses: ['Self-Responsibility', 'Empowered/Shared Responsibility'],
      type: 'multiple-choice',
      text: 'Your team is struggling to make progress on a project because they keep seeking consensus on every small decision. How do you help them move forward?',
      options: [
        'Clearly define which decisions require consensus and which can be made individually',
        'Take on more decision-making responsibility yourself to keep things moving',
        'Coach them on how to make decisions more efficiently while maintaining collaboration',
        'Set deadlines for decisions and let them figure out how to meet them'
      ],
      followups: {
        insufficient: 'How do you help collaborative teams learn when to collaborate and when to act independently?'
      }
    }
  ],
  
  'vision-strategic': [
    // Challenge: Focus on operational execution, tactical management, day-to-day details
    {
      id: 401,
      section: 'behavioral',
      title: 'Operational Execution',
      assesses: ['Empowered/Shared Responsibility', 'Self-Responsibility'],
      type: 'multiple-choice',
      text: 'Your strategic vision is clear, but execution is falling short due to operational issues. How do you respond?',
      options: [
        'Dive into the operational details to understand and fix the root causes',
        'Work with team leads to identify and remove specific execution barriers',
        'Adjust the strategy to be more realistic given operational constraints',
        'Bring in additional resources or expertise to improve execution capability'
      ],
      followups: {
        insufficient: 'Tell me about a time when your strategic plans hit operational roadblocks. What did you do?'
      }
    },
    {
      id: 402,
      section: 'behavioral',
      title: 'Tactical Management',
      assesses: ['Productive Tension Management', 'Culture of Leadership'],
      type: 'open-ended',
      text: 'Describe a situation where you had to get involved in day-to-day tactical decisions. How did you balance strategic thinking with tactical needs?',
      followups: {
        insufficient: 'What did you learn about the gap between strategy and tactics? How do you bridge that better now?'
      }
    },
    {
      id: 403,
      section: 'behavioral',
      title: 'Immediate Problem Solving',
      assesses: ['Self-Responsibility', 'Productive Tension Management'],
      type: 'multiple-choice',
      text: 'Your team is facing an urgent operational crisis that requires immediate attention, but it\'s pulling focus from strategic initiatives. How do you handle this?',
      options: [
        'Personally lead the crisis response to ensure it\'s resolved quickly and effectively',
        'Delegate the crisis management while maintaining oversight of strategic progress',
        'Pause strategic work temporarily to ensure the whole team can focus on the crisis',
        'Split the team - some handle the crisis while others continue strategic work'
      ],
      followups: {
        insufficient: 'Tell me about a time when urgent operational needs conflicted with strategic priorities.'
      }
    },
    {
      id: 404,
      section: 'behavioral',
      title: 'Detailed Implementation',
      assesses: ['Empowered/Shared Responsibility', 'Culture of Leadership'],
      type: 'open-ended',
      text: 'Tell me about a time when your strategic vision required you to get much more involved in implementation details than you typically prefer.',
      followups: {
        insufficient: 'What was challenging about that level of detail? How did you ensure you didn\'t lose sight of the bigger picture?'
      }
    },
    {
      id: 405,
      section: 'behavioral',
      title: 'Short-term vs Long-term',
      assesses: ['Self-Responsibility', 'Stakeholder Impact'],
      type: 'multiple-choice',
      text: 'You\'re facing pressure to deliver short-term results that could compromise your long-term strategic vision. How do you navigate this?',
      options: [
        'Find creative ways to deliver short-term wins that still align with long-term strategy',
        'Clearly communicate the trade-offs and advocate strongly for the long-term approach',
        'Deliver the short-term results but create a plan to get back on strategic track',
        'Compromise on the timeline but maintain the integrity of the strategic vision'
      ],
      followups: {
        insufficient: 'Describe a specific time when you faced this tension between short-term and long-term priorities.'
      }
    },
    {
      id: 406,
      section: 'behavioral',
      title: 'Process Improvement',
      assesses: ['Continuous Personal Growth', 'Culture of Leadership'],
      type: 'open-ended',
      text: 'Tell me about a time when you had to dig into the details of how work actually gets done to improve performance.',
      followups: {
        insufficient: 'How do you balance your natural focus on strategy with the need to understand operational details?'
      }
    },
    {
      id: 407,
      section: 'behavioral',
      title: 'Hands-on Leadership',
      assesses: ['Self-Responsibility', 'Empowered/Shared Responsibility'],
      type: 'multiple-choice',
      text: 'Your team is struggling with execution on a critical project. You could step in and help directly, or coach them through it. What do you do?',
      options: [
        'Roll up your sleeves and work alongside them to model the approach',
        'Provide specific guidance and check in frequently on progress',
        'Ask detailed questions to help them identify and solve the problems themselves',
        'Bring in additional resources or expertise to support their execution'
      ],
      followups: {
        insufficient: 'How do you decide when to get hands-on versus when to stay at a higher level?'
      }
    },
    {
      id: 408,
      section: 'behavioral',
      title: 'Execution Accountability',
      assesses: ['Self-Responsibility', 'Productive Tension Management'],
      type: 'open-ended',
      text: 'Describe a time when you had to hold someone accountable for poor execution while maintaining the strategic direction.',
      followups: {
        insufficient: 'How do you balance strategic patience with the need for operational excellence?'
      }
    },
    {
      id: 409,
      section: 'behavioral',
      title: 'Resource Allocation',
      assesses: ['Stakeholder Impact', 'Self-Responsibility'],
      type: 'multiple-choice',
      text: 'You have limited resources and multiple strategic priorities. The team wants clear direction on what to focus on day-to-day. How do you help them?',
      options: [
        'Create detailed prioritization criteria and help them apply it to daily decisions',
        'Set clear quarterly goals and let them figure out the daily prioritization',
        'Establish regular check-ins to help them navigate competing priorities',
        'Delegate priority-setting to team leads who are closer to the operational details'
      ],
      followups: {
        insufficient: 'How do you translate strategic priorities into actionable daily guidance for your team?'
      }
    },
    {
      id: 410,
      section: 'behavioral',
      title: 'Quality vs Speed',
      assesses: ['Productive Tension Management', 'Stakeholder Impact'],
      type: 'open-ended',
      text: 'Tell me about a time when you had to make trade-offs between the quality of execution and the speed of delivery.',
      followups: {
        insufficient: 'How do you help your team make these trade-offs when you\'re naturally focused on the bigger picture?'
      }
    },
    {
      id: 411,
      section: 'behavioral',
      title: 'Operational Metrics',
      assesses: ['Self-Responsibility', 'Culture of Leadership'],
      type: 'multiple-choice',
      text: 'Your strategic goals are clear, but you\'re not sure if the day-to-day work is actually moving you toward them. How do you get better visibility?',
      options: [
        'Implement detailed tracking and reporting on operational metrics',
        'Spend more time observing and participating in day-to-day work',
        'Create regular review processes that connect daily work to strategic outcomes',
        'Ask team members to regularly report on how their work connects to strategy'
      ],
      followups: {
        insufficient: 'How do you stay connected to operational reality without getting lost in the details?'
      }
    }
  ]
};

// Leadership Style Analysis Function
export function determineLeadershipStyle(answers: string[]): LeadershipStyleType {
  const scores: Record<LeadershipStyleType, number> = {
    'analytical-reflective': 0,
    'action-oriented': 0,
    'collaborative-relational': 0,
    'vision-strategic': 0
  };

  // Score based on selected options (each option maps to a leadership style)
  answers.forEach((answer, questionIndex) => {
    const question = STYLE_DETECTION_QUESTIONS[questionIndex];
    if (question && question.options) {
      const optionIndex = question.options.indexOf(answer);
      if (optionIndex >= 0) {
        // Each option corresponds to a leadership style (0=analytical, 1=action, 2=collaborative, 3=vision)
        const styles: LeadershipStyleType[] = ['analytical-reflective', 'action-oriented', 'collaborative-relational', 'vision-strategic'];
        const selectedStyle = styles[optionIndex];
        if (selectedStyle) {
          scores[selectedStyle] += 1;
        }
      }
    }
  });

  // Return the style with the highest score (with tie-breaking)
  const maxScore = Math.max(...Object.values(scores));
  const topStyles = Object.entries(scores).filter(([_, score]) => score === maxScore);
  
  // If there's a tie, return the first one (could add more sophisticated tie-breaking)
  return topStyles[0][0] as LeadershipStyleType;
}

// Get questions for a specific leadership style
export function getQuestionsForStyle(style: LeadershipStyleType): FrameworkQuestion[] {
  return LEADERSHIP_STYLE_QUESTIONS[style] || [];
}

// Leadership Style Descriptions
export const LEADERSHIP_STYLE_DESCRIPTIONS: Record<LeadershipStyleType, { 
  name: string; 
  description: string; 
  strengths: string[]; 
  growthAreas: string[] 
}> = {
  'analytical-reflective': {
    name: 'Analytical-Reflective Leader',
    description: 'You approach leadership with thoughtfulness and careful consideration. You value input from others and take time to reflect on decisions.',
    strengths: ['Thoughtful decision-making', 'Learning orientation', 'Self-reflection', 'Risk assessment'],
    growthAreas: ['Speed of decision-making', 'Action bias', 'Leading through uncertainty', 'Quick pivots']
  },
  'action-oriented': {
    name: 'Action-Oriented Leader', 
    description: 'You lead with decisiveness and bias toward action. You\'re comfortable making quick decisions and adjusting course as needed.',
    strengths: ['Decisiveness', 'Speed of execution', 'Risk tolerance', 'Results focus'],
    growthAreas: ['Stakeholder input', 'Collaborative decision-making', 'Reflection and learning', 'Building consensus']
  },
  'collaborative-relational': {
    name: 'Collaborative-Relational Leader',
    description: 'You lead through relationships and collaboration. You value team input and focus on building consensus and psychological safety.',
    strengths: ['Team building', 'Stakeholder management', 'Inclusive decision-making', 'Relationship focus'],
    growthAreas: ['Independent decision-making', 'Difficult conversations', 'Performance accountability', 'Speed when needed']
  },
  'vision-strategic': {
    name: 'Vision-Strategic Leader',
    description: 'You lead with a focus on the big picture and long-term strategy. You excel at communicating vision and aligning teams around strategic goals.',
    strengths: ['Strategic thinking', 'Vision communication', 'Long-term planning', 'Systems thinking'],
    growthAreas: ['Operational execution', 'Tactical management', 'Day-to-day details', 'Immediate problem-solving']
  }
};
