import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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
        const { data: evalRows, error: evalErr } = await supabase
          .from('evaluations')
          .select('data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (evalErr) throw evalErr;
        const payload = (evalRows?.[0]?.data as EvaluationData) || null;
        setData(payload);
      } catch (e: any) {
        setError(e.message || 'Failed to load evaluation');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const frameworks = data?.frameworks || [];

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
          </>
        )}

        {!loading && !error && !data && (
          <p className="text-sm text-muted-foreground">No evaluation found yet. Complete an assessment to generate your evaluation.</p>
        )}
      </div>
    </div>
  );
}


