export type QuestionType = 'multiple-choice' | 'open-ended' | 'scale';

export type Profile = {
  position: string;
  role: string;
  teamSize: number;
  motivation?: string;
};

export type Targeting = {
  roles?: string[];
  positions?: string[];
  minTeam?: number;
  maxTeam?: number;
};

export type Question = {
  type: QuestionType;
  template: string;
  options?: string[];
  scale_info?: { min: number; max: number; min_label: string; max_label: string };
  targeting?: Targeting;
  aiRewrite?: boolean;
};

export type AssessmentSection = {
  id: string;
  title: string;
  questions: Question[];
};

export const assessmentSections: AssessmentSection[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    questions: [
      {
        type: 'multiple-choice',
        template: 'What motivates you most as a leader in {role}?',
        options: [
          'Seeing my team members grow and succeed',
          'Achieving challenging goals and targets',
          'Creating positive change in the organization',
          'Building strong relationships and trust',
          'Solving complex problems and making strategic decisions',
        ],
        targeting: { roles: ['Operations', 'Product', 'Sales'] },
      },
      {
        type: 'multiple-choice',
        template: 'When making important decisions in your {position} role, what approach do you typically take?',
        options: [
          'Gather input from my team and decide collaboratively',
          'Analyze data thoroughly before making a decision',
          'Trust my instincts and experience to guide me',
          'Consult with mentors or senior leadership first',
          'Consider the long-term impact on all stakeholders',
        ],
      },
    ],
  },
  {
    id: 'situational',
    title: 'Situational Leadership',
    questions: [
      { type: 'open-ended', template: 'What leadership challenges are you currently facing leading a team of {teamSize}?', targeting: { minTeam: 5 } },
      { type: 'open-ended', template: 'How do you typically handle conflict within your team?' },
      { type: 'open-ended', template: 'Describe a time when you had to make a difficult decision as a leader.', aiRewrite: true },
    ],
  },
  {
    id: 'effectiveness',
    title: 'Effectiveness & Growth',
    questions: [
      { type: 'open-ended', template: 'How do you measure your effectiveness as a leader?' },
      { type: 'open-ended', template: 'Which leadership skills do you feel you need to develop further?' },
      { type: 'open-ended', template: 'How do you handle giving feedback to team members?' },
    ],
  },
  {
    id: 'emotional',
    title: 'Emotional Intelligence & Adaptability',
    questions: [
      { type: 'open-ended', template: 'What role does emotional intelligence play in your leadership style?' },
      { type: 'open-ended', template: 'How do you adapt your leadership approach for different team members?' },
    ],
  },
];

export const renderTemplate = (tpl: string, p: Profile) =>
  tpl
    .replaceAll('{role}', p.role || '')
    .replaceAll('{position}', p.position || '')
    .replaceAll('{teamSize}', String(p.teamSize ?? ''));

export const matchesTargeting = (p: Profile, t?: Targeting) => {
  if (!t) return true;
  if (t.roles && t.roles.length && !t.roles.some((r) => r.toLowerCase() === (p.role || '').toLowerCase())) return false;
  if (t.positions && t.positions.length && !t.positions.some((pos) => pos.toLowerCase() === (p.position || '').toLowerCase())) return false;
  if (typeof t.minTeam === 'number' && p.teamSize < t.minTeam) return false;
  if (typeof t.maxTeam === 'number' && p.teamSize > t.maxTeam) return false;
  return true;
};

export const flattenQuestions = (sections: AssessmentSection[]) => sections.flatMap((s) => s.questions);
export const totalQuestionsFromSections = (sections: AssessmentSection[]) =>
  sections.reduce((sum, s) => sum + s.questions.length, 0);


