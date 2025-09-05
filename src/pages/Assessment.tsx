import { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import { ArrowRight, Send, User, Bot, Mic, Square, Check } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { MostLeastChoice } from '../components/MostLeastChoice';
import { supabase } from '@/integrations/supabase/client';

import { useConversation } from '../hooks/useConversation';
import { Input } from '../components/ui/input';
import { useNavigate } from 'react-router-dom';
import { ChatMessage } from '@/types/shared';
import type { Profile } from '@/config/assessment';
import { ASSESSMENT_SYSTEM_PROMPT } from '@/config/assistantPrompt';
import { ASSESSMENT_FRAMEWORK } from '@/config/assessmentFramework';
import { analyzeLeadershipStyle, extractMCQAnswers, type LeadershipStyle } from '@/lib/leadershipAnalysis';
import { 
  STYLE_DETECTION_QUESTIONS, 
  LEADERSHIP_STYLE_QUESTIONS,
  determineLeadershipStyle,
  getQuestionsForStyle,
  LEADERSHIP_STYLE_DESCRIPTIONS,
  type LeadershipStyleType 
} from '@/config/leadershipStyleRouting';



export const Assessment = () => {
  const navigate = useNavigate();
  const MIN_QUESTIONS = 15; // 4 style detection + 11 style-specific questions
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showCurrentQuestion, setShowCurrentQuestion] = useState(false);
  const [openEndedResponse, setOpenEndedResponse] = useState('');
  const [scaleValue, setScaleValue] = useState([5]);
  const [questionCount, setQuestionCount] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [kickoffSent, setKickoffSent] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [mcPending, setMcPending] = useState(false);
  const [mcOtherValue, setMcOtherValue] = useState('');
  const [mostSelection, setMostSelection] = useState<string | undefined>();
  const [leastSelection, setLeastSelection] = useState<string | undefined>();
  const [aiProcessing, setAiProcessing] = useState(false);
  const [leadershipStyle, setLeadershipStyle] = useState<LeadershipStyle | null>(null);
  const [detectedLeadershipStyle, setDetectedLeadershipStyle] = useState<LeadershipStyleType | null>(null);
  const [styleQuestions, setStyleQuestions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track last shown question to prevent duplicates and count MC in opening phase
  // Remove unused lastQuestionText to satisfy linter
  const askedQuestionsRef = useRef<Set<string>>(new Set());
  const [mcAskedCount, setMcAskedCount] = useState(0);
  const askedNormalizedRef = useRef<Set<string>>(new Set());
  const normalizeQuestion = (s: string) =>
    s
      .toLowerCase()
      .replace(/\(next\)/g, '')
      .replace(/\(alt.*?\)/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const ensureUniqueQuestion = (baseText: string, isMc: boolean): string => {
    let text = baseText;
    let norm = normalizeQuestion(text);
    if (!askedNormalizedRef.current.has(norm)) return text;
    const pool = isMc ? MC_FALLBACK_TEXTS : OPEN_FALLBACK_TEXTS;
    for (const candidate of pool) {
      const n = normalizeQuestion(candidate);
      if (!askedNormalizedRef.current.has(n)) return candidate;
    }
    // As a last resort, append numbered variant until normalization differs
    let idx = 2;
    while (askedNormalizedRef.current.has(norm)) {
      text = `${baseText} (alt ${idx})`;
      norm = normalizeQuestion(text);
      idx += 1;
    }
    return text;
  };
  // Leadership Style Routing System - clean and deterministic

  // Pre-assessment intro fields
  const [introDone, setIntroDone] = useState(false);
  const [introPosition, setIntroPosition] = useState('');
  const [introRole, setIntroRole] = useState('');
  const [introTeamSize, setIntroTeamSize] = useState('');
  const [introMotivation, setIntroMotivation] = useState('');
  // Finalization state
  const [hasNavigated, setHasNavigated] = useState(false);

  // Follow-ups handled by AI; local flags removed

  const { conversationId, createConversation, saveMessage, markConversationComplete } = useConversation();

  // OpenAI assistant not needed for predefined questions
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);

  // New Leadership Style Routing System
  const getNextQuestionFromAI = async () => {
    if (!profile) {
      return;
    }

    setAiProcessing(true);
    const askedCount = askedQuestionsRef.current.size;
    
    console.log(`🎯 Question ${askedCount + 1}: Leadership Style Routing`);
    
    // Phase 1: Style Detection Questions (Questions 1-4)
    if (askedCount < 4) {
      console.log(`📋 Using Style Detection Question ${askedCount + 1} of 4`);
      const next = STYLE_DETECTION_QUESTIONS[askedCount];
      const q = {
        question: next.text,
        type: next.type,
        options: next.options,
        most_least_options: next.most_least_options,
      } as any;
      setCurrentQuestion(q);
      setAiProcessing(false);
      return;
    }
    
    // Phase 2: Leadership Style Analysis (After Question 4)
    if (askedCount === 4 && !detectedLeadershipStyle) {
      console.log('🧠 Analyzing Leadership Style from MCQ answers...');
      
      // Extract answers from the first 4 questions
      const userMessages = messages.filter(msg => msg.type === 'user');
      const styleAnswers = userMessages.slice(0, 4).map(msg => msg.content);
      
      console.log('Style Detection Answers:', styleAnswers);
      
      if (styleAnswers.length >= 4) {
        const detectedStyle = determineLeadershipStyle(styleAnswers);
        setDetectedLeadershipStyle(detectedStyle);
        
        // Get the style-specific questions
        const questionsForStyle = getQuestionsForStyle(detectedStyle);
        setStyleQuestions(questionsForStyle);
        
        const styleInfo = LEADERSHIP_STYLE_DESCRIPTIONS[detectedStyle];
        console.log(`✅ Leadership Style Detected: ${styleInfo.name}`);
        console.log(`📚 Loaded ${questionsForStyle.length} style-specific questions`);
        
        // Show style confirmation message
        await addMessage('bot', `Based on your responses, I've identified you as a **${styleInfo.name}**. ${styleInfo.description} 

The next questions will focus on your growth areas: ${styleInfo.growthAreas.join(', ')}.`);
      }
    }
    
    // Phase 3: Style-Specific Questions (Questions 5-15)
    if (askedCount >= 4 && detectedLeadershipStyle && styleQuestions.length > 0) {
      const questionIndex = askedCount - 4; // Questions 5-15 map to indices 0-10
      
      if (questionIndex < styleQuestions.length) {
        console.log(`🎯 Using ${detectedLeadershipStyle} Question ${questionIndex + 1} of ${styleQuestions.length}`);
        const next = styleQuestions[questionIndex];
        const q = {
          question: next.text,
          type: next.type,
          options: next.options,
          most_least_options: next.most_least_options,
          scale_info: next.scale_info
        } as any;
        setCurrentQuestion(q);
        setAiProcessing(false);
        return;
      }
    }
    
    // Phase 4: Assessment Complete
    console.log('🏁 Assessment Complete - All questions answered');
    setIsComplete(true);
    setAiProcessing(false);
  };

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

    // Save message to database
    await saveMessage(newMessage);
  };

  // When a new currentQuestion is set, show it and increment display counter
  useEffect(() => {
    if (currentQuestion && !showCurrentQuestion) {
      // If duplicate, replace locally with a unique fallback (no recursion)
      const norm = normalizeQuestion(currentQuestion.question);
      if (askedNormalizedRef.current.has(norm)) {
        const uniqueText = ensureUniqueQuestion(
          currentQuestion.question,
          currentQuestion.type === 'multiple-choice'
        );
        setCurrentQuestion({ ...currentQuestion, question: uniqueText } as any);
        return;
      }
      const nextCount = questionCount + 1;
      addMessage('bot', currentQuestion.question, {
        isQuestion: true,
        questionType: currentQuestion.type,
        options: currentQuestion.options,
        mostLeastOptions: currentQuestion.most_least_options,
        scaleInfo: currentQuestion.scale_info
      });
      setShowCurrentQuestion(true);
      setQuestionCount(nextCount);
      askedQuestionsRef.current.add(currentQuestion.question);
      askedNormalizedRef.current.add(norm);
      if (currentQuestion.type === 'multiple-choice' && mcAskedCount < 4) {
        setMcAskedCount((c) => c + 1);
        // Track used MC option sets to prevent repeating the same options
        const sig = currentQuestion.options ? optionsSignature(currentQuestion.options) : '';
        if (sig) askedMcOptionSigsRef.current.add(sig);
      }
    }
  }, [currentQuestion, showCurrentQuestion, questionCount, navigate, mcAskedCount]);

  const handleStart = async () => {
    setIsStarted(true);
    setKickoffSent(false);
  };

  // Build participant profile once intro is completed
  useEffect(() => {
    if (!isStarted || !introDone) return;
    const profile: Profile = {
      position: (introPosition || '').trim(),
      role: (introRole || '').trim(),
      teamSize: Number(introTeamSize || 0),
      motivation: (introMotivation || '').trim(),
    };
    setProfile(profile);
  }, [isStarted, introDone, introPosition, introRole, introTeamSize, introMotivation]);

  // remove old local follow-up helpers (now handled by AI prompt)





  // Kick off conversation once intro info collected
  useEffect(() => {
    const kickOff = async () => {
      if (!isStarted || kickoffSent || !introDone || !profile) return;
      try {
        await createConversation();
        await addMessage('bot', "Hi! I'm your leadership assessment guide. Let's begin! 👋");
        // Ask the first AI-driven question (forced MC)
        await getNextQuestionFromAI();
        setKickoffSent(true);
      } catch (error) {
        console.error('Error in kickoff:', error);
        await addMessage('bot', "I apologize, but I'm having trouble connecting. Please try refreshing the page and try again.");
      }
    };
    kickOff();
  }, [isStarted, kickoffSent, introDone, profile]);

  const handleMultipleChoiceAnswer = async (answer: string) => {
    setMcPending(true);
    try {
      await addMessage('user', answer);
      setShowCurrentQuestion(false);
      
      // Clear current question first to ensure clean state
      setCurrentQuestion(null);
      
      // Check if assessment is complete (15 total questions)
      if (askedQuestionsRef.current.size >= MIN_QUESTIONS) {
        setIsComplete(true);
        return;
      }
      
      // Continue to next question in the routing system
      await getNextQuestionFromAI();
    } finally {
      setMcPending(false);
    }
  };

  const handleOpenEndedSubmit = async () => {
    if (!openEndedResponse.trim()) return;

    await addMessage('user', openEndedResponse);
    setShowCurrentQuestion(false);
    setOpenEndedResponse('');

    // Clear current question first to ensure clean state
    setCurrentQuestion(null);

    // Check if assessment is complete (15 total questions)
    if (askedQuestionsRef.current.size >= MIN_QUESTIONS) {
      setIsComplete(true);
      return;
    }
    
    // Continue to next question in the routing system
    await getNextQuestionFromAI();
  };

  const handleScaleSubmit = async () => {
    const scaleResponse = `${scaleValue[0]} out of 10`;
    await addMessage('user', scaleResponse);
    setShowCurrentQuestion(false);
    setScaleValue([5]); // Reset to middle value

    // Clear current question first to ensure clean state
    setCurrentQuestion(null);

    // Check if assessment is complete (15 total questions)
    if (askedQuestionsRef.current.size >= MIN_QUESTIONS) {
      setIsComplete(true);
      return;
    }
    
    // Continue to next question in the routing system
    await getNextQuestionFromAI();
  };

  const handleMostLeastAnswer = async (most: string, least: string) => {
    const response = `Most like me: ${most}\nLeast like me: ${least}`;
    await addMessage('user', response);
    setShowCurrentQuestion(false);
    setMostSelection(undefined);
    setLeastSelection(undefined);

    // Clear current question first to ensure clean state
    setCurrentQuestion(null);

    // Check if assessment is complete (15 total questions)
    if (askedQuestionsRef.current.size >= MIN_QUESTIONS) {
      setIsComplete(true);
      return;
    }
    
    // Continue to next question in the routing system
    await getNextQuestionFromAI();
  };


  // Persist evaluation when complete and mark conversation as complete
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

        // Generate evaluation based on user responses using AI
        console.log('User responses for evaluation:', messages?.length);

        // Use the enhanced AI evaluation system
        const { data: aiEvaluation, error: aiError } = await supabase.functions.invoke('ai-evaluation', {
          body: { messages: messages || [] }
        });

        let evaluationData;
        if (aiError || !aiEvaluation) {
          console.error('AI evaluation failed, using fallback:', aiError);
          // Fallback to rule-based evaluation if AI fails
          const userResponses = messages
            ?.filter(msg => msg.message_type === 'user')
            .map(msg => msg.content) || [];
          const { generateEvaluationFromResponses } = await import('@/lib/evaluationGenerator');
          evaluationData = generateEvaluationFromResponses(userResponses);
        } else {
          evaluationData = aiEvaluation;
        }
        
        console.log('Generated evaluation:', evaluationData);

        const { error: evalInsertError } = await (supabase as any)
          .from('evaluations')
          .insert([
            {
              user_id: userId,
              conversation_id: conversationId,
              summary: evaluationData.overall?.summary || 'Leadership assessment completed',
              data: evaluationData
            }
          ]);

        if (evalInsertError) {
          console.error('Failed to insert evaluation', evalInsertError);
        } else {
          console.log('Evaluation generated and saved successfully');
        }

        // Mark conversation as complete
        await markConversationComplete();

        setHasNavigated(true);
      } catch (e) {
        console.error('Failed to persist evaluation', e);
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

                        {message.questionType === 'most-least-choice' && message.mostLeastOptions && (
                          <MostLeastChoice
                            options={message.mostLeastOptions}
                            mostSelection={mostSelection}
                            leastSelection={leastSelection}
                            onSelectionChange={(most, least) => {
                              setMostSelection(most);
                              setLeastSelection(least);
                            }}
                            onSubmit={() => {
                              if (mostSelection && leastSelection) {
                                handleMostLeastAnswer(mostSelection, leastSelection);
                              }
                            }}
                            disabled={false}
                          />
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

            {/* AI Processing Loading Indicator */}
            {aiProcessing && (
              <div className="flex gap-4 justify-start">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                  <Bot size={22} className="text-white" />
                </div>
                <div className="bg-white/90 backdrop-blur-sm border border-primary/10 rounded-xl p-6 shadow-sm">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2 pt-2">
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
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
