import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

type FrameworkScore = {
  key: string;
  label: string;
  score: number; // 0-100
  summary?: string;
};

interface EvaluationData {
  frameworks: FrameworkScore[];
  overall?: {
    persona?: string;
    summary?: string;
  };
}

export default function Evaluation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EvaluationData | null>(null);
  const [improvementsDone, setImprovementsDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        if (!userId) {
          setError('You need to sign in to view your evaluation.');
          setLoading(false);
          return;
        }
        // Since there's no evaluations table, derive evaluation from messages
        let payload: EvaluationData | null = null;

        // If no payload or scores look empty, derive a basic scoring from the latest conversation
        const allZero = !payload || !payload.frameworks || payload.frameworks.every(f => (f.score ?? 0) === 0);
        if (allZero) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();
          if (conv?.id) {
            const { data: msgs } = await supabase
              .from('messages')
              .select('message_type, content, question_type, created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: true });
            payload = deriveEvaluationFromMessages(msgs || []);
          }
        }

        setData(payload);
      } catch (e: any) {
        setError(e.message || 'Failed to load evaluation');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const frameworks = data?.frameworks || [];

  const chartData = useMemo(() =>
    frameworks.map(f => ({ name: f.label.split(' ')[0], score: Math.round(f.score) })),
    [frameworks]
  );

  const lowestThree = useMemo(() => {
    return [...frameworks].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 3);
  }, [frameworks]);

  function toggleImprovement(key: string) {
    setImprovementsDone(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Leadership Evaluation</h1>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && data && (
          <>
            {data.overall && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-xl">Overall Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.overall.persona && (
                    <div className="mb-2"><span className="font-semibold">Persona:</span> {data.overall.persona}</div>
                  )}
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{data.overall.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Overview chart */}
            {frameworks.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Score Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: any) => `${v}%`} />
                        <Bar dataKey="score" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {frameworks.map(fr => (
                <Card key={fr.key}>
                  <CardHeader>
                    <CardTitle className="text-base">{fr.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span>Score</span>
                      <span className="font-medium">{Math.round(fr.score)}%</span>
                    </div>
                    <Progress value={Math.max(0, Math.min(100, fr.score))} />
                    {fr.summary && (
                      <p className="text-xs text-muted-foreground mt-3 whitespace-pre-line">{fr.summary}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Growth Opportunities */}
            {lowestThree.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Growth Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Areas with the most potential for improvement and suggested next steps.</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {lowestThree.map(fr => (
                      <div key={fr.key} className={`rounded-lg border p-4 ${improvementsDone[fr.key] ? 'opacity-80' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">{fr.label}</div>
                          <button
                            className={`text-xs px-2 py-1 rounded border ${improvementsDone[fr.key] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'hover:bg-muted'}`}
                            onClick={() => toggleImprovement(fr.key)}
                          >
                            {improvementsDone[fr.key] ? 'Marked' : 'Mark as done'}
                          </button>
                        </div>
                        <ul className="text-xs list-disc pl-4 space-y-1 text-muted-foreground">
                          {defaultSuggestions(fr.key).map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!loading && !error && !data && (
          <p className="text-sm text-muted-foreground">No evaluation found yet. Complete an assessment to generate your evaluation.</p>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---
const FRAMEWORKS = [
  { key: 'self_awareness', label: 'Self‑Awareness' },
  { key: 'self_responsibility', label: 'Self‑Responsibility' },
  { key: 'growth', label: 'Continuous Personal Growth' },
  { key: 'psych_safety', label: 'Trust & Psychological Safety' },
  { key: 'empathy', label: 'Empathy & Awareness of Others' },
  { key: 'shared_resp', label: 'Empowered & Shared Responsibility' },
  { key: 'purpose', label: 'Purpose, Vision & Outcomes' },
  { key: 'culture', label: 'Culture of Leadership' },
  { key: 'tensions', label: 'Harnessing Tensions for Collaboration' },
  { key: 'stakeholders', label: 'Positive Impact on Stakeholders' },
  { key: 'change', label: 'Embracing Change & Innovation' },
  { key: 'stewardship', label: 'Social & Ethical Stewardship' }
];

const KEYWORDS: Record<string, string[]> = {
  self_awareness: ['self-awareness', 'reflect', 'reflection', 'strength', 'weakness'],
  self_responsibility: ['responsibility', 'accountability', 'ownership'],
  growth: ['growth', 'learn', 'learning', 'develop'],
  psych_safety: ['psychological', 'safety', 'trust', 'safe space'],
  empathy: ['empathy', 'others', 'listening', 'listen'],
  shared_resp: ['shared', 'empowered', 'delegat'],
  purpose: ['purpose', 'vision', 'outcome', 'goal'],
  culture: ['culture', 'values', 'norms'],
  tensions: ['tension', 'conflict', 'collaboration', 'challenge'],
  stakeholders: ['stakeholder', 'impact', 'community', 'customer'],
  change: ['change', 'innovation', 'experiment', 'iterate'],
  stewardship: ['social', 'ethical', 'stewardship', 'responsible']
};

function mapQuestionToFramework(questionText: string): string | null {
  const q = (questionText || '').toLowerCase();
  for (const fw of FRAMEWORKS) {
    const keys = KEYWORDS[fw.key] || [];
    if (keys.some(k => q.includes(k))) return fw.key;
  }
  return null;
}

function parseScaleAnswer(content: string): number | null {
  const m = content?.match(/(\d{1,2})\s*out\s*of\s*10/i);
  if (!m) return null;
  const raw = parseInt(m[1], 10);
  if (Number.isNaN(raw)) return null;
  return Math.max(0, Math.min(100, Math.round((raw / 10) * 100)));
}

function deriveEvaluationFromMessages(msgs: Array<{ message_type: string; content: string; question_type: string | null; created_at: string }>): EvaluationData {
  const scores: Record<string, number[]> = {};
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.message_type === 'bot' && m.question_type === 'scale') {
      const frameworkKey = mapQuestionToFramework(m.content || '') || FRAMEWORKS[i % FRAMEWORKS.length].key;
      // Find the next user response
      const next = msgs.slice(i + 1).find(x => x.message_type === 'user');
      const val = next ? parseScaleAnswer(next.content || '') : null;
      if (val !== null) {
        (scores[frameworkKey] ||= []).push(val);
      }
    }
  }

  // Build framework array with averaged or default scores
  const frameworkScores: FrameworkScore[] = FRAMEWORKS.map(fw => {
    const arr = scores[fw.key] || [];
    const avg = arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 60;
    return { key: fw.key, label: fw.label, score: avg };
  });

  // Overall persona: the highest scoring framework's label
  const top = [...frameworkScores].sort((a, b) => b.score - a.score)[0];
  const overall = {
    persona: top ? `${top.label.split(' ')[0]}-led Leader` : undefined,
    summary: 'Assessment completed. Detailed scoring will be generated by the assistant.'
  };

  return { frameworks: frameworkScores, overall };
}

function defaultSuggestions(key: string): string[] {
  switch (key) {
    case 'psych_safety':
      return ['Open meetings by inviting concerns and questions', 'Commit to 1:1 feedback every two weeks', 'Celebrate attempts, not just outcomes'];
    case 'empathy':
      return ['Use active listening (reflect back, clarify)', 'Shadow a teammate for a day', 'Run a short empathy-mapping exercise'];
    case 'self_awareness':
      return ['Keep a weekly reflection journal', 'Ask a peer for blind-spot feedback', 'Define 1 growth area for the next sprint'];
    case 'shared_resp':
      return ['Delegate a decision with clear guardrails', 'Pair a junior lead with you for a project', 'Document RACI for a key workflow'];
    case 'purpose':
      return ['Revisit quarterly OKRs with the team', 'Write a 1-paragraph vision for a project', 'Define 3 measurable outcomes'];
    case 'change':
      return ['Pilot a small experiment this week', 'Timebox a spike for a risky idea', 'Retrospect experiments openly'];
    default:
      return ['Schedule one action this week', 'Share intent with the team', 'Review progress in one week'];
  }
}

