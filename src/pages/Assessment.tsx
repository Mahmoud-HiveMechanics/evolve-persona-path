import { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import { ArrowRight, Send, User, Bot, Mic, Square, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { useConversation } from '../hooks/useConversation';
import { Input } from '../components/ui/input';
import { useNavigate } from 'react-router-dom';
import { ChatMessage } from '@/types/shared';
import { buildPersonalizedQuestions } from '@/lib/personalize';
import type { Profile } from '@/config/assessment';


export const Assessment = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showCurrentQuestion, setShowCurrentQuestion] = useState(false);
  const [openEndedResponse, setOpenEndedResponse] = useState('');
  const [scaleValue, setScaleValue] = useState([5]);
  const [questionCount, setQuestionCount] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const totalQuestions = questions.length;
  const [kickoffSent, setKickoffSent] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [mcPending, setMcPending] = useState(false);
  const [mcOtherValue, setMcOtherValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Pre-assessment intro fields
  const [introDone, setIntroDone] = useState(false);
  const [introPosition, setIntroPosition] = useState('');
  const [introRole, setIntroRole] = useState('');
  const [introTeamSize, setIntroTeamSize] = useState('');
  const [introMotivation, setIntroMotivation] = useState('');
  // Finalization state
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Follow-up question state
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  const maxFollowUps = 3; // Limit follow-ups to keep assessment reasonable
  
  const { conversationId, threadId, createConversation, saveMessage, markConversationComplete } = useConversation();
  
  // OpenAI assistant not needed for predefined questions
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup MediaRecorder and streams on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      // Clean up any remaining media streams
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
    
    // Save to database - create a proper message object
    const messageToSave: ChatMessage = {
      id: newMessage.id,
      type,
      content,
      timestamp: newMessage.timestamp,
      questionType: questionData?.questionType,
      options: questionData?.options,
      scaleInfo: questionData?.scaleInfo ? {
        min: questionData.scaleInfo.min,
        max: questionData.scaleInfo.max,
        min_label: questionData.scaleInfo.min_label,
        max_label: questionData.scaleInfo.max_label
      } : undefined
    };
    await saveMessage(messageToSave);
  };

  // Handle predefined questions and follow-ups
  useEffect(() => {
    if (currentQuestion && !showCurrentQuestion) {
      // For follow-up questions, don't increment the main question count
      const nextCount = isFollowUp ? questionCount : questionCount + 1;
      
      if (!isFollowUp && nextCount > totalQuestions) {
        setIsComplete(true);
        markConversationComplete();
        setShowCurrentQuestion(false);
        return;
      }

      addMessage('bot', currentQuestion.question, {
        isQuestion: true,
        questionType: currentQuestion.type,
        options: currentQuestion.options,
        scaleInfo: currentQuestion.scale_info
      });
      setShowCurrentQuestion(true);
      
      // Only increment question count for main questions, not follow-ups
      if (!isFollowUp) {
        setQuestionCount(nextCount);
      }
    }
  }, [currentQuestion, showCurrentQuestion, questionCount, totalQuestions, isFollowUp, navigate]);

  const handleStart = async () => {
    setIsStarted(true);
    setKickoffSent(false);
  };

  // Initialize assistant when start pressed and threadId becomes available
  // No OpenAI assistant initialization needed for predefined questions

  // Build personalized questions once intro is completed
  useEffect(() => {
    if (!isStarted || !introDone) return;
    const profile: Profile = {
      position: (introPosition || '').trim(),
      role: (introRole || '').trim(),
      teamSize: Number(introTeamSize || 0),
      motivation: (introMotivation || '').trim(),
    };
    const personalized = buildPersonalizedQuestions(profile);
    setQuestions(personalized);
    setProfile(profile);
  }, [isStarted, introDone, introPosition, introRole, introTeamSize, introMotivation]);

  const rewriteQuestionIfNeeded = async (q: any): Promise<any> => {
    if (!q?.aiRewrite || !profile) return q;
    try {
      const context = `position=${profile.position || 'N/A'}, role=${profile.role || 'N/A'}, teamSize=${profile.teamSize || 0}, motivation=${profile.motivation || ''}`;
      const prompt = `Rewrite this question to be specific to the user's context. Keep meaning intact and under 25 words.\n\nBase question: "${q.question}"\nContext: ${context}`;
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { action: 'direct_completion', prompt }
      });
      if (!error && data?.response) {
        const rewritten = String(data.response).trim();
        if (rewritten) {
          return { ...q, question: rewritten };
        }
      }
      return q;
    } catch (_e) {
      return q;
    }
  };

  // Function to decide when to ask follow-up questions
  const decideShouldFollowUp = (response: string, currentQuestionIndex: number): boolean => {
    console.log('🔥 SIMPLE CHECK - Question:', currentQuestionIndex, 'Response:', response.substring(0, 30));
    
    // FORCE follow-ups on questions 1, 3, 6, 9
    const followUpQuestions = [1, 3, 6, 9];
    const shouldFollowUp = followUpQuestions.includes(currentQuestionIndex);
    
    console.log('🔥 Should follow up?', shouldFollowUp, 'for question', currentQuestionIndex);
    return shouldFollowUp;
  };

  // Function to generate follow-up questions using OpenAI
  const generateFollowUpQuestion = async (userResponse: string, questionIndex: number): Promise<string | null> => {
    console.log('🤖 Generating follow-up for:', userResponse.substring(0, 50));
    
    try {
      const originalQuestion = questions[questionIndex - 1]?.question || 'the previous question';
      
      const prompt = `You are an expert leadership assessment interviewer. Based on this response to "${originalQuestion}":

"${userResponse}"

Generate a natural, conversational follow-up question that:
1. Digs deeper into their specific situation
2. Asks for concrete examples or details
3. Explores the impact or outcome
4. Is different from "Can you tell me more about that?"
5. Feels like a natural conversation, not an interrogation

Respond with just the follow-up question, no explanation. Keep it under 20 words.`;

      console.log('🔥 About to call supabase function...');

      const response = await supabase.functions.invoke('chat-assistant', {
        body: {
          action: 'direct_completion',
          prompt: prompt
        }
      });

      console.log('🔥 FULL RESPONSE:', JSON.stringify(response, null, 2));

      if (response.error) {
        console.error('❌ Supabase function error:', response.error);
        // Show user-friendly error
        alert(`OpenAI Error: ${JSON.stringify(response.error)}`);
        return null;
      }

      if (!response.data) {
        console.error('❌ No data in response');
        alert('No data returned from OpenAI function');
        return null;
      }

      const followUpQuestion = response.data?.response?.trim();
      console.log('✅ Generated follow-up question:', followUpQuestion);
      
      if (!followUpQuestion) {
        console.log('❌ Empty follow-up question');
        alert('OpenAI returned empty response');
        return null;
      }
      
      return followUpQuestion;
    } catch (error) {
      console.error('❌ Exception in generateFollowUpQuestion:', error);
      alert(`Exception: ${error}`);
      return null;
    }
  };





  // Kick off conversation once intro info collected
  useEffect(() => {
    const kickOff = async () => {
      if (!isStarted || kickoffSent || !introDone) return;
      
      try {
        await createConversation();
        await addMessage('bot', "Hi! I'm your leadership assessment guide. Let's begin! 👋");
        
        setKickoffSent(true);
        
        // Start with first question immediately
        setTimeout(async () => {
          const firstQuestion = await rewriteQuestionIfNeeded(questions[0]);
          setCurrentQuestion(firstQuestion);
        }, 1000);
        
      } catch (error) {
        console.error('Error in kickoff:', error);
        await addMessage('bot', "I apologize, but I'm having trouble connecting. Please try refreshing the page and try again.");
      }
    };
    kickOff();
  }, [isStarted, kickoffSent, introDone]);

  const handleMultipleChoiceAnswer = async (answer: string) => {
    setMcPending(true);
    try {
      await addMessage('user', answer);
      setShowCurrentQuestion(false);
      
      // Clear current question first to ensure clean state
      setCurrentQuestion(null);
      
      // Move to next question
      const nextQuestionIndex = questionCount;
      if (nextQuestionIndex < questions.length) {
        setTimeout(async () => {
          const nextQuestion = await rewriteQuestionIfNeeded(questions[nextQuestionIndex]);
          setCurrentQuestion(nextQuestion);
        }, 1500);
      } else {
        setIsComplete(true);
        markConversationComplete();
      }
    } finally {
      setMcPending(false);
    }
  };

  const handleOpenEndedSubmit = async () => {
    if (!openEndedResponse.trim()) return;
    
    await addMessage('user', openEndedResponse);
    setShowCurrentQuestion(false);
    const currentResponse = openEndedResponse;
    setOpenEndedResponse('');
    
    // Clear current question first to ensure clean state
    setCurrentQuestion(null);
    
    // Don't ask follow-up to a follow-up - only ask follow-ups to main questions
    if (isFollowUp) {
      console.log('This was a follow-up response, moving to next main question');
      setIsFollowUp(false); // Reset follow-up state
      // Continue to normal flow after follow-up
    }
    
    // Decide if we should ask a follow-up question (only for main questions)
    const shouldAskFollowUp = !isFollowUp && decideShouldFollowUp(currentResponse, questionCount);
    
    console.log('🔍 DETAILED Follow-up check:', {
      shouldAskFollowUp, 
      followUpCount, 
      maxFollowUps, 
      isFollowUp, 
      questionCount,
      currentResponse: currentResponse.substring(0, 50),
      hasThreadId: !!threadId
    });
    
    if (shouldAskFollowUp && followUpCount < maxFollowUps) {
      console.log('✅ Generating follow-up question based on response:', currentResponse);
      
      try {
        const followUpQuestion = await generateFollowUpQuestion(currentResponse, questionCount);
        console.log('Generated follow-up question:', followUpQuestion);
        if (followUpQuestion) {
          setIsFollowUp(true);
          setFollowUpCount(prev => prev + 1);
          setTimeout(() => {
            setCurrentQuestion({
              question: followUpQuestion,
              type: 'open-ended' as const
            });
          }, 1000); // Brief delay for smooth transition
          return;
        } else {
          console.log('❌ No follow-up question generated, continuing with normal flow');
        }
      } catch (error) {
        console.error('❌ Error generating follow-up question:', error);
        // Fall through to normal question flow if follow-up fails
      }
    } else {
      console.log('❌ Follow-up conditions not met:', {
        shouldAskFollowUp, 
        followUpCountOk: followUpCount < maxFollowUps,
        currentFollowUpCount: followUpCount
      });
    }
    
    // Normal question flow
    setIsFollowUp(false);
    const nextQuestionIndex = questionCount;
    console.log('Current questionCount:', questionCount, 'Next question index:', nextQuestionIndex);
    console.log('Next question will be:', questions[nextQuestionIndex]?.question);
    
    if (nextQuestionIndex < questions.length) {
      setTimeout(() => {
        const nextQuestion = questions[nextQuestionIndex];
        console.log('Setting next question:', nextQuestion.question);
        setCurrentQuestion(nextQuestion);
      }, 1500);
    } else {
      console.log('Assessment complete - no more questions');
      setIsComplete(true);
      markConversationComplete();
    }
  };

  const handleScaleSubmit = async () => {
    const scaleResponse = `${scaleValue[0]} out of 10`;
    await addMessage('user', scaleResponse);
    setShowCurrentQuestion(false);
    setScaleValue([5]); // Reset to middle value
    
    // Clear current question first to ensure clean state
    setCurrentQuestion(null);
    
    // Move to next question
    const nextQuestionIndex = questionCount;
    if (nextQuestionIndex < questions.length) {
      setTimeout(() => {
        const nextQuestion = questions[nextQuestionIndex];
        setCurrentQuestion(nextQuestion);
      }, 1500);
    } else {
      setIsComplete(true);
      markConversationComplete();
    }
  };


  // Persist evaluation when complete (simple guard: when isComplete becomes true)
  useEffect(() => {
    (async () => {
      if (!isComplete || !conversationId || hasNavigated) return;
      try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        if (!userId) return;

        console.log('Assessment complete, generating evaluation...');
        
        // Get all messages from the conversation
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('message_type, content, question_type, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('Error fetching messages:', msgError);
          return;
        }

        // Generate evaluation using OpenAI
        const userResponses = messages
          ?.filter(msg => msg.message_type === 'user')
          .map(msg => msg.content)
          .join('\n\n') || '';

        const evaluationPrompt = `Analyze these leadership assessment responses and provide scores (0-100) for each framework:

Responses:
${userResponses}

Rate the person on these 12 leadership frameworks:
1. Self-Awareness
2. Emotional Intelligence  
3. Communication
4. Decision Making
5. Team Building
6. Conflict Resolution
7. Adaptability
8. Strategic Thinking
9. Coaching & Development
10. Accountability
11. Innovation
12. Resilience

Respond with a JSON object with this structure:
{
  "frameworks": [
    {"key": "self_awareness", "label": "Self-Awareness", "score": 75, "summary": "Shows good self-reflection..."},
    ...
  ],
  "overall": {
    "persona": "The Collaborative Leader",
    "summary": "You demonstrate strong collaborative skills..."
  }
}`;

        const evalResponse = await supabase.functions.invoke('chat-assistant', {
          body: {
            action: 'direct_completion',
            prompt: evaluationPrompt
          }
        });

        let evaluationData;
        if (evalResponse.data?.response) {
          try {
            evaluationData = JSON.parse(evalResponse.data.response);
          } catch (parseError) {
            console.error('Error parsing evaluation JSON:', parseError);
            // Fallback to placeholder
            evaluationData = {
              overall: { 
                persona: "Leadership Assessment Complete",
                summary: 'Your assessment has been completed. View your detailed evaluation for personalized insights.' 
              },
              frameworks: []
            };
          }
        } else {
          // Fallback evaluation
          evaluationData = {
            overall: { 
              persona: "Leadership Assessment Complete",
              summary: 'Your assessment has been completed. View your detailed evaluation for personalized insights.' 
            },
            frameworks: []
          };
        }

        const { error: evalInsertError } = await supabase
          .from('evaluations' as any)
          .insert([
            {
              user_id: userId,
              conversation_id: conversationId,
              summary: evaluationData.overall?.summary || 'Leadership assessment completed',
              data: evaluationData
            }
          ]);
        
        if (evalInsertError) {
          console.warn('Failed to insert evaluation', evalInsertError);
        } else {
          console.log('Evaluation generated and saved successfully');
        }
        
        setHasNavigated(true);
      } catch (e) {
        console.warn('Failed to persist evaluation', e);
      }
    })();
  }, [isComplete, conversationId, hasNavigated]);

  // No assistant error handling needed for predefined questions

  // Assessment progress calculations (currently unused but available for future use)
  // const progress = Math.min((questionCount / totalQuestions) * 100, 100);
  // const milestones = [Math.round(totalQuestions / 3), Math.round((2 * totalQuestions) / 3)];

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-muted/20">
        <Header />
        
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-12">
          <div className="max-w-3xl mx-auto text-center space-y-12">

            
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold text-text-primary leading-tight">
                Leadership <span className="text-primary">Assessment</span>
              </h1>
              <p className="text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
                Welcome! I'm your leadership assessment guide. I'll ask you thoughtful questions 
                and personalized follow-ups to deeply understand your leadership style and help you discover your leadership persona.
              </p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-primary/10 space-y-6">
              <h3 className="text-2xl font-bold text-text-primary">What to <span className="text-primary">expect</span>:</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5">
                  <div className="w-4 h-4 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="font-medium text-text-primary">10 thoughtful questions + personalized follow-ups</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5">
                  <div className="w-4 h-4 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="font-medium text-text-primary">Takes about 10 minutes</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5">
                  <div className="w-4 h-4 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="font-medium text-text-primary">Conversational interface</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5">
                  <div className="w-4 h-4 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="font-medium text-text-primary">Personalized insights at the end</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleStart}
              className="btn-assessment text-xl px-12 py-6 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 bg-gradient-to-r from-primary to-primary/90"
            >
              Start Assessment
              <ArrowRight size={24} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show intro form if assessment started but intro not done
  if (isStarted && !introDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-muted/20">
        <Header />
        
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm border border-primary/20 rounded-2xl p-8 shadow-lg">
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-bold text-text-primary">Before we <span className="text-primary">begin</span></h2>
                  <p className="text-xl text-text-secondary">Help us personalize your assessment experience</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-text-primary">Position</label>
                    <Input 
                      value={introPosition} 
                      onChange={(e) => setIntroPosition(e.target.value)} 
                      placeholder="e.g., Director" 
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-text-primary">Role in the company</label>
                    <Input 
                      value={introRole} 
                      onChange={(e) => setIntroRole(e.target.value)} 
                      placeholder="e.g., Operations" 
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-text-primary">Team size</label>
                    <Input 
                      value={introTeamSize} 
                      onChange={(e) => setIntroTeamSize(e.target.value)} 
                      placeholder="e.g., 12" 
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-text-primary">Motivation for taking this assessment</label>
                    <Input 
                      value={introMotivation} 
                      onChange={(e) => setIntroMotivation(e.target.value)} 
                      placeholder="e.g., grow as a people leader" 
                      className="h-12"
                    />
                  </div>
                </div>
                
                <div className="text-center pt-6">
                  <Button 
                    onClick={() => setIntroDone(true)} 
                    disabled={kickoffSent}
                    className="btn-assessment text-xl px-12 py-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                  >
                    Continue to Assessment
                    <ArrowRight size={24} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/10 via-white to-primary/5">
      <Header />
      
      <div className="max-w-5xl mx-auto px-6 py-8">


        {/* Chat Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-primary/10 h-[700px] flex flex-col shadow-lg">
          {/* Chat Messages */}
          <div className="flex-1 p-8 overflow-y-auto space-y-6 max-h-full">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'bot' && (
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot size={22} className="text-white" />
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
                    
                    {/* Dynamic Question UI based on type - only show for the current active question */}
                    {message.isQuestion && showCurrentQuestion && currentQuestion && message.content === currentQuestion.question && (
                      <div className="mt-4">
                        {message.questionType === 'multiple-choice' && message.options && (
                          <div className="space-y-3">
                            {message.options.map((option, index) => (
                              <button
                                key={index}
                                onClick={() => option.toLowerCase() === 'other' ? null : handleMultipleChoiceAnswer(option)}
                                className="group w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary/70 hover:bg-primary/5 transition-all duration-200 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                disabled={false || mcPending}
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
                                  disabled={false || mcPending}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => mcOtherValue.trim() && handleMultipleChoiceAnswer(mcOtherValue.trim())}
                                  disabled={!mcOtherValue.trim() || false || mcPending}
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
                              disabled={false}
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
                                  disabled={!openEndedResponse.trim() || false}
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
                                disabled={false}
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
                              disabled={false}
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
                  <div className="w-12 h-12 bg-gradient-to-br from-text-secondary to-text-secondary/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                    <User size={22} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading Indicator */}
            {false && (
              <div className="flex gap-4 justify-start">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot size={22} className="text-white" />
                </div>
                <div className="bg-white/90 backdrop-blur-sm border border-primary/10 rounded-xl p-6 shadow-sm">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            
            {/* Assessment Complete - WhatsApp Conversion */}
            {isComplete && (
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-white rounded-2xl p-8 border border-primary/20 shadow-lg">
                <div className="space-y-6 text-center">
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold text-text-primary">Assessment <span className="text-primary">Complete!</span></h3>
                    <p className="text-xl text-text-secondary">Choose how you'd like to continue your leadership journey</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* WhatsApp Option */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                          </svg>
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-text-primary text-lg">Get Personal Coaching</h4>
                          <p className="text-sm text-text-secondary">Recommended</p>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary mb-4 text-left">
                        Continue with our AI leadership coach on WhatsApp for personalized guidance, weekly check-ins, and actionable development plans.
                      </p>
                      <button
                        onClick={() => {
                          const message = encodeURIComponent(`Hi! I just completed the EVOLVE Leadership Assessment and I'm interested in personal coaching to develop my leadership skills further. Can you help me get started?`);
                          window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
                        }}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                        </svg>
                        Start Coaching on WhatsApp
                      </button>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <div className="flex text-yellow-400">
                          {'★'.repeat(5)}
                        </div>
                        <span className="text-xs text-text-secondary">Trusted by 500+ leaders</span>
                      </div>
                    </div>

                    {/* View Report Option */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-text-primary text-lg">View Full Report</h4>
                          <p className="text-sm text-text-secondary">Self-guided</p>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary mb-4 text-left">
                        Access your detailed leadership evaluation, framework scores, and personalized growth recommendations.
                      </p>
                      <button
                        onClick={() => navigate('/evaluation')}
                        className="w-full bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View My Report
                      </button>
                      <p className="text-xs text-text-secondary mt-3 text-center">
                        💡 You can always get coaching later
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-center pt-4">
                    <p className="text-sm text-text-secondary">
                      🔒 Your data is secure and will only be used to provide your personalized coaching experience.
                    </p>
                  </div>
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