import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { ArrowRight, Send, User, Bot } from 'lucide-react';

interface Question {
  id: number;
  type: 'multiple-choice' | 'scale' | 'scenario';
  question: string;
  options?: string[];
  context?: string;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  options?: string[];
  isQuestion?: boolean;
}

const assessmentQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "When facing a complex challenge, what's your first instinct?",
    options: [
      "Gather input from multiple stakeholders",
      "Analyze data and research best practices",
      "Trust my intuition and experience",
      "Break it down into smaller, manageable parts"
    ]
  },
  {
    id: 2,
    type: 'scenario',
    question: "Your team is struggling to meet a critical deadline. How do you respond?",
    context: "The project is 70% complete but behind schedule due to unexpected technical challenges.",
    options: [
      "Work alongside the team to find solutions",
      "Reallocate resources from other projects",
      "Communicate transparently with stakeholders about delays",
      "Focus on the most critical deliverables first"
    ]
  },
  {
    id: 3,
    type: 'scale',
    question: "How comfortable are you with ambiguous situations?",
    options: ["Very uncomfortable", "Somewhat uncomfortable", "Neutral", "Somewhat comfortable", "Very comfortable"]
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "What motivates you most as a leader?",
    options: [
      "Achieving organizational goals",
      "Developing and mentoring others",
      "Driving innovation and change",
      "Building strong relationships and trust"
    ]
  },
  {
    id: 5,
    type: 'scenario',
    question: "A high-performing team member comes to you with concerns about team dynamics. What's your approach?",
    context: "They mention feeling disconnected from the team and question their role in upcoming projects.",
    options: [
      "Schedule one-on-one time to understand their perspective",
      "Facilitate a team discussion about roles and collaboration",
      "Review and clarify team processes and expectations",
      "Connect them with a mentor or coach for additional support"
    ]
  }
];

export const Assessment = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const addMessage = (type: 'bot' | 'user', content: string, options?: string[], isQuestion: boolean = false) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      options,
      isQuestion
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const simulateTyping = (delay: number = 1500) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, delay);
  };

  const handleStart = () => {
    setIsStarted(true);
    
    // Welcome message
    addMessage('bot', "Hi! I'm your leadership assessment guide. 👋");
    
    setTimeout(() => {
      addMessage('bot', "I'll ask you some questions to understand your leadership style and help you discover your leadership persona.");
    }, 1000);
    
    setTimeout(() => {
      addMessage('bot', "This will take about 10 minutes, and your progress is automatically saved. Ready to begin?");
    }, 2000);
    
    setTimeout(() => {
      askNextQuestion();
    }, 3500);
  };

  const askNextQuestion = () => {
    if (currentQuestionIndex >= assessmentQuestions.length) {
      completeAssessment();
      return;
    }

    const question = assessmentQuestions[currentQuestionIndex];
    
    simulateTyping();
    
    setTimeout(() => {
      if (question.context) {
        addMessage('bot', `Context: ${question.context}`);
        setTimeout(() => {
          addMessage('bot', question.question, question.options, true);
          setShowOptions(true);
        }, 1000);
      } else {
        addMessage('bot', question.question, question.options, true);
        setShowOptions(true);
      }
    }, 1500);
  };

  const handleAnswer = (answer: string) => {
    const currentQuestion = assessmentQuestions[currentQuestionIndex];
    
    // Add user's answer to chat
    addMessage('user', answer);
    
    // Store the answer
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
    
    setShowOptions(false);
    
    // Bot acknowledgment
    setTimeout(() => {
      const acknowledgments = [
        "Thanks for sharing that insight!",
        "Interesting perspective!",
        "Got it, that's helpful to know.",
        "I see, that tells me a lot about your style.",
        "Great, I'm building a picture of your leadership approach."
      ];
      
      const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
      addMessage('bot', randomAck);
      
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        
        if (currentQuestionIndex < assessmentQuestions.length - 1) {
          setTimeout(() => {
            addMessage('bot', "Let me ask you something else...");
            setTimeout(askNextQuestion, 1000);
          }, 1000);
        } else {
          setTimeout(askNextQuestion, 1000);
        }
      }, 1000);
    }, 800);
  };

  const completeAssessment = () => {
    setTimeout(() => {
      addMessage('bot', "Excellent! You've completed the assessment. 🎉");
    }, 1000);
    
    setTimeout(() => {
      addMessage('bot', "I'm now analyzing your responses to create your personalized leadership profile...");
    }, 2500);
    
    setTimeout(() => {
      setIsComplete(true);
      addMessage('bot', "Your leadership profile is ready! To receive your detailed results and personalized insights, please enter your email address below.");
    }, 4000);
  };

  const progress = ((currentQuestionIndex + 1) / assessmentQuestions.length) * 100;

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
              Question {Math.min(currentQuestionIndex + 1, assessmentQuestions.length)} of {assessmentQuestions.length}
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
                    
                    {message.isQuestion && message.options && showOptions && (
                      <div className="mt-4 space-y-2">
                        {message.options.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => handleAnswer(option)}
                            className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-smooth text-sm"
                          >
                            {option}
                          </button>
                        ))}
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
            
            {/* Typing Indicator */}
            {isTyping && (
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