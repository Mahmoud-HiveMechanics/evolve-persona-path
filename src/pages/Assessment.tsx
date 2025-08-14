import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import { ArrowRight, Send, User, Bot } from 'lucide-react';
import { useOpenAIAssistant } from '../hooks/useOpenAIAssistant';

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
  
  const { 
    isInitialized, 
    isLoading: assistantLoading, 
    error: assistantError, 
    currentQuestion, 
    sendMessage, 
    initializeAssistant 
  } = useOpenAIAssistant();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, assistantLoading]);

  const addMessage = (type: 'bot' | 'user', content: string, questionData?: Partial<ChatMessage>) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      ...questionData
    };
    setMessages(prev => [...prev, newMessage]);
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
    }
  }, [currentQuestion, showCurrentQuestion]);

  const handleStart = async () => {
    setIsStarted(true);
    
    try {
      // Welcome message
      addMessage('bot', "Hi! I'm your leadership assessment guide. 👋");
      
      // Initialize OpenAI assistant first
      if (!isInitialized) {
        await initializeAssistant();
      }
      
      // Wait a moment, then start the conversation
      setTimeout(async () => {
        try {
          await sendMessage("Please start the leadership assessment by asking me the first question.");
        } catch (error) {
          console.error('Error sending initial message:', error);
          addMessage('bot', "I apologize, but I'm having trouble connecting. Please try refreshing the page.");
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error initializing assistant:', error);
      addMessage('bot', "I apologize, but I'm having trouble starting up. Please try refreshing the page.");
    }
  };

  const handleMultipleChoiceAnswer = async (answer: string) => {
    addMessage('user', answer);
    setShowCurrentQuestion(false);
    
    // Send response to OpenAI assistant
    await sendMessage(answer);
  };

  const handleOpenEndedSubmit = async () => {
    if (!openEndedResponse.trim()) return;
    
    addMessage('user', openEndedResponse);
    setShowCurrentQuestion(false);
    
    // Send response to OpenAI assistant
    await sendMessage(openEndedResponse);
    setOpenEndedResponse('');
  };

  const handleScaleSubmit = async () => {
    const scaleResponse = `${scaleValue[0]} out of 10`;
    addMessage('user', scaleResponse);
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
        {/* Progress Bar */}
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">
                Question {questionCount} of ~{totalQuestions}
              </span>
              <span className="text-sm text-text-secondary">
                {Math.round(progress)}% complete
              </span>
            </div>
          <div className="progress-bar h-2">
            <div 
              className="progress-fill h-full" 
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
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
                                className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-smooth text-sm"
                                disabled={assistantLoading}
                              >
                                {option}
                              </button>
                            ))}
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
                                <span className="font-medium">{scaleValue[0]}</span>
                                <span>{message.scaleInfo.max_label}</span>
                              </div>
                            </div>
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