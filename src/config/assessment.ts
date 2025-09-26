export type Profile = {
  position: string;
  role: string;
  teamSize: number;
  motivation: string;
  industry?: string;
  experience?: string;
  challenges?: string;
};

export type Question = {
  template: string;
  type: 'multiple-choice' | 'open-ended' | 'scale' | 'most-least-choice';
  options?: string[];
  most_least_options?: string[];
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
      },
      {
        template: "When facing a leadership challenge, which approach resonates most and least with you?",
        type: "most-least-choice",
        most_least_options: [
          "Take immediate decisive action based on available information",
          "Gather input from multiple stakeholders before deciding",
          "Analyze past similar situations for guidance",
          "Trust your intuition and experience",
          "Focus on potential long-term consequences"
        ],
        targeting: {}
      }
    ]
  }
];

export const matchesTargeting = (_profile: Profile, _targeting: any): boolean => {
  // Simple implementation - always return true for now
  return true;
};

export const renderTemplate = (template: string, _profile: Profile): string => {
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
