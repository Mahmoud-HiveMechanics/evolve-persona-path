import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import { ArrowRight, Send, User, Bot, CheckCircle2, Loader2 } from 'lucide-react';
import { useOpenAIAssistant } from '../hooks/useOpenAIAssistant';
import { useConversation } from '../hooks/useConversation';
import { useAuth } from '../hooks/useAuth';

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
    
    try {
      await addMessage('bot', "I'm getting ready for you. Please wait a moment...");
      
      // Wait for threadId to be available (it might be created asynchronously)
      let attempts = 0;
      const maxAttempts = 10; // Increased attempts
      while (!threadId && attempts < maxAttempts) {
        console.log(`Waiting for thread ID... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!threadId) {
        throw new Error('Thread ID not available after waiting');
      }

      console.log('Thread ID available:', threadId);

      // Initialize OpenAI assistant
      if (!isInitialized) {
        console.log('Initializing assistant...');
        await initializeAssistant();
      }
      
      // Wait for assistant to be initialized
      let assistantAttempts = 0;
      while (!isInitialized && assistantAttempts < 5) {
        console.log(`Waiting for assistant initialization... attempt ${assistantAttempts + 1}/5`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        assistantAttempts++;
      }

      if (!isInitialized) {
        throw new Error('Assistant initialization failed');
      }

      console.log('Assistant initialized successfully');
      
      // Create conversation record
      await createConversation();
      
      // Welcome message
      await addMessage('bot', "Hi! I'm your leadership assessment guide. 👋");
      
      // Wait a moment, then start the conversation
      setTimeout(async () => {
        try {
          console.log('Sending initial message to assistant...');
          await sendMessage("Please start the leadership assessment by asking me the first question.");
        } catch (error) {
          console.error('Error sending initial message:', error);
          await addMessage('bot', "I apologize, but I'm having trouble connecting. Please try refreshing the page and try again.");
        }
      }, 2000); // Increased timeout
      
    } catch (error) {
      console.error('Error initializing assistant:', error);
      await addMessage('bot', "I apologize, but I'm having trouble starting up. Please refresh the page and try again.");
    }
  };

  const handleMultipleChoiceAnswer = async (answer: string) => {
    await addMessage('user', answer);
    setShowCurrentQuestion(false);
    
    // Send response to OpenAI assistant
    await sendMessage(answer);
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
                          <div className="space-y-2">
                            {message.options.map((option, index) => (
                              <button
                                key={index}
                                onClick={() => handleMultipleChoiceAnswer(option)}
                                className="group w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 disabled:opacity-50"
                                disabled={assistantLoading}
                                data-focus-target={index === 0}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full border-2 border-border group-hover:border-primary group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                                    <span className="text-[10px] font-medium text-text-secondary group-hover:text-primary">
                                      {String.fromCharCode(65 + index)}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{option}</span>
                                </div>
                              </button>
                            ))}
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
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-text-secondary">
                                {openEndedResponse.length}/500 characters
                              </span>
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