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



export const Assessment = () => {
  const navigate = useNavigate();
  const MIN_QUESTIONS = 26; // 24 core questions + 2 wrap-up questions
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [evaluationGenerating, setEvaluationGenerating] = useState(false);
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
    const pool = isMc ? ['Could you share more about your leadership approach?'] : ['Tell me about a leadership challenge you faced.'];
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

  // Enhanced pre-assessment intro fields for better AI adaptation
  const [introDone, setIntroDone] = useState(false);
  const [introPosition, setIntroPosition] = useState('');
  const [introRole, setIntroRole] = useState('');
  const [introTeamSize, setIntroTeamSize] = useState('');
  const [introMotivation, setIntroMotivation] = useState('');
  const [introIndustry, setIntroIndustry] = useState('');
  const [introExperience, setIntroExperience] = useState('');
  const [introChallenges, setIntroChallenges] = useState('');
  // Finalization state
  const [hasNavigated, setHasNavigated] = useState(false);

  // Follow-ups handled by AI; local flags removed

  const { conversationId, createConversation, saveMessage, markConversationComplete } = useConversation();

  // OpenAI assistant not needed for predefined questions
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);

  // Enhanced AI-Driven Question Generation System with Adaptive Intelligence
  const getNextQuestionFromAI = async () => {
    if (!profile) {
      return;
    }

    setAiProcessing(true);
    const askedCount = askedQuestionsRef.current.size;
    
    console.log(`🎯 Question ${askedCount + 1}: AI-Generated Question (Adaptive Mode)`);
    
    try {
      // Send ALL bot messages with principle_focus metadata for complete coverage tracking
      const conversationHistory = messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        isQuestion: msg.isQuestion,
        questionType: msg.questionType,
        principle_focus: msg.principle_focus,
        assessment_stage: msg.assessment_stage
      }));

      // Extract question type history for variety enforcement
      const questionTypeHistory = messages
        .filter(msg => msg.isQuestion && msg.questionType)
        .map(msg => msg.questionType!);

      // Calculate principle coverage for completion check
      const principleCoverage: { [key: string]: number } = {};
      conversationHistory.forEach(msg => {
        if (msg.type === 'bot' && msg.principle_focus) {
          principleCoverage[msg.principle_focus] = (principleCoverage[msg.principle_focus] || 0) + 1;
        }
      });

      console.log('Calling dynamic-question-generator with:', {
        conversationId,
        profile,
        questionCount: askedCount,
        historyLength: conversationHistory.length,
        questionTypeHistory,
        principleCoverage
      });

      // Create timeout promise (35 seconds to match backend)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Question generation timeout')), 35000);
      });

      // Call the AI service with timeout
      const response = await Promise.race([
        supabase.functions.invoke('dynamic-question-generator', {
          body: {
            conversationId,
            profile,
            conversationHistory,
            questionCount: askedCount,
            questionTypeHistory
          }
        }),
        timeoutPromise
      ]);

      const { data, error } = response as any;

      if (error) {
        console.error('Error generating question:', error);
        throw error;
      }

      if (data?.question) {
        const q = {
          question: data.question.question,
          type: data.question.type,
          options: data.question.options,
          most_least_options: data.question.most_least_options,
          scale_info: data.question.scale_info,
          principle_focus: data.question.principle_focus,
          assessment_stage: data.question.assessment_stage
        } as any;
        
        console.log('✅ Generated AI question:', q);
        console.log('🎯 Principle Focus:', q.principle_focus, '| Stage:', q.assessment_stage);
        setCurrentQuestion(q);
      } else {
        throw new Error('No question returned from AI service');
      }
    } catch (error) {
      console.error('Failed to generate AI question:', error);
      
      // Enhanced fallback questions based on stage
      const isEarlyStage = askedCount < 5;
      const fallbackQuestions = isEarlyStage ? [
        {
          question: "How would you describe your natural leadership style?",
          type: "multiple-choice",
          options: ["Collaborative and team-focused", "Direct and results-oriented", "Supportive and people-first", "Strategic and visionary"]
        },
        {
          question: "On a scale of 1-10, how confident are you in making difficult decisions under pressure?",
          type: "scale",
          scale_info: { min: 1, max: 10, min_label: "Not confident", max_label: "Very confident" }
        },
        {
          question: "When facing a team challenge, what approach most and least represents your style?",
          type: "most-least-choice",
          most_least_options: ["Address it directly with the team", "Seek input from key stakeholders", "Analyze data to find solutions", "Focus on long-term implications"]
        }
      ] : [
        {
          question: "Tell me about a time when you had to lead your team through a difficult change.",
          type: "open-ended"
        },
        {
          question: "What's the most important lesson you've learned about leadership?",
          type: "open-ended"
        },
        {
          question: "How do you handle situations where team members disagree with your decisions?",
          type: "open-ended"
        }
      ];
      
      const fallbackIndex = askedCount % fallbackQuestions.length;
      setCurrentQuestion(fallbackQuestions[fallbackIndex]);
    }
    
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

    // Save message to database with error handling
    try {
      await saveMessage(newMessage);
    } catch (error) {
      console.error('Failed to save message to database:', error);
    }
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
        scaleInfo: currentQuestion.scale_info,
        principle_focus: currentQuestion.principle_focus,
        assessment_stage: currentQuestion.assessment_stage
      });
      setShowCurrentQuestion(true);
      setQuestionCount(nextCount);
      askedQuestionsRef.current.add(currentQuestion.question);
      askedNormalizedRef.current.add(norm);
      if (currentQuestion.type === 'multiple-choice' && mcAskedCount < 4) {
        setMcAskedCount((c) => c + 1);
        // Track used MC option sets to prevent repeating the same options
        const sig = currentQuestion.options ? currentQuestion.options.join('|') : '';
        if (sig) console.log('Question options signature:', sig);
      }
    }
  }, [currentQuestion, showCurrentQuestion, questionCount, navigate, mcAskedCount]);

  const handleStart = async () => {
    setIsStarted(true);
    setKickoffSent(false);
  };

  // Build enhanced participant profile once intro is completed
  useEffect(() => {
    if (!isStarted || !introDone) return;
    const profile: Profile = {
      position: (introPosition || '').trim(),
      role: (introRole || '').trim(),
      teamSize: Number(introTeamSize || 0),
      motivation: (introMotivation || '').trim(),
      industry: (introIndustry || '').trim(),
      experience: (introExperience || '').trim(),
      challenges: (introChallenges || '').trim(),
    };
    setProfile(profile);
  }, [isStarted, introDone, introPosition, introRole, introTeamSize, introMotivation, introIndustry, introExperience, introChallenges]);

  // remove old local follow-up helpers (now handled by AI prompt)





  // Kick off conversation once intro info collected
  useEffect(() => {
    const kickOff = async () => {
      if (!isStarted || kickoffSent || !introDone || !profile) return;
      try {
        const convId = await createConversation();
        if (!convId) {
          console.error('Failed to create conversation - messages will not be saved');
          await addMessage('bot', "I apologize, but I'm having trouble connecting. Please try refreshing the page and try again.");
          return;
        }
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
      
    // Check if assessment is complete - all 12 principles with minimum 2 questions each
    const principleCoverage: { [key: string]: number } = {};
    messages.forEach(msg => {
      if (msg.type === 'bot' && msg.principle_focus) {
        principleCoverage[msg.principle_focus] = (principleCoverage[msg.principle_focus] || 0) + 1;
      }
    });
    
    const allPrinciplesHaveMinimum = Object.keys(principleCoverage).length >= 12 && 
                                      Object.values(principleCoverage).every(count => count >= 2);
    
    if (allPrinciplesHaveMinimum || askedQuestionsRef.current.size >= MIN_QUESTIONS) {
      console.log('Assessment complete - Principle coverage:', principleCoverage);
      
      // Add professional closing message before evaluation
      await addMessage('bot', "Thank you for taking the time to share your leadership insights with me. I've got everything I need to prepare your results. Hold on just a moment while I analyze your responses and create your personalized leadership evaluation.");
      
      setIsComplete(true);
      setEvaluationGenerating(true);
      
      // Add timeout to prevent infinite loading
      setTimeout(() => {
        if (!hasNavigated) {
          console.log('Timeout reached, navigating to evaluation page');
          setEvaluationGenerating(false);
          setHasNavigated(true);
          navigate('/evaluation');
        }
      }, 30000); // 30 second timeout
      
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

    // Check if assessment is complete
    const principleCoverage: { [key: string]: number } = {};
    messages.forEach(msg => {
      if (msg.type === 'bot' && msg.principle_focus) {
        principleCoverage[msg.principle_focus] = (principleCoverage[msg.principle_focus] || 0) + 1;
      }
    });
    
    const allPrinciplesHaveMinimum = Object.keys(principleCoverage).length >= 12 && 
                                      Object.values(principleCoverage).every(count => count >= 2);
    
    if (allPrinciplesHaveMinimum || askedQuestionsRef.current.size >= MIN_QUESTIONS) {
      console.log('Assessment complete - Principle coverage:', principleCoverage);
      
      // Add professional closing message before evaluation
      await addMessage('bot', "Thank you for taking the time to share your leadership insights with me. I've got everything I need to prepare your results. Hold on just a moment while I analyze your responses and create your personalized leadership evaluation.");
      
      setIsComplete(true);
      setEvaluationGenerating(true);
      
      setTimeout(() => {
        if (!hasNavigated) {
          console.log('Timeout reached, navigating to evaluation page');
          setEvaluationGenerating(false);
          setHasNavigated(true);
          navigate('/evaluation');
        }
      }, 30000);
      
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

    // Check if assessment is complete
    const principleCoverage: { [key: string]: number } = {};
    messages.forEach(msg => {
      if (msg.type === 'bot' && msg.principle_focus) {
        principleCoverage[msg.principle_focus] = (principleCoverage[msg.principle_focus] || 0) + 1;
      }
    });
    
    const allPrinciplesHaveMinimum = Object.keys(principleCoverage).length >= 12 && 
                                      Object.values(principleCoverage).every(count => count >= 2);
    
    if (allPrinciplesHaveMinimum || askedQuestionsRef.current.size >= MIN_QUESTIONS) {
      console.log('Assessment complete - Principle coverage:', principleCoverage);
      setIsComplete(true);
      setEvaluationGenerating(true);
      
      setTimeout(() => {
        if (!hasNavigated) {
          console.log('Timeout reached, navigating to evaluation page');
          setEvaluationGenerating(false);
          setHasNavigated(true);
          navigate('/evaluation');
        }
      }, 30000);
      
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

    // Check if assessment is complete
    const principleCoverage: { [key: string]: number } = {};
    messages.forEach(msg => {
      if (msg.type === 'bot' && msg.principle_focus) {
        principleCoverage[msg.principle_focus] = (principleCoverage[msg.principle_focus] || 0) + 1;
      }
    });
    
    const allPrinciplesHaveMinimum = Object.keys(principleCoverage).length >= 12 && 
                                      Object.values(principleCoverage).every(count => count >= 2);
    
    if (allPrinciplesHaveMinimum || askedQuestionsRef.current.size >= MIN_QUESTIONS) {
      console.log('Assessment complete - Principle coverage:', principleCoverage);
      setIsComplete(true);
      setEvaluationGenerating(true);
      
      setTimeout(() => {
        if (!hasNavigated) {
          console.log('Timeout reached, navigating to evaluation page');
          setEvaluationGenerating(false);
          setHasNavigated(true);
          navigate('/evaluation');
        }
      }, 30000);
      
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

        // Use the enhanced AI evaluation system with proper response format
        const { data: aiEvaluation, error: aiError } = await supabase.functions.invoke('ai-evaluation', {
          body: { 
            responses: messages?.filter(msg => msg.message_type === 'user').map(msg => msg.content) || [],
            conversationContext: messages?.map(msg => `${msg.message_type}: ${msg.content}`).join('\n') || ''
          }
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

        // Clear evaluation generating state
        setEvaluationGenerating(false);

        // Navigate to evaluation page
        setTimeout(() => {
          if (!hasNavigated) {
            setHasNavigated(true);
            navigate('/evaluation');
          }
        }, 1000);
      } catch (e) {
        console.error('Failed to persist evaluation', e);
        // Clear evaluation generating state even on error
        setEvaluationGenerating(false);
        // Navigate to evaluation page which will handle fallback
        setTimeout(() => {
          if (!hasNavigated) {
            setHasNavigated(true);
            navigate('/evaluation');
          }
        }, 2000);
      }
    })();
  }, [isComplete, conversationId, hasNavigated, navigate, markConversationComplete]);

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
                EvolveAI <span className="text-primary">Leadership Assessment</span>
              </h1>
              <p className="text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
                Hi! I'm EvolveAI, your leadership development assistant. I'm here to help you gain deeper insight into your leadership mindset through a warm, conversational assessment that reveals blind spots and creates "aha" moments for growth.
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

                <div className="space-y-6">
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
                      <label className="text-sm font-medium text-text-primary">Industry/Sector</label>
                      <Input
                        value={introIndustry}
                        onChange={(e) => setIntroIndustry(e.target.value)}
                        placeholder="e.g., Technology, Healthcare"
                        className="h-12"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-text-primary">Leadership experience</label>
                      <Input
                        value={introExperience}
                        onChange={(e) => setIntroExperience(e.target.value)}
                        placeholder="e.g., 3 years, First-time manager"
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
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-text-primary">Current leadership challenges (optional)</label>
                    <Textarea
                      value={introChallenges}
                      onChange={(e) => setIntroChallenges(e.target.value)}
                      placeholder="e.g., Managing remote teams, Having difficult conversations"
                      className="min-h-[80px]"
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


            {/* Assessment Complete */}
            {isComplete && (
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-white rounded-2xl p-8 border border-primary/20 shadow-lg">
                <div className="text-center space-y-6">
                  {evaluationGenerating ? (
                    <>
                      <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-text-primary mb-3">Generating Your Evaluation...</h2>
                        <p className="text-text-secondary max-w-md mx-auto">
                          Our AI is analyzing your responses to create a personalized leadership assessment. This will take about 10-15 seconds.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-text-primary mb-3">Assessment Complete!</h2>
                        <p className="text-text-secondary max-w-md mx-auto">
                          Thank you for completing your leadership assessment. Your personalized evaluation is now ready.
                        </p>
                      </div>
                      <Button 
                        onClick={() => {
                          setHasNavigated(true);
                          navigate('/evaluation');
                        }}
                        className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        View My Report
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </>
                  )}
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
