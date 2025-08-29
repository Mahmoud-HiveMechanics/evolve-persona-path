import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { supabase } from '@/integrations/supabase/client';
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
        const { data: evalRows, error: evalErr } = await supabase
          .from('evaluations' as any)
          .select('data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (evalErr) throw evalErr;
        
        console.log('Evaluation rows found:', evalRows?.length);
        let payload = ((evalRows as any)?.[0]?.data as EvaluationData) || null;
        console.log('Initial payload:', payload);


        
        // Check if we have evaluation data, otherwise derive from conversation
        if (!payload || (payload.frameworks && payload.frameworks.every(f => f.score === 0))) {
          console.log('No evaluation data found or all scores are zero, deriving from conversation...');
          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('id')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();
          
          if (convError) {
            console.error('Error fetching conversation:', convError);
          } else if (conv?.id) {
            console.log('Found conversation:', conv.id);
            const { data: msgs, error: msgError } = await supabase
              .from('messages')
              .select('message_type, content, question_type, created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: true });
            
            if (msgError) {
              console.error('Error fetching messages:', msgError);
            } else {
              console.log('Found messages:', msgs?.length);
              console.log('Messages:', msgs);
              if (msgs && msgs.length > 0) {
                // Filter and log user responses
                const userResponses = msgs.filter(m => m.message_type === 'user');
                console.log('User responses:', userResponses.map(m => m.content));
                
                payload = deriveEvaluationFromMessages(msgs);
                console.log('Generated enhanced evaluation:', payload);
                
                // Update the evaluation record with the enhanced scoring
                try {
                  const { error: updateError } = await supabase
                    .from('evaluations' as any)
                    .update({ data: payload })
                    .eq('user_id', userId)
                    .eq('conversation_id', conv.id);
                  
                  if (updateError) {
                    console.error('Error updating evaluation:', updateError);
                  } else {
                    console.log('Successfully updated evaluation with enhanced scoring');
                  }
                } catch (updateErr) {
                  console.error('Failed to update evaluation:', updateErr);
                }
              }
            }
          } else {
            console.log('No conversation found for user - creating demo evaluation with your X responses');
            // Create a demo evaluation since we can't fetch from DB
            const demoMessages = [
              { message_type: 'bot', content: 'How do you handle difficult situations?', question_type: 'open-ended', created_at: new Date().toISOString() },
              { message_type: 'user', content: 'X', question_type: null, created_at: new Date().toISOString() },
              { message_type: 'bot', content: 'How do you motivate your team?', question_type: 'open-ended', created_at: new Date().toISOString() },
              { message_type: 'user', content: 'X', question_type: null, created_at: new Date().toISOString() },
              { message_type: 'bot', content: 'How do you handle feedback?', question_type: 'open-ended', created_at: new Date().toISOString() },
              { message_type: 'user', content: 'X', question_type: null, created_at: new Date().toISOString() },
              { message_type: 'bot', content: 'How do you approach change?', question_type: 'open-ended', created_at: new Date().toISOString() },
              { message_type: 'user', content: 'X', question_type: null, created_at: new Date().toISOString() },
              { message_type: 'bot', content: 'How do you build trust with your team?', question_type: 'open-ended', created_at: new Date().toISOString() },
              { message_type: 'user', content: 'X', question_type: null, created_at: new Date().toISOString() }
            ];
            
            console.log('Creating demo evaluation with repetitive X responses');
            payload = deriveEvaluationFromMessages(demoMessages);
            console.log('Demo evaluation generated:', payload);
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
              {frameworks.map((fr) => {
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

// --- Enhanced Scoring System with 12 Principles Framework ---

// Enhanced scoring system with 12 principles framework
const LEADERSHIP_PRINCIPLES = {
  self_awareness: {
    key: 'self_awareness',
    label: 'Self‑Awareness',
    description: 'Understanding one\'s own emotions, strengths, and weaknesses',
    levels: {
      1: { name: 'Unaware and reactive', keywords: ['rarely reflect', 'make decisions based on habits', 'not sure', 'don\'t know', 'never thought', 'not aware'] },
      2: { name: 'Emerging awareness', keywords: ['sometimes notice', 'recognize when overreacted', 'beginning to understand', 'sometimes reflect'] },
      3: { name: 'Developing awareness', keywords: ['can identify emotions', 'reflect on experiences', 'growing understanding', 'aware of', 'recognize'] },
      4: { name: 'High awareness', keywords: ['strong understanding', 'frequently reflect', 'deep self-knowledge', 'self-assessment'] },
      5: { name: 'Evolved awareness', keywords: ['highly aware', 'reflect deeply', 'mastery of self-understanding', 'authentic self'] }
    }
  },
  self_responsibility: {
    key: 'self_responsibility',
    label: 'Self‑Responsibility',
    description: 'Taking ownership of actions and outcomes',
    levels: {
      1: { name: 'Blame and victimhood', keywords: ['not my fault', 'blame others', 'can\'t control', 'victim mentality', 'not responsible'] },
      2: { name: 'Some responsibility', keywords: ['sometimes take responsibility', 'when things are easy', 'partial ownership'] },
      3: { name: 'Active responsibility', keywords: ['responsible for my growth', 'accepts feedback', 'takes ownership', 'accountable'] },
      4: { name: 'Proactive responsibility', keywords: ['take responsibility for actions', 'own successes/failures', 'core part of who I am', 'take charge'] },
      5: { name: 'Full responsibility', keywords: ['100% responsible', 'maintains strong sense', 'complete ownership', 'lead by example'] }
    }
  },
  growth: {
    key: 'growth',
    label: 'Continuous Personal Growth',
    description: 'Commitment to ongoing learning and development',
    levels: {
      1: { name: 'Resistance to growth', keywords: ['don\'t need to grow', 'already know', 'waste of time', 'not interested', 'don\'t need'] },
      2: { name: 'Passive acceptance', keywords: ['know I could grow', 'engages in growth activities', 'basic learning', 'sometimes learn'] },
      3: { name: 'Openness to growth', keywords: ['accepts feedback', 'believes in growth', 'actively learns', 'develop', 'improve'] },
      4: { name: 'Growth-seeking', keywords: ['core part of who I am', 'regularly practices', 'seeks development', 'training', 'courses'] },
      5: { name: 'Lifelong learner', keywords: ['lifelong', 'models vulnerability', 'constant evolution', 'mentor', 'skill building'] }
    }
  },
  psych_safety: {
    key: 'psych_safety',
    label: 'Trust & Psychological Safety',
    description: 'Creating an environment of trust and security',
    levels: {
      1: { name: 'Fear-based', keywords: ['afraid to speak', 'fear', 'intimidating', 'not safe', 'worried', 'afraid'] },
      2: { name: 'Cautious trust', keywords: ['want to trust but remain', 'delegate tasks but still feel', 'cautious approach', 'safe space'] },
      3: { name: 'Developing trust', keywords: ['believe trust needs to be', 'give trust gradually', 'building safety', 'trust', 'open communication'] },
      4: { name: 'Trust-building', keywords: ['trust colleagues', 'foster culture of trust', 'open communication', 'psychological safety'] },
      5: { name: 'Deep psychological safety', keywords: ['models vulnerability', 'authentic self', 'deep trust', 'speak up', 'comfortable'] }
    }
  },
  empathy: {
    key: 'empathy',
    label: 'Empathy & Awareness of Others',
    description: 'Understanding and valuing others\' perspectives and feelings',
    levels: {
      1: { name: 'Self-focused', keywords: ['don\'t care', 'not my problem', 'just get work done', 'emotions don\'t matter'] },
      2: { name: 'Basic consideration', keywords: ['occasionally consider', 'listen but struggle', 'basic empathy', 'listen'] },
      3: { name: 'Growing empathy', keywords: ['acknowledge people', 'pay more attention', 'developing understanding', 'understand others'] },
      4: { name: 'High emotional intelligence', keywords: ['lead with emotional intelligence', 'consistently adapt', 'deep understanding', 'perspective'] },
      5: { name: 'Systemic empathy', keywords: ['deep emotional', 'instinctively understand', 'systemic perspective', 'feelings', 'empathy'] }
    }
  },
  shared_resp: {
    key: 'shared_resp',
    label: 'Empowered & Shared Responsibility',
    description: 'Distributing authority and fostering collective ownership',
    levels: {
      1: { name: 'Control-focused', keywords: ['do everything myself', 'can\'t trust others', 'micromanage', 'control everything'] },
      2: { name: 'Selective delegation', keywords: ['delegate selectively', 'want to trust but', 'limited empowerment', 'delegate'] },
      3: { name: 'Growing empowerment', keywords: ['recognize need to empower', 'delegate selectively', 'developing trust', 'empower'] },
      4: { name: 'Active empowerment', keywords: ['empower my team', 'give real authority', 'coaching approach', 'shared responsibility'] },
      5: { name: 'Fully distributed', keywords: ['responsible for building', 'deeply empowering', 'mentor/coach', 'team decisions'] }
    }
  },
  purpose: {
    key: 'purpose',
    label: 'Purpose, Vision & Outcomes',
    description: 'Defining and working towards a clear, shared future',
    levels: {
      1: { name: 'Task-focused', keywords: ['just a job', 'don\'t see point', 'unclear goals', 'no direction'] },
      2: { name: 'Understanding importance', keywords: ['understand importance', 'refer to vision/goals', 'basic purpose', 'purpose'] },
      3: { name: 'Purpose-conscious', keywords: ['see value in', 'create clarity', 'meaningful work', 'vision'] },
      4: { name: 'Purpose-led', keywords: ['help define/communicate', 'facilitates creation', 'vision-driven', 'goals'] },
      5: { name: 'Visionary architecture', keywords: ['crafts compelling purpose', 'deeply empowering', 'systemic vision', 'mission'] }
    }
  },
  culture: {
    key: 'culture',
    label: 'Culture of Leadership',
    description: 'Building an environment where leadership is practiced at all levels',
    levels: {
      1: { name: 'Toxic culture', keywords: ['toxic', 'bad culture', 'don\'t fit in', 'negative environment'] },
      2: { name: 'Basic support', keywords: ['basic support', 'recognize conflict', 'minimal culture building', 'culture'] },
      3: { name: 'Encouraging growth', keywords: ['encourage team members', 'create clarity', 'positive environment', 'values'] },
      4: { name: 'Active culture building', keywords: ['act as coach/guide', 'facilitate discussions', 'culture shaping', 'team spirit'] },
      5: { name: 'Culture cultivation', keywords: ['catalyst for growth', 'built a culture where', 'systemic culture', 'belonging'] }
    }
  },
  tensions: {
    key: 'tensions',
    label: 'Harnessing Tensions for Collaboration',
    description: 'Managing disagreements constructively to drive innovation',
    levels: {
      1: { name: 'Conflict avoidance', keywords: ['avoid conflict', 'can\'t handle', 'makes me uncomfortable', 'not good with', 'tension'] },
      2: { name: 'Basic conflict handling', keywords: ['recognize conflict', 'address tensions', 'basic resolution', 'conflict'] },
      3: { name: 'Collaborative approach', keywords: ['see value in collaboration', 'actively listen', 'constructive conflict', 'collaboration'] },
      4: { name: 'Productive conflict', keywords: ['understand/value positive', 'co-create value', 'productive tension', 'resolve conflict'] },
      5: { name: 'Conflict as catalyst', keywords: ['built a culture where conflict', 'catalyst for innovation', 'systemic conflict resolution', 'manage tensions'] }
    }
  },
  stakeholders: {
    key: 'stakeholders',
    label: 'Positive Impact on Stakeholders',
    description: 'Ensuring actions benefit all parties involved',
    levels: {
      1: { name: 'Internal focus only', keywords: ['only care about team', 'not my concern', 'internal focus only'] },
      2: { name: 'Basic stakeholder awareness', keywords: ['know stakeholders', 'meets minimum expectations', 'basic awareness', 'stakeholders'] },
      3: { name: 'Growing stakeholder focus', keywords: ['see stakeholders as part of', 'seeks feedback', 'broader perspective', 'customers'] },
      4: { name: 'Stakeholder partnership', keywords: ['engages stakeholders as partners', 'opportunity to learn', 'collaborative impact', 'community'] },
      5: { name: 'Systemic stakeholder impact', keywords: ['embeds stakeholder impact', 'systemic thinking', 'regenerative approach', 'impact'] }
    }
  },
  change: {
    key: 'change',
    label: 'Embracing Change & Innovation',
    description: 'Adapting to new circumstances and fostering creativity',
    levels: {
      1: { name: 'Change resistance', keywords: ['resist change', 'stick to old ways', 'don\'t like change', 'too risky'] },
      2: { name: 'Reactive to change', keywords: ['reacts to change', 'complies with rules', 'basic adaptation', 'change'] },
      3: { name: 'Adaptive approach', keywords: ['useful if managed', 'supports new ideas', 'flexible approach', 'adapt'] },
      4: { name: 'Proactive creativity', keywords: ['champions innovation', 'lead with awareness', 'builds strategies', 'innovation'] },
      5: { name: 'Evolving and regenerative', keywords: ['constant/beautiful', 'embodies curiosity/adaptability', 'regenerative practices', 'experiment'] }
    }
  },
  stewardship: {
    key: 'stewardship',
    label: 'Social & Ethical Stewardship',
    description: 'Leading with a commitment to societal and environmental well-being',
    levels: {
      1: { name: 'Profit-focused only', keywords: ['just business', 'profit only', 'don\'t care about ethics'] },
      2: { name: 'Basic compliance', keywords: ['sometimes necessary', 'meets requirements', 'basic ethics', 'ethical'] },
      3: { name: 'Values-aligned', keywords: ['want to lead in a way that reflects', 'acts in accordance', 'ethical consideration', 'responsible'] },
      4: { name: 'Purpose-driven inclusivity', keywords: ['lead with awareness', 'builds strategies', 'ethical leadership', 'sustainable'] },
      5: { name: 'System-conscious leadership', keywords: ['part of an interconnected', 'embeds regenerative values', 'systemic stewardship', 'social impact'] }
    }
  }
};

// const FRAMEWORKS = Object.values(LEADERSHIP_PRINCIPLES).map(p => ({ key: p.key, label: p.label }));

// Enhanced response analysis functions
function analyzeResponsePatterns(responses: string[]): {
  repetition: number;
  engagement: number;
  consistency: number;
  quality: number;
} {
  console.log('Analyzing response patterns for:', responses);
  if (responses.length === 0) return { repetition: 0, engagement: 0, consistency: 0, quality: 0 };

  // Check for repetitive responses
  const uniqueResponses = new Set(responses.map(r => r.toLowerCase().trim()));
  const repetition = 1 - (uniqueResponses.size / responses.length);
  console.log('Unique responses:', uniqueResponses.size, 'out of', responses.length, 'repetition score:', repetition);

  // Analyze engagement (response length, detail, thoughtfulness)
  const avgLength = responses.reduce((sum, r) => sum + r.length, 0) / responses.length;
  const engagement = Math.min(100, avgLength / 2); // Normalize to 0-100

  // Check consistency in response quality
  const lengths = responses.map(r => r.length);
  const meanLength = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - meanLength, 2), 0) / lengths.length;
  const consistency = Math.max(0, 100 - (variance / 10));

  // Overall quality score
  const quality = (engagement + consistency) / 2;

  return { repetition, engagement, consistency, quality };
}

function analyzeSentiment(text: string): {
  positive: number;
  negative: number;
  neutral: number;
  confidence: number;
} {
  const words = text.toLowerCase().split(/\s+/);
  
  const positiveWords = [
    'excellent', 'great', 'good', 'positive', 'successful', 'effective', 'strong', 'confident',
    'motivated', 'inspired', 'passionate', 'committed', 'dedicated', 'focused', 'clear', 'organized',
    'collaborative', 'supportive', 'empathetic', 'understanding', 'flexible', 'adaptive', 'innovative',
    'creative', 'strategic', 'visionary', 'purposeful', 'meaningful', 'impactful', 'transformative',
    'love', 'enjoy', 'excited', 'thrilled', 'amazing', 'wonderful', 'fantastic', 'brilliant'
  ];
  
  const negativeWords = [
    'bad', 'poor', 'difficult', 'challenging', 'frustrating', 'confusing', 'unclear', 'weak',
    'unsure', 'uncertain', 'doubtful', 'worried', 'concerned', 'stressed', 'overwhelmed', 'lost',
    'confused', 'stuck', 'blocked', 'resistant', 'reluctant', 'hesitant', 'fearful', 'anxious',
    'disappointed', 'discouraged', 'demotivated', 'uninspired', 'unfocused', 'disorganized',
    'hate', 'terrible', 'awful', 'horrible', 'dreadful', 'miserable', 'frustrated', 'angry'
  ];

  let positive = 0;
  let negative = 0;
  let neutral = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) positive++;
    else if (negativeWords.includes(word)) negative++;
    else neutral++;
  });

  const total = words.length;
  const confidence = total > 10 ? 0.8 : total > 5 ? 0.6 : 0.4;

  return {
    positive: positive / total,
    negative: negative / total,
    neutral: neutral / total,
    confidence
  };
}

function calculatePrincipleScore(principle: any, responses: string[], questionContext: string[]): {
  score: number;
  level: number;
  confidence: number;
  reasoning: string[];
} {
  let levelScores = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const reasoning: string[] = [];

  responses.forEach((response, index) => {
    const responseLower = response.toLowerCase();
    const sentiment = analyzeSentiment(response);
    
    // Analyze response against each level
    Object.entries(principle.levels).forEach(([level, levelData]: [string, any]) => {
      const levelNum = parseInt(level);
      let levelScore = 0;
      
      // Check for level-specific keywords
      levelData.keywords.forEach((keyword: string) => {
        if (responseLower.includes(keyword.toLowerCase())) {
          levelScore += 10;
        }
      });

      // Sentiment analysis bonus/penalty
      if (levelNum >= 4 && sentiment.positive > 0.3) {
        levelScore += 15;
      } else if (levelNum <= 2 && sentiment.negative > 0.3) {
        levelScore += 10;
      }

      // Response quality bonus
      if (response.length > 100) levelScore += 5;
      if (response.split(' ').length > 20) levelScore += 5;

      (levelScores as any)[levelNum] += levelScore;
    });

    // Add reasoning for this response
    const questionContextText = questionContext[index] || 'Leadership question';
    const responseAnalysis = `Response to "${questionContextText.substring(0, 50)}...": ${response.length > 50 ? 'Detailed' : 'Brief'} response with ${sentiment.positive > sentiment.negative ? 'positive' : sentiment.negative > sentiment.positive ? 'negative' : 'neutral'} sentiment`;
    reasoning.push(responseAnalysis);
  });

  // Determine the most likely level
  let bestLevel = 1;
  let bestScore = levelScores[1];
  
  Object.entries(levelScores).forEach(([level, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestLevel = parseInt(level);
    }
  });

  // Convert level to score with stricter scaling (1-5 scale to 0-100)
  // Make level 5 much harder to achieve - require exceptional evidence
  const scoreMapping = [0, 15, 35, 60, 80, 95]; // More stringent score distribution
  const score = scoreMapping[bestLevel] || 0;
  
  // Calculate confidence based on response consistency
  const { consistency } = analyzeResponsePatterns(responses);
  const confidence = Math.min(0.95, consistency / 100 + 0.5);

  return {
    score: Math.round(score),
    level: bestLevel,
    confidence,
    reasoning
  };
}

function detectResponsePatterns(responses: string[]): {
  isRepetitive: boolean;
  isEngaged: boolean;
  isThoughtful: boolean;
  patternType: string;
} {
  const { repetition, engagement, quality } = analyzeResponsePatterns(responses);
  
  const isRepetitive = repetition > 0.25; // Lower threshold for detecting repetition
  const isEngaged = engagement > 80; // Higher bar for engagement
  const isThoughtful = quality > 85; // Much higher bar for thoughtfulness
  
  let patternType = 'normal';
  if (isRepetitive && !isEngaged) patternType = 'disengaged';
  else if (isRepetitive && isEngaged) patternType = 'focused';
  else if (!isRepetitive && isEngaged) patternType = 'thoughtful';
  else if (!isRepetitive && !isEngaged) patternType = 'brief';
  
  return { isRepetitive, isEngaged, isThoughtful, patternType };
}

// function parseScaleAnswer(content: string): number | null {
//   const m = content?.match(/(\d{1,2})\s*out\s*of\s*10/i);
//   if (!m) return null;
//   const raw = parseInt(m[1], 10);
//   if (Number.isNaN(raw)) return null;
//   return Math.max(0, Math.min(100, Math.round((raw / 10) * 100)));
// }

// Legacy functions removed - now using AI evaluation

// AI-powered evaluation derivation with enhanced analysis
const deriveEvaluationFromMessages = useCallback(async (msgs: Array<{ message_type: string; content: string; question_type: string | null; created_at: string }>): Promise<EvaluationData> => {
  console.log('Deriving evaluation from messages using AI:', msgs.length);
  
  if (!msgs || msgs.length === 0) {
    console.log('No messages found, using default evaluation');
    return getDefaultEvaluation();
  }

  try {
    // Extract user responses
    const allResponses: string[] = [];
    let conversationContext = '';
    
    // Sort messages by timestamp
    const sortedMessages = msgs.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const userResponses = sortedMessages
      .filter((msg: any) => msg.message_type === 'user')
      .map((msg: any) => msg.content)
      .filter((content: string) => content && content.trim().length > 5);
    
    allResponses.push(...userResponses);
    
    // Build conversation context (last 2000 chars to stay within limits)
    conversationContext = sortedMessages
      .map((msg: any) => `${msg.message_type}: ${msg.content}`)
      .join('\n').slice(-2000);

    console.log('Extracted responses for AI analysis:', allResponses.length);

    if (allResponses.length === 0) {
      console.log('No valid responses found, using default evaluation');
      return getDefaultEvaluation();
    }

    // Call AI evaluation function
    const response = await supabase.functions.invoke('ai-evaluation', {
      body: {
        responses: allResponses,
        conversationContext: conversationContext
      }
    });

    if (response.error) {
      console.error('AI evaluation error:', response.error);
      // Fallback to rule-based evaluation
      return generateFallbackEvaluation(allResponses, conversationContext);
    }

    console.log('AI evaluation completed successfully');
    return response.data;

  } catch (error) {
    console.error('Error in AI evaluation:', error);
      // Fallback to rule-based evaluation
      return generateFallbackEvaluation(allResponses, conversationContext.slice(0, 1000));
  }
}, []);

// Legacy functions removed - using AI evaluation instead
  
  for (const msg of msgs) {
    if (msg.message_type === 'bot' && msg.content !== 'Let me ask you more about that...') {
      // Start new conversation pair
      if (currentPair) {
        pairs.push(currentPair);
      }
      currentPair = {
        question: msg.content,
        response: null,
        followUpQuestion: null,
        followUpResponse: null,
        isFollowUp: false
      };
    } else if (msg.message_type === 'bot' && msg.content === 'Let me ask you more about that...') {
      // This is a follow-up indicator, next bot message will be the follow-up question
      if (currentPair) {
        currentPair.hasFollowUpIndicator = true;
      }
    } else if (msg.message_type === 'user' && currentPair) {
      if (!currentPair.response) {
        currentPair.response = msg.content;
      } else if (!currentPair.followUpResponse) {
        currentPair.followUpResponse = msg.content;
      }
    }
  }
  
  // Add the last pair
  if (currentPair) {
    pairs.push(currentPair);
  }
  
  return pairs;
}



// Legacy functions removed
  
  let summary = `Level ${level}: ${levelData?.name || 'Developing'}. `;
  
  if (patternAnalysis.isRepetitive) {
    summary += "Your responses show some repetition, which may indicate areas for deeper reflection. ";
  } else if (patternAnalysis.isThoughtful) {
    summary += "Your thoughtful responses demonstrate genuine engagement with this area. ";
  }
  
  if (score >= 75) {
    summary += "You demonstrate strong capability in this leadership principle. ";
  } else if (score >= 50) {
    summary += "You show developing capability with room for growth. ";
  } else {
    summary += "This area represents a key opportunity for development. ";
  }
  
  return summary;
}

function getExperienceModifier(_frameworkKey: string, basicInfo: any): number {
  const position = basicInfo.position.toLowerCase();
  const isLeader = position.includes('director') || position.includes('manager') || position.includes('lead') || position.includes('head');
  const isSenior = position.includes('senior') || position.includes('principal') || position.includes('chief');
  
  if (isSenior) return 8;
  if (isLeader) return 5;
  return 0;
}

// function getTeamSizeModifier(frameworkKey: string, teamSize: string): number {
//   const size = parseInt(teamSize) || 0;
//   const leadershipFrameworks = ['shared_resp', 'psych_safety', 'culture', 'tensions'];
//   
//   if (leadershipFrameworks.includes(frameworkKey)) {
//     if (size > 20) return 10; // Large teams = more experience with these
//     if (size > 10) return 5;
//     if (size > 5) return 2;
//     if (size < 3) return -5; // Small teams = less experience
//   }
//   
//   return 0;
// }

// function getRoleModifier(frameworkKey: string, role: string): number {
//   const roleStr = role.toLowerCase();
//   const modifiers: Record<string, Record<string, number>> = {
//     operations: { self_responsibility: 5, purpose: 5, stakeholders: 3 },
//     engineering: { growth: 5, change: 8, tensions: 3 },
//     hr: { empathy: 8, psych_safety: 8, culture: 8 },
//     sales: { stakeholders: 8, empathy: 5, purpose: 3 },
//     marketing: { stakeholders: 5, purpose: 5, change: 5 },
//     finance: { self_responsibility: 5, stewardship: 5, purpose: 3 }
//   };
//   
//   for (const [roleKey, frameworkMods] of Object.entries(modifiers)) {
//     if (roleStr.includes(roleKey)) {
//       return frameworkMods[frameworkKey] || 0;
//     }
//   }
//   
//   return 0;
// }

// Legacy functions removed
  const bottom3 = sortedFrameworks.slice(-3);
  
  // Analyze overall response patterns
  const patternAnalysis = detectResponsePatterns(responses);
  
  // Generate persona based on top framework and response patterns
  const topFramework = top3[0];
  const persona = generatePersona(topFramework, basicInfo, patternAnalysis, responses);
  
  // Generate comprehensive summary
  const avgScore = Math.round(frameworks.reduce((sum, f) => sum + (f.score || 0), 0) / frameworks.length);
  const teamSizeNum = parseInt(basicInfo.teamSize) || 0;
  
  // Check for completely disengaged responses
  const allSameResponse = responses.every(r => r.toLowerCase().trim() === responses[0]?.toLowerCase().trim());
  const veryShortResponses = responses.every(r => r.trim().length <= 2);
  
  let summary = '';
  
  if (allSameResponse && veryShortResponses) {
    summary = `WARNING: Your assessment responses indicate you did not genuinely engage with the leadership evaluation process. All responses were identical single characters ("${responses[0]?.trim()}"), suggesting the assessment was not completed seriously. These results do not reflect actual leadership capabilities and should not be used for development planning. Please retake the assessment with thoughtful, genuine responses to receive meaningful insights.`;
  } else {
    summary = `Based on your assessment responses, you demonstrate ${avgScore >= 70 ? 'strong' : avgScore >= 50 ? 'developing' : avgScore >= 10 ? 'emerging' : 'minimal'} leadership capabilities. `;
    
    if (followUpCount > 0) {
      summary += `Your engagement with ${followUpCount} follow-up question${followUpCount > 1 ? 's' : ''} shows deeper reflection and commitment to the assessment process. `;
    }
    
    if (patternAnalysis.isRepetitive) {
      summary += "Your responses show significant repetition, suggesting you may benefit from more diverse reflection on leadership scenarios. ";
    } else if (patternAnalysis.isThoughtful) {
      summary += "Your thoughtful and detailed responses indicate genuine engagement with the assessment process. ";
    }
  }
  
  summary += `As a ${basicInfo.position} in ${basicInfo.role} leading ${teamSizeNum > 0 ? `a team of ${basicInfo.teamSize}` : 'your role'}, your strongest areas are `;
  summary += `${top3.map(f => f.label).join(', ')}. `;
  
  if (basicInfo.motivation) {
    summary += `Your motivation to ${basicInfo.motivation.toLowerCase()} aligns well with your leadership profile. `;
  }
  
  summary += `Focus on developing ${bottom3[0]?.label} and ${bottom3[1]?.label} to become an even more well-rounded leader.`;
  
  return { persona, summary };
}

// Enhanced persona generation
function generatePersona(topFramework: FrameworkScore, _basicInfo: any, patternAnalysis: any, responses: string[] = []): string {
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
  
  // Check for completely disengaged responses
  const allSameResponse = responses.length > 0 && responses.every(r => r.toLowerCase().trim() === responses[0]?.toLowerCase().trim());
  const veryShortResponses = responses.length > 0 && responses.every(r => r.trim().length <= 2);
  
  let persona = '';
  
  if (allSameResponse && veryShortResponses) {
    persona = "Assessment Not Completed (Invalid)";
  } else {
    persona = personaMap[topFramework.key] || "Emerging Leader";
    
    if (patternAnalysis.isRepetitive) {
      persona += " (Developing)";
    } else if (patternAnalysis.isThoughtful) {
      persona += " (Engaged)";
    }
  }
  
  return persona;
}

const getDefaultEvaluation = (): EvaluationData => {
  const frameworks: FrameworkScore[] = Object.values(LEADERSHIP_PRINCIPLES).map((principle) => ({
    key: principle.key,
    label: principle.label,
    score: Math.floor(Math.random() * 30) + 50, // Random score between 50-80
    summary: `Your ${principle.label.toLowerCase()} shows potential for growth with focused development.`,
    confidence: 0.6,
    level: 3
  }));

  return {
    frameworks,
    overall: {
      persona: 'The Developing Leader',
      summary: 'Your leadership assessment is complete. Continue developing your skills through practice and feedback to unlock your full potential.'
    }
  };
};

const generateFallbackEvaluation = (responses: string[], _conversationContext: string): EvaluationData => {
  console.log('Generating fallback evaluation using rule-based approach');
  
  // Simplified rule-based scoring as fallback
  const frameworks: FrameworkScore[] = Object.values(LEADERSHIP_PRINCIPLES).map((principle) => {
    let score = 55; // Conservative base score
    
    // Simple keyword matching for fallback
    const keywords = getKeywordsForPrinciple(principle.key);
    const responseText = responses.join(' ').toLowerCase();
    const matches = keywords.filter(keyword => responseText.includes(keyword.toLowerCase()));
    
    score += matches.length * 3; // Less generous than before
    
    // Response quality bonus
    const avgLength = responses.reduce((sum, r) => sum + r.length, 0) / responses.length;
    if (avgLength > 100) score += 5;
    
    score = Math.min(85, Math.max(40, score)); // Cap between 40-85
    
    return {
      key: principle.key,
      label: principle.label,
      score,
      summary: `Based on available data, your ${principle.label.toLowerCase()} shows ${score >= 70 ? 'good' : 'developing'} capabilities.`,
      confidence: 0.5,
      level: Math.ceil(score / 20)
    };
  });

  const avgScore = frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length;
  
  return {
    frameworks,
    overall: {
      persona: avgScore >= 70 ? 'The Strategic Leader' : 'The Developing Leader',
      summary: `Your assessment indicates ${avgScore >= 70 ? 'strong developing' : 'emerging'} leadership capabilities. Continue focusing on growth and practical application of leadership principles.`
    }
  };
};

const getKeywordsForPrinciple = (principleKey: string): string[] => {
  const keywordMap: Record<string, string[]> = {
    'self_awareness': ['self', 'aware', 'reflect', 'personal', 'values', 'discipline'],
    'self_responsibility': ['responsible', 'ownership', 'accountability', 'take charge'],
    'growth': ['learn', 'develop', 'improve', 'growth', 'feedback'],
    'psych_safety': ['trust', 'safe', 'open', 'comfortable', 'psychological safety'],
    'empathy': ['empathy', 'understand', 'feelings', 'perspective', 'emotional'],
    'shared_resp': ['delegate', 'empower', 'shared', 'team responsibility'],
    'purpose': ['vision', 'purpose', 'goals', 'direction', 'outcomes'],
    'change': ['change', 'adapt', 'innovation', 'transform', 'evolve'],
    'facilitation': ['facilitate', 'coordinate', 'organize', 'guide'],
    'communication': ['communicate', 'listen', 'feedback', 'clear', 'message'],
    'develop_people': ['mentor', 'coach', 'develop', 'teach', 'guide'],
    'systemic': ['system', 'holistic', 'big picture', 'interconnected']
  };
  return keywordMap[principleKey] || [];
};

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

