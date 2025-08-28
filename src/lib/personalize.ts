import { assessmentSections, matchesTargeting, renderTemplate } from '@/config/assessment';
import type { Profile, Question } from '@/config/assessment';

export type ConcreteQuestion = {
  question: string;
  type: Question['type'];
  options?: string[];
  scale_info?: Question['scale_info'];
  aiRewrite?: boolean;
};

export function buildPersonalizedQuestions(profile: Profile): ConcreteQuestion[] {
  const out: ConcreteQuestion[] = [];
  for (const section of assessmentSections) {
    for (const q of section.questions) {
      if (!matchesTargeting(profile, q.targeting)) continue;
      out.push({
        question: renderTemplate(q.template, profile),
        type: q.type,
        options: q.options,
        scale_info: q.scale_info,
        aiRewrite: q.aiRewrite,
      });
    }
  }
  return out;
}


