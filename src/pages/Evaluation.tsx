import { useEffect, useMemo, useState, useCallback } from 'react';
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
                
                payload = await deriveEvaluationFromMessages(msgs);
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
            payload = await deriveEvaluationFromMessages(demoMessages);
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
      // Fallback to rule-based evaluation with default values
      return generateFallbackEvaluation(['Default response'], 'No context');
    }
  }, []);

  function toggleImprovement(key: string) {
    setImprovementsDone(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            {/* Main Dashboard */}
            <div className="max-w-6xl mx-auto">
              {/* Title Section */}
              <div className="text-center mb-12">
                <h1 className="text-4xl lg:text-5xl font-bold text-text-primary mb-4">
                  {data.overall?.persona || 'LEADERSHIP PROFILE'}
                </h1>
                {data.overall?.summary && (
                  <p className="text-lg text-text-secondary max-w-3xl mx-auto">
                    {data.overall.summary}
                  </p>
                )}
              </div>

              {/* Dashboard Grid */}
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Leadership Dimensions */}
                <div className="lg:col-span-2 space-y-6">
                  {getLeadershipDimensions(frameworks).map((dimension) => {
                    const level = getLeadershipLevel(dimension.score);
                    const progressWidth = Math.max(0, Math.min(100, dimension.score));
                    
                    return (
                      <div key={dimension.key} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-text-primary mb-2">{dimension.label.toUpperCase()}</h3>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-sm font-semibold text-primary">Level:</span>
                            <span className="text-lg font-bold text-text-primary">{level}</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${progressWidth}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {getDimensionDescription(dimension.key, level)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column - Top Priorities */}
                <div className="lg:col-span-1">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 h-fit">
                    <h3 className="text-xl font-bold text-text-primary mb-6">Top 2 Priorities</h3>
                    
                    <div className="space-y-4">
                      {getTopPriorities(frameworks).map((priority, index) => (
                        <div key={index} className="border-l-4 border-teal-500 pl-4">
                          <h4 className="font-semibold text-text-primary mb-2">{priority.title}</h4>
                          <p className="text-sm text-text-secondary">{priority.description}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Chat Button */}
                    <div className="mt-6 flex justify-end">
                      <button 
                        onClick={() => window.open('/assessment', '_blank')}
                        className="bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
                        title="Start coaching conversation"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
// Helper functions for the new dashboard design

function getLeadershipDimensions(frameworks: FrameworkScore[]): Array<{ key: string; label: string; score: number }> {
  // Group frameworks by leadership dimension
  const dimensions = {
    'self_leadership': {
      label: 'Self-Leadership',
      keys: ['self_awareness', 'self_responsibility', 'continuous_growth']
    },
    'relational_leadership': {
      label: 'Relational Leadership', 
      keys: ['trust_safety', 'empathy', 'empowerment']
    },
    'organizational_leadership': {
      label: 'Leadership Beyond the Organization',
      keys: ['vision', 'culture', 'tension', 'innovation', 'stakeholder', 'stewardship']
    }
  };

  return Object.entries(dimensions).map(([key, dimension]) => {
    // Calculate average score for this dimension
    const dimensionFrameworks = frameworks.filter(fr => dimension.keys.includes(fr.key));
    const averageScore = dimensionFrameworks.length > 0 
      ? dimensionFrameworks.reduce((sum, fr) => sum + fr.score, 0) / dimensionFrameworks.length
      : 0;

    return {
      key,
      label: dimension.label,
      score: averageScore
    };
  });
}

function getLeadershipLevel(score: number): string {
  if (score >= 90) return 'TRANSFORMATIONAL';
  if (score >= 75) return 'ADVANCED';
  if (score >= 60) return 'DEVELOPING';
  if (score >= 40) return 'EMERGING';
  return 'BEGINNER';
}

function getDimensionDescription(key: string, level: string): string {
  const descriptions: { [key: string]: { [level: string]: string } } = {
    self_leadership: {
      'TRANSFORMATIONAL': 'You demonstrate exceptional self-awareness and continuous growth, serving as a model for others.',
      'ADVANCED': 'You demonstrate a strong ability to reflect on your thoughts, emotions, and behaviors with clarity and purpose.',
      'DEVELOPING': 'You show growing awareness of your strengths and areas for development.',
      'EMERGING': 'You\'re beginning to recognize your personal leadership patterns and growth opportunities.',
      'BEGINNER': 'You\'re starting to develop self-awareness and personal leadership skills.'
    },
    relational_leadership: {
      'TRANSFORMATIONAL': 'You lead with heart and deep emotional intelligence, creating spaces of trust and psychological safety.',
      'ADVANCED': 'You excel at building relationships and creating inclusive, empowering environments.',
      'DEVELOPING': 'You show strong interpersonal skills and team-building capabilities.',
      'EMERGING': 'You\'re developing your ability to connect with and lead others effectively.',
      'BEGINNER': 'You\'re learning the fundamentals of relational leadership.'
    },
    organizational_leadership: {
      'TRANSFORMATIONAL': 'You drive organizational transformation through visionary leadership and cultural development.',
      'ADVANCED': 'You effectively align teams with organizational vision and foster leadership at all levels.',
      'DEVELOPING': 'You show strong organizational leadership and strategic thinking capabilities.',
      'EMERGING': 'You\'re beginning to recognize your broader organizational impact and influence.',
      'BEGINNER': 'You\'re developing your organizational leadership skills and strategic thinking.'
    }
  };
  
  return descriptions[key]?.[level] || 'You\'re developing your leadership capabilities in this area.';
}

function getTopPriorities(frameworks: FrameworkScore[]): Array<{ title: string; description: string }> {
  // Sort frameworks by score (lowest first) to identify areas needing improvement
  const sortedFrameworks = [...frameworks].sort((a, b) => a.score - b.score);
  
  const priorities: { [key: string]: { title: string; description: string } } = {
    self_awareness: { title: 'Self-Awareness', description: 'Develop deeper understanding of your leadership impact and blind spots.' },
    self_responsibility: { title: 'Self-Responsibility', description: 'Take greater ownership of outcomes and decision-making processes.' },
    continuous_growth: { title: 'Continuous Growth', description: 'Establish regular learning and development practices.' },
    trust_safety: { title: 'Trust & Safety', description: 'Create environments where people feel safe to take risks and be vulnerable.' },
    empathy: { title: 'Empathy & Awareness', description: 'Develop deeper understanding of others\' perspectives and needs.' },
    empowerment: { title: 'Empowerment', description: 'Delegate meaningful authority and hold others accountable for results.' },
    vision: { title: 'Purpose-Driven Goals', description: 'Set and articulate a compelling vision for the future.' },
    culture: { title: 'Culture Building', description: 'Foster leadership development at every level of the organization.' },
    tension: { title: 'Tension Management', description: 'Use productive conflict and differences to drive better decisions.' },
    innovation: { title: 'Change & Innovation', description: 'Embrace change and drive innovation through experimentation.' },
    stakeholder: { title: 'Stakeholder Impact', description: 'Create positive value for all stakeholders beyond immediate team.' },
    stewardship: { title: 'Ethical Stewardship', description: 'Lead with responsibility for societal and environmental impact.' }
  };
  
  return sortedFrameworks.slice(0, 2).map(fr => priorities[fr.key] || { 
    title: fr.label, 
    description: 'Focus on developing this leadership capability.' 
  });
}

// Legacy function removed - now handled by AI evaluation

// function parseScaleAnswer(content: string): number | null {
//   const m = content?.match(/(\d{1,2})\s*out\s*of\s*10/i);
//   if (!m) return null;
//   const raw = parseInt(m[1], 10);
//   if (Number.isNaN(raw)) return null;
//   return Math.max(0, Math.min(100, Math.round((raw / 10) * 100)));
// }

// Function moved inside React component to fix useCallback error

// Legacy functions removed - all evaluation logic now handled by AI


// Legacy functions removed - using AI evaluation instead

// Legacy function removed - now handled by AI evaluation

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

// Legacy functions removed - all evaluation logic now handled by AI

// Legacy function removed - now handled by AI evaluation

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

