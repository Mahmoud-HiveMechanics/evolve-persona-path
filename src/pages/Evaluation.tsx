import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { FrameworkScore, EvaluationData, toErrorWithMessage } from '@/types/shared';

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
      } catch (e: unknown) {
        setError(toErrorWithMessage(e).message);
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-muted/20">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-lg text-text-secondary">Analyzing your leadership profile...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
              <p className="text-red-600 text-lg">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-5xl lg:text-6xl font-bold text-text-primary mb-6">
                Your Leadership <span className="text-primary">Profile</span>
              </h1>
              {data.overall?.persona && (
                <div className="inline-block bg-gradient-to-r from-primary to-primary/80 text-white px-8 py-4 rounded-2xl text-xl font-semibold shadow-lg">
                  {data.overall.persona}
                </div>
              )}
            </div>

            {/* Overall Summary */}
            {data.overall && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 mb-12 shadow-lg border border-primary/10">
                <div className="max-w-4xl mx-auto text-center">
                  <h2 className="text-3xl font-bold text-text-primary mb-6">Your Leadership Journey</h2>
                  <p className="text-xl text-text-secondary leading-relaxed">{data.overall.summary}</p>
                </div>
              </div>
            )}

            {/* Overview chart */}
            {frameworks.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 mb-12 shadow-lg border border-primary/10">
                <h2 className="text-3xl font-bold text-text-primary text-center mb-8">Leadership Framework Scores</h2>
                <div className="h-80 mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 20 }}>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: '#6B7280' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fontSize: 12, fill: '#6B7280' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        formatter={(v: any) => [`${v}%`, 'Score']} 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid #E5E7EB', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="score" 
                        fill="url(#barGradient)" 
                        radius={[8, 8, 0, 0]} 
                      />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Framework Scores Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {frameworks.map((fr, index) => {
                const score = Math.round(fr.score);
                const isHighScore = score >= 80;
                const isMediumScore = score >= 60;
                
                return (
                  <div key={fr.key} className="group">
                    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                      isHighScore ? 'border-green-200 bg-green-50/50' : 
                      isMediumScore ? 'border-yellow-200 bg-yellow-50/50' : 
                      'border-red-200 bg-red-50/50'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-text-primary text-lg">{fr.label}</h3>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          isHighScore ? 'bg-green-500' : 
                          isMediumScore ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}>
                          {score}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <Progress 
                          value={Math.max(0, Math.min(100, fr.score))} 
                          className="h-3"
                        />
                      </div>
                      
                      {fr.summary && (
                        <p className="text-sm text-text-secondary leading-relaxed">{fr.summary}</p>
                      )}
                      
                      <div className="mt-4 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          isHighScore ? 'bg-green-500' : 
                          isMediumScore ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium text-text-secondary">
                          {isHighScore ? 'Strong' : isMediumScore ? 'Developing' : 'Growth Area'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Growth Opportunities */}
            {lowestThree.length > 0 && (
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-white rounded-3xl p-8 shadow-lg border border-primary/20">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-text-primary mb-4">Your Growth <span className="text-primary">Opportunities</span></h2>
                  <p className="text-xl text-text-secondary max-w-3xl mx-auto">
                    Focus on these areas to accelerate your leadership development and maximize your impact.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {lowestThree.map((fr, index) => (
                    <div key={fr.key} className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-primary/10 transition-all duration-300 hover:shadow-xl ${improvementsDone[fr.key] ? 'opacity-75 scale-95' : 'hover:scale-105'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <h3 className="font-bold text-text-primary text-lg">{fr.label}</h3>
                        </div>
                        <button
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                            improvementsDone[fr.key] 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-white'
                          }`}
                          onClick={() => toggleImprovement(fr.key)}
                        >
                          {improvementsDone[fr.key] ? '✓ Done' : 'Mark Done'}
                        </button>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-sm text-text-secondary mb-2">Current Score: {Math.round(fr.score)}%</div>
                        <Progress value={fr.score} className="h-2" />
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold text-text-primary">Action Steps:</h4>
                        <ul className="space-y-2">
                          {defaultSuggestions(fr.key).map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* WhatsApp Coaching CTA */}
                <div className="text-center mt-8">
                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 shadow-lg">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-text-primary">Accelerate Your Growth</h3>
                        <p className="text-sm text-text-secondary">Get personal coaching on WhatsApp</p>
                      </div>
                    </div>
                    
                    <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
                      Ready to turn these insights into real leadership growth? Our AI coach provides personalized guidance, 
                      weekly check-ins, and accountability to help you develop these areas systematically.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <button
                        onClick={() => {
                          const topGrowthAreas = lowestThree.map(f => f.label).join(', ');
                          const message = encodeURIComponent(`Hi! I just viewed my EVOLVE Leadership evaluation and I'd like personal coaching to develop my growth areas: ${topGrowthAreas}. Can you help me create a development plan?`);
                          window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
                        }}
                        className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                        </svg>
                        Get Personal Coaching
                      </button>
                      
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <div className="flex text-yellow-400">
                          {'★'.repeat(5)}
                        </div>
                        <span>500+ leaders coached</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <p className="text-xs text-text-secondary">
                        💬 Instant responses • 📈 Weekly progress tracking • 🎯 Personalized action plans
                      </p>
                    </div>
                  </div>
                  
                  <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-md mt-6">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-text-secondary">Focus on one area at a time for maximum impact</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !data && (
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-lg border border-primary/10">
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white">📊</span>
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-4">No Evaluation Yet</h2>
              <p className="text-xl text-text-secondary mb-8">
                Complete your leadership assessment to generate your personalized evaluation and growth plan.
              </p>
              <a 
                href="/assessment" 
                className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Start Assessment
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
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
  // Extract user responses and basic info
  const userResponses = msgs.filter(m => m.message_type === 'user').map(m => m.content.toLowerCase());
  const basicInfo = extractBasicInfo(msgs);
  
  // Analyze responses using intelligent scoring
  const frameworkScores: FrameworkScore[] = FRAMEWORKS.map(fw => {
    const score = calculateFrameworkScore(fw.key, userResponses, basicInfo);
    const summary = generateFrameworkSummary(fw.key, score, userResponses, basicInfo);
    return { 
      key: fw.key, 
      label: fw.label, 
      score: Math.round(score),
      summary 
    };
  });

  // Generate persona and overall summary
  const { persona, summary } = generatePersonalizedSummary(frameworkScores, basicInfo, userResponses);

  return { 
    frameworks: frameworkScores, 
    overall: { persona, summary }
  };
}

function extractBasicInfo(msgs: Array<{ message_type: string; content: string; question_type: string | null; created_at: string }>) {
  // Look for basic info in the conversation history
  const firstBotMessage = msgs.find(m => m.message_type === 'bot');
  const basicInfoPattern = /Position:\s*([^,]+),?\s*Role:\s*([^,]+),?\s*Team size:\s*([^,]+),?\s*Motivation:\s*([^.]+)/i;
  
  if (firstBotMessage) {
    const match = firstBotMessage.content.match(basicInfoPattern);
    if (match) {
      return {
        position: match[1]?.trim() || '',
        role: match[2]?.trim() || '',
        teamSize: match[3]?.trim() || '',
        motivation: match[4]?.trim() || ''
      };
    }
  }
  
  return { position: '', role: '', teamSize: '', motivation: '' };
}

function calculateFrameworkScore(frameworkKey: string, responses: string[], basicInfo: any): number {
  let baseScore = 50; // Start with neutral
  let responseCount = 0;
  
  // Analyze each response for framework-specific indicators
  responses.forEach(response => {
    if (response.length < 10) return; // Skip very short responses
    
    responseCount++;
    const indicators = getFrameworkIndicators(frameworkKey);
    let responseScore = 50;
    
    // Positive indicators
    indicators.positive.forEach(indicator => {
      if (response.includes(indicator.toLowerCase())) {
        responseScore += indicator.length > 8 ? 15 : 10; // Longer phrases = higher weight
      }
    });
    
    // Negative indicators
    indicators.negative.forEach(indicator => {
      if (response.includes(indicator.toLowerCase())) {
        responseScore -= 10;
      }
    });
    
    // Response quality bonus
    if (response.length > 100) responseScore += 5; // Detailed responses
    if (response.split(' ').length > 20) responseScore += 5; // Thoughtful responses
    
    baseScore = (baseScore + responseScore) / 2; // Average with existing
  });
  
  // Experience modifier based on basic info
  baseScore += getExperienceModifier(frameworkKey, basicInfo);
  
  // Team size modifier
  baseScore += getTeamSizeModifier(frameworkKey, basicInfo.teamSize);
  
  // Role modifier  
  baseScore += getRoleModifier(frameworkKey, basicInfo.role);
  
  // Ensure score is within bounds and add some realistic variance
  const finalScore = Math.max(25, Math.min(95, baseScore + (Math.random() * 10 - 5)));
  return finalScore;
}

function getFrameworkIndicators(frameworkKey: string) {
  const indicators: Record<string, { positive: string[], negative: string[] }> = {
    self_awareness: {
      positive: ['reflect', 'strengths', 'weaknesses', 'feedback', 'self-assessment', 'aware of', 'recognize', 'understand myself'],
      negative: ['not sure', 'don\'t know', 'never thought', 'not aware']
    },
    self_responsibility: {
      positive: ['take responsibility', 'accountable', 'ownership', 'my fault', 'i should', 'take charge', 'lead by example'],
      negative: ['not my fault', 'blame others', 'can\'t control', 'not responsible']
    },
    growth: {
      positive: ['learn', 'develop', 'improve', 'grow', 'training', 'courses', 'mentor', 'feedback', 'skill building'],
      negative: ['don\'t need', 'already know', 'waste of time', 'not interested']
    },
    psych_safety: {
      positive: ['safe space', 'trust', 'open communication', 'psychological safety', 'speak up', 'comfortable', 'support'],
      negative: ['afraid to speak', 'fear', 'intimidating', 'not safe', 'worried about']
    },
    empathy: {
      positive: ['listen', 'understand others', 'perspective', 'feelings', 'empathy', 'care about', 'support team'],
      negative: ['don\'t care', 'not my problem', 'just get work done', 'emotions don\'t matter']
    },
    shared_resp: {
      positive: ['delegate', 'empower', 'shared responsibility', 'team decisions', 'involve others', 'collaborate'],
      negative: ['do everything myself', 'can\'t trust others', 'micromanage', 'control everything']
    },
    purpose: {
      positive: ['vision', 'purpose', 'goals', 'mission', 'why we do', 'meaningful', 'impact', 'outcomes'],
      negative: ['just a job', 'don\'t see point', 'unclear goals', 'no direction']
    },
    culture: {
      positive: ['culture', 'values', 'team spirit', 'belonging', 'inclusive', 'positive environment'],
      negative: ['toxic', 'bad culture', 'don\'t fit in', 'negative environment']
    },
    tensions: {
      positive: ['resolve conflict', 'manage tensions', 'find solutions', 'mediate', 'bring together', 'collaboration'],
      negative: ['avoid conflict', 'can\'t handle', 'makes me uncomfortable', 'not good with']
    },
    stakeholders: {
      positive: ['stakeholders', 'customers', 'community', 'impact', 'external', 'broader picture'],
      negative: ['only care about team', 'not my concern', 'internal focus only']
    },
    change: {
      positive: ['adapt', 'change', 'innovation', 'experiment', 'try new', 'flexible', 'embrace'],
      negative: ['resist change', 'stick to old ways', 'don\'t like change', 'too risky']
    },
    stewardship: {
      positive: ['ethical', 'responsible', 'sustainable', 'social impact', 'doing right', 'moral'],
      negative: ['just business', 'profit only', 'don\'t care about ethics']
    }
  };
  
  return indicators[frameworkKey] || { positive: [], negative: [] };
}

function getExperienceModifier(frameworkKey: string, basicInfo: any): number {
  const position = basicInfo.position.toLowerCase();
  const isLeader = position.includes('director') || position.includes('manager') || position.includes('lead') || position.includes('head');
  const isSenior = position.includes('senior') || position.includes('principal') || position.includes('chief');
  
  if (isSenior) return 8;
  if (isLeader) return 5;
  return 0;
}

function getTeamSizeModifier(frameworkKey: string, teamSize: string): number {
  const size = parseInt(teamSize) || 0;
  const leadershipFrameworks = ['shared_resp', 'psych_safety', 'culture', 'tensions'];
  
  if (leadershipFrameworks.includes(frameworkKey)) {
    if (size > 20) return 10; // Large teams = more experience with these
    if (size > 10) return 5;
    if (size > 5) return 2;
    if (size < 3) return -5; // Small teams = less experience
  }
  
  return 0;
}

function getRoleModifier(frameworkKey: string, role: string): number {
  const roleStr = role.toLowerCase();
  const modifiers: Record<string, Record<string, number>> = {
    operations: { self_responsibility: 5, purpose: 5, stakeholders: 3 },
    engineering: { growth: 5, change: 8, tensions: 3 },
    hr: { empathy: 8, psych_safety: 8, culture: 8 },
    sales: { stakeholders: 8, empathy: 5, purpose: 3 },
    marketing: { stakeholders: 5, purpose: 5, change: 5 },
    finance: { self_responsibility: 5, stewardship: 5, purpose: 3 }
  };
  
  for (const [roleKey, frameworkMods] of Object.entries(modifiers)) {
    if (roleStr.includes(roleKey)) {
      return frameworkMods[frameworkKey] || 0;
    }
  }
  
  return 0;
}

function generateFrameworkSummary(frameworkKey: string, score: number, responses: string[], basicInfo: any): string {
  const templates: Record<string, { high: string, medium: string, low: string }> = {
    self_awareness: {
      high: "You demonstrate strong self-awareness, regularly reflecting on your strengths and areas for growth. This foundation enables authentic leadership.",
      medium: "You show good self-awareness but could benefit from more structured reflection and seeking feedback from others.",
      low: "Developing greater self-awareness through reflection and feedback will significantly enhance your leadership effectiveness."
    },
    growth: {
      high: "You have a strong growth mindset and actively pursue learning opportunities. This commitment to development sets a powerful example.",
      medium: "You value growth and learning, though you could be more systematic in your development approach.",
      low: "Embracing continuous learning and development will be crucial for your leadership journey and team inspiration."
    }
    // Add more templates as needed...
  };
  
  const template = templates[frameworkKey];
  if (!template) return "Your responses show engagement with this leadership area.";
  
  if (score >= 75) return template.high;
  if (score >= 50) return template.medium;
  return template.low;
}

function generatePersonalizedSummary(frameworks: FrameworkScore[], basicInfo: any, responses: string[]): { persona: string, summary: string } {
  // Find top 3 frameworks
  const sortedFrameworks = [...frameworks].sort((a, b) => b.score - a.score);
  const top3 = sortedFrameworks.slice(0, 3);
  const bottom3 = sortedFrameworks.slice(-3);
  
  // Generate persona based on top framework and role
  const topFramework = top3[0];
  const persona = generatePersona(topFramework, basicInfo);
  
  // Generate summary
  const avgScore = Math.round(frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length);
  const teamSizeNum = parseInt(basicInfo.teamSize) || 0;
  
  let summary = `Based on your assessment responses, you demonstrate ${avgScore >= 70 ? 'strong' : avgScore >= 50 ? 'developing' : 'emerging'} leadership capabilities. `;
  
  summary += `As a ${basicInfo.position} in ${basicInfo.role} leading ${teamSizeNum > 0 ? `a team of ${basicInfo.teamSize}` : 'your role'}, your strongest areas are `;
  summary += `${top3.map(f => f.label).join(', ')}. `;
  
  if (basicInfo.motivation) {
    summary += `Your motivation to ${basicInfo.motivation.toLowerCase()} aligns well with your leadership profile. `;
  }
  
  summary += `Focus on developing ${bottom3[0].label} and ${bottom3[1].label} to become an even more well-rounded leader.`;
  
  return { persona, summary };
}

function generatePersona(topFramework: FrameworkScore, basicInfo: any): string {
  const personaMap: Record<string, string> = {
    self_awareness: "Reflective Leader",
    self_responsibility: "Accountable Leader", 
    growth: "Growth-Oriented Leader",
    psych_safety: "Trust-Building Leader",
    empathy: "People-First Leader",
    shared_resp: "Collaborative Leader",
    purpose: "Vision-Driven Leader",
    culture: "Culture-Shaping Leader",
    tensions: "Conflict-Resolving Leader",
    stakeholders: "Impact-Focused Leader",
    change: "Adaptive Leader",
    stewardship: "Ethical Leader"
  };
  
  return personaMap[topFramework.key] || "Emerging Leader";
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

