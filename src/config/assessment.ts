export type Profile = {
  position: string;
  role: string;
  teamSize: number;
  motivation: string;
};

export type Question = {
  template: string;
  type: 'multiple-choice' | 'open-ended' | 'scale';
  options?: string[];
  scale_info?: {
    min: number;
    max: number;
    min_label: string;
    max_label: string;
  };
  targeting?: any;
  aiRewrite?: boolean;
};

export type AssessmentSection = {
  questions: Question[];
};

export const assessmentSections: AssessmentSection[] = [
  {
    questions: [
      {
        template: "What is your biggest leadership challenge right now?",
        type: "open-ended",
        targeting: {}
      },
      {
        template: "How do you handle difficult conversations with team members?",
        type: "multiple-choice",
        options: [
          "I prepare thoroughly and address issues directly",
          "I try to find common ground first",
          "I involve HR or other stakeholders",
          "I wait for the right moment and setting"
        ],
        targeting: {}
      }
    ]
  }
];

export const matchesTargeting = (profile: Profile, targeting: any): boolean => {
  // Simple implementation - always return true for now
  return true;
};

export const renderTemplate = (template: string, profile: Profile): string => {
  // Simple implementation - return template as is for now
  return template;
};

export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};
