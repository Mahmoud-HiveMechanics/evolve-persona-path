import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import { ArrowRight, Send, User, Bot, CheckCircle2, Loader2, Mic, Square, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOpenAIAssistant } from '../hooks/useOpenAIAssistant';
import { useConversation } from '../hooks/useConversation';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  questionType?: 'multiple-choice' | 'open-ended' | 'scale';
  options?: string[];
  scaleInfo?: {
    min: number;
    max: number;
    min_label: string;
    max_label: string;
  };
  isQuestion?: boolean;
}


export const Assessment = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showCurrentQuestion, setShowCurrentQuestion] = useState(false);
  const [openEndedResponse, setOpenEndedResponse] = useState('');
  const [scaleValue, setScaleValue] = useState([5]);
  const [questionCount, setQuestionCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [kickoffSent, setKickoffSent] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [mcPending, setMcPending] = useState(false);
  const [mcOtherValue, setMcOtherValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { conversationId, threadId, createConversation, saveMessage, markConversationComplete } = useConversation();
  
  const { 
    isInitialized, 
    isLoading: assistantLoading, 
    error: assistantError, 
    currentQuestion, 
    sendMessage, 
    initializeAssistant 
  } = useOpenAIAssistant({ threadId });
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, assistantLoading]);

  // Keyboard shortcuts for quicker interaction
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Submit open-ended on Cmd/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && openEndedResponse.trim()) {
        e.preventDefault();
        handleOpenEndedSubmit();
      }

      // Choose multiple choice with number keys 1-9
      if (currentQuestion?.options && currentQuestion.options.length > 0 && showCurrentQuestion) {
        const num = Number(e.key);
        if (!Number.isNaN(num) && num >= 1 && num <= Math.min(9, currentQuestion.options.length)) {
          const choice = currentQuestion.options[num - 1];
          handleMultipleChoiceAnswer(choice);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openEndedResponse, currentQuestion, showCurrentQuestion]);

  const addMessage = async (type: 'bot' | 'user', content: string, questionData?: Partial<ChatMessage>) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      ...questionData
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Save to database
    await saveMessage({
      type,
      content,
      questionType: questionData?.questionType,
      options: questionData?.options,
      scaleMin: questionData?.scaleInfo?.min,
      scaleMax: questionData?.scaleInfo?.max,
      scaleLabels: questionData?.scaleInfo ? [questionData.scaleInfo.min_label, questionData.scaleInfo.max_label] : undefined
    });
  };

  // Handle OpenAI assistant questions
  useEffect(() => {
    if (currentQuestion && !showCurrentQuestion) {
      addMessage('bot', currentQuestion.question, {
        isQuestion: true,
        questionType: currentQuestion.type,
        options: currentQuestion.options,
        scaleInfo: currentQuestion.scale_info
      });
      setShowCurrentQuestion(true);
      setQuestionCount(prev => prev + 1);
      
      // Check if assessment is complete
      if (currentQuestion.question?.includes('assessment is complete') || 
          currentQuestion.question?.includes('completed') ||
          currentQuestion.question?.includes('finished')) {
        setIsComplete(true);
        markConversationComplete();
      }
    }
  }, [currentQuestion, showCurrentQuestion]);

  const handleStart = async () => {
    setIsStarted(true);
    setKickoffSent(false);
    await addMessage('bot', "I'm getting ready for you. Please wait a moment...");
  };

  // Initialize assistant when start pressed and threadId becomes available
  useEffect(() => {
    const run = async () => {
      if (!isStarted) return;
      if (!threadId) return;
      if (isInitialized) return;
      try {
        console.log('Thread ID available:', threadId);
        console.log('Initializing assistant...');
        await initializeAssistant();
        console.log('Assistant initialized successfully');
      } catch (error) {
        console.error('Assistant initialization error:', error);
        await addMessage('bot', "I apologize, but I'm having trouble starting up. Please refresh the page and try again.");
      }
    };
    run();
  }, [isStarted, threadId, isInitialized]);

  // Kick off conversation once assistant ready (only once).
  // Guard against an already-active run by only kicking off when there is no active run.
  useEffect(() => {
    const kickOff = async () => {
      if (!isStarted || !isInitialized || !threadId || kickoffSent) return;
      try {
        await createConversation();
        await addMessage('bot', "Hi! I'm your leadership assessment guide. 👋");
        // Kick off the run; send the initial message once
        await sendMessage("Please start the leadership assessment by asking me the first question.");
        setKickoffSent(true);
      } catch (error) {
        console.error('Error sending initial message:', error);
        await addMessage('bot', "I apologize, but I'm having trouble connecting. Please try refreshing the page and try again.");
      }
    };
    kickOff();
  }, [isStarted, isInitialized, threadId, kickoffSent]);

  const handleMultipleChoiceAnswer = async (answer: string) => {
    setMcPending(true);
    try {
      await addMessage('user', answer);
      setShowCurrentQuestion(false);
      await sendMessage(answer);
    } finally {
      setMcPending(false);
    }
  };

  const handleOpenEndedSubmit = async () => {
    if (!openEndedResponse.trim()) return;
    
    await addMessage('user', openEndedResponse);
    setShowCurrentQuestion(false);
    
    // Send response to OpenAI assistant
    await sendMessage(openEndedResponse);
    setOpenEndedResponse('');
  };

  const handleScaleSubmit = async () => {
    const scaleResponse = `${scaleValue[0]} out of 10`;
    await addMessage('user', scaleResponse);
    setShowCurrentQuestion(false);
    
    // Send response to OpenAI assistant
    await sendMessage(scaleResponse);
    setScaleValue([5]); // Reset to middle value
  };


  // Persist evaluation when complete (simple guard: when isComplete becomes true)
  useEffect(() => {
    (async () => {
      if (!isComplete || !conversationId) return;
      try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        if (!userId) return;

        // Aggregate a minimal payload from messages in this conversation
        // (In a real flow, the assistant would return the 12-framework scoring JSON; here we stub from messages.)
        const { data: msgs } = await supabase
          .from('messages')
          .select('content, message_type, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        const payload = {
          overall: { summary: 'Assessment completed. Detailed scoring will be generated by the assistant.' },
          frameworks: [
            { key: 'self_awareness', label: 'Self‑Awareness', score: 0 },
            { key: 'self_responsibility', label: 'Self‑Responsibility', score: 0 },
            { key: 'growth', label: 'Continuous Personal Growth', score: 0 },
            { key: 'psych_safety', label: 'Trust & Psychological Safety', score: 0 },
            { key: 'empathy', label: 'Empathy & Awareness of Others', score: 0 },
            { key: 'shared_resp', label: 'Empowered & Shared Responsibility', score: 0 },
            { key: 'purpose', label: 'Purpose, Vision & Outcomes', score: 0 },
            { key: 'culture', label: 'Culture of Leadership', score: 0 },
            { key: 'tensions', label: 'Harnessing Tensions for Collaboration', score: 0 },
            { key: 'stakeholders', label: 'Positive Impact on Stakeholders', score: 0 },
            { key: 'change', label: 'Embracing Change & Innovation', score: 0 },
            { key: 'stewardship', label: 'Social & Ethical Stewardship', score: 0 }
          ]
        };

        await supabase.from('evaluations').insert({
          user_id: userId,
          conversation_id: conversationId,
          summary: 'Leadership assessment evaluation',
          data: payload as any
        });
      } catch (e) {
        console.warn('Failed to persist evaluation', e);
      }
    })();
  }, [isComplete, conversationId]);

  // Handle assistant errors
  useEffect(() => {
    if (assistantError) {
      addMessage('bot', `I apologize, but I encountered an issue: ${assistantError}. Please try refreshing the page.`);
    }
  }, [assistantError]);

  const progress = Math.min((questionCount / totalQuestions) * 100, 100);
  const milestones = [Math.round(totalQuestions / 3), Math.round((2 * totalQuestions) / 3)];
  const assistantStatus: 'idle' | 'connecting' | 'ready' = assistantLoading
    ? 'connecting'
    : (isInitialized ? 'ready' : 'idle');

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <SpiralElement size="lg" className="mx-auto" />
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-text-primary">
                Leadership Assessment
              </h1>
              <p className="text-lg text-text-secondary">
                Welcome! I'm your leadership assessment guide. I'll ask you some questions 
                to understand your leadership style and help you discover your leadership persona.
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-text-primary">What to expect:</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>5 thoughtful questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Takes about 10 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Conversational interface</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Personalized insights at the end</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleStart}
              className="btn-assessment"
            >
              <SpiralElement size="sm" />
              Start Assessment
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Progress & Status */}
        <div className="mb-6 space-y-3">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs">
              <span className="text-text-secondary">Thread</span>
              <span className={`h-2 w-2 rounded-full ${threadId ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-text-primary">{threadId ? 'Ready' : 'Pending'}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs">
              <span className="text-text-secondary">Assistant</span>
              {assistantStatus === 'ready' && <CheckCircle2 size={14} className="text-emerald-600" />}
              {assistantStatus !== 'ready' && <Loader2 size={14} className="animate-spin text-amber-600" />}
              <span className="text-text-primary capitalize">{assistantStatus}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs">
              <span className="text-text-secondary">Progress</span>
              <span className="text-text-primary font-medium">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Progress bar with milestones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Question {questionCount} of ~{totalQuestions}</span>
              <span className="text-sm text-text-secondary">{Math.round(progress)}% complete</span>
            </div>
            <div className="relative h-2 bg-primary/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
              {milestones.map((m) => (
                <div
                  key={m}
                  className="absolute top-0 h-full w-0.5 bg-white/60"
                  style={{ left: `${(m / totalQuestions) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-muted/10 rounded-xl border border-border min-h-[600px] flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'bot' && (
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={20} className="text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`p-4 rounded-xl ${
                      message.type === 'user'
                        ? 'bg-primary text-white ml-auto'
                        : 'bg-white border border-border text-text-primary'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    
                    {/* Dynamic Question UI based on type */}
                    {message.isQuestion && showCurrentQuestion && (
                      <div className="mt-4">
                        {message.questionType === 'multiple-choice' && message.options && (
                          <div className="space-y-3">
                            {message.options.map((option, index) => (
                              <button
                                key={index}
                                onClick={() => option.toLowerCase() === 'other' ? null : handleMultipleChoiceAnswer(option)}
                                className="group w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary/70 hover:bg-primary/5 transition-all duration-200 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                disabled={assistantLoading || mcPending}
                                aria-label={`Choose option ${option}`}
                                data-focus-target={index === 0}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full border-2 border-border group-hover:border-primary/70 group-hover:bg-primary/10 transition-colors grid place-items-center text-primary">
                                    <Check size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{option}</span>
                                </div>
                              </button>
                            ))}
                            {/* Optional Other input if the assistant provided an 'Other' choice */}
                            {message.options.some(o => o.toLowerCase() === 'other') && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  placeholder="Other (please specify)"
                                  value={mcOtherValue}
                                  onChange={(e) => setMcOtherValue(e.target.value)}
                                  disabled={assistantLoading || mcPending}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => mcOtherValue.trim() && handleMultipleChoiceAnswer(mcOtherValue.trim())}
                                  disabled={!mcOtherValue.trim() || assistantLoading || mcPending}
                                >
                                  Submit
                                </Button>
                              </div>
                            )}
                            <div className="text-xs text-text-secondary mt-1">Tip: press 1-{Math.min(9, message.options.length)} to answer quickly</div>
                          </div>
                        )}
                        
                        {message.questionType === 'open-ended' && (
                          <div className="space-y-3">
                            <Textarea
                              value={openEndedResponse}
                              onChange={(e) => setOpenEndedResponse(e.target.value)}
                              placeholder="Share your thoughts here... (2-3 sentences)"
                              className="min-h-[100px]"
                              disabled={assistantLoading}
                            />
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-xs text-text-secondary">
                                {openEndedResponse.length}/500 characters
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={async () => {
                                    if (recording) {
                                      mediaRecorderRef.current?.stop();
                                      return;
                                    }
                                    try {
                                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                                      recordedChunksRef.current = [];
                                      mr.ondataavailable = (e) => {
                                        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
                                      };
                                      mr.onstop = async () => {
                                        setRecording(false);
                                        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                                        // Convert to base64
                                        const base64 = await new Promise<string>((resolve, reject) => {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            const res = (reader.result as string) || '';
                                            resolve(res.split(',')[1] || '');
                                          };
                                          reader.onerror = reject;
                                          reader.readAsDataURL(blob);
                                        });

                                        try {
                                          const { data, error } = await supabase.functions.invoke('chat-assistant', {
                                            body: {
                                              action: 'transcribe_audio',
                                              audioBase64: base64,
                                              mimeType: 'audio/webm'
                                            }
                                          });
                                          if (error) throw error;
                                          if (data?.text) {
                                            setOpenEndedResponse(prev => (prev ? prev + ' ' : '') + data.text);
                                          }
                                        } catch (err) {
                                          console.error('Transcription error:', err);
                                        } finally {
                                          stream.getTracks().forEach(t => t.stop());
                                        }
                                      };
                                      mediaRecorderRef.current = mr;
                                      mr.start();
                                      setRecording(true);
                                    } catch (err) {
                                      console.error('Microphone error:', err);
                                    }
                                  }}
                                  size="sm"
                                  variant={recording ? 'destructive' : 'secondary'}
                                  title={recording ? 'Stop recording' : 'Record voice note'}
                                >
                                  {recording ? <Square size={16} /> : <Mic size={16} />}
                                  {recording ? 'Stop' : 'Record'}
                                </Button>
                                <Button
                                  onClick={handleOpenEndedSubmit}
                                  disabled={!openEndedResponse.trim() || assistantLoading}
                                  size="sm"
                                >
                                  <Send size={16} />
                                  Submit
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {message.questionType === 'scale' && message.scaleInfo && (
                          <div className="space-y-4">
                            <div className="px-2">
                              <Slider
                                value={scaleValue}
                                onValueChange={setScaleValue}
                                min={message.scaleInfo.min}
                                max={message.scaleInfo.max}
                                step={1}
                                className="w-full"
                                disabled={assistantLoading}
                              />
                              <div className="flex justify-between text-xs text-text-secondary mt-2">
                                <span>{message.scaleInfo.min_label}</span>
                                <span className="font-medium text-primary">{scaleValue[0]}</span>
                                <span>{message.scaleInfo.max_label}</span>
                              </div>
                            </div>
                            {(message.scaleInfo.max - message.scaleInfo.min) <= 10 && (
                              <div className="flex flex-wrap gap-2">
                                {Array.from({ length: message.scaleInfo.max - message.scaleInfo.min + 1 }, (_, i) => {
                                  const val = message.scaleInfo!.min + i;
                                  const selected = scaleValue[0] === val;
                                  return (
                                    <button
                                      key={val}
                                      onClick={() => setScaleValue([val])}
                                      className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${selected ? 'bg-primary text-white shadow' : 'bg-white border border-border text-text-secondary hover:bg-primary/5'}`}
                                      aria-pressed={selected}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            <Button
                              onClick={handleScaleSubmit}
                              disabled={assistantLoading}
                              size="sm"
                              className="w-full"
                            >
                              Submit Rating
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary mt-1 px-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                {message.type === 'user' && (
                  <div className="w-10 h-10 bg-text-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading Indicator */}
            {assistantLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={20} className="text-white" />
                </div>
                <div className="bg-white border border-border rounded-xl p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            
            {/* Email Capture Form */}
            {isComplete && (
              <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
                <div className="space-y-4">
                  <h3 className="font-semibold text-text-primary">Get Your Leadership Profile</h3>
                  <input 
                    type="email" 
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Button className="btn-assessment w-full">
                    <SpiralElement size="sm" />
                    Get My Results
                    <ArrowRight size={20} />
                  </Button>
                  <p className="text-xs text-text-secondary text-center">
                    Your information is secure and will only be used to send your results.
                  </p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};