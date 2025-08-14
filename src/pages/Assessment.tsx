import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface Question {
  id: number;
  type: 'multiple-choice' | 'scale' | 'scenario';
  question: string;
  options?: string[];
  context?: string;
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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  const progress = ((currentQuestion + 1) / assessmentQuestions.length) * 100;

  const handleStart = () => {
    setIsStarted(true);
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNext = () => {
    if (selectedAnswer) {
      setAnswers(prev => ({
        ...prev,
        [assessmentQuestions[currentQuestion].id]: selectedAnswer
      }));
      
      if (currentQuestion < assessmentQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer('');
      } else {
        setIsComplete(true);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedAnswer(answers[assessmentQuestions[currentQuestion - 1].id] || '');
    }
  };

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
                  <span>Your progress is automatically saved</span>
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

  if (isComplete) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <SpiralElement size="lg" className="mx-auto" />
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-text-primary">
                Assessment Complete!
              </h1>
              <p className="text-lg text-text-secondary">
                Great! Your assessment is complete. Let's discover your leadership persona 
                and get your personalized insights.
              </p>
            </div>
            
            <div className="bg-primary/5 rounded-xl p-6">
              <p className="text-text-secondary mb-4">
                Your personalized leadership profile is ready. Enter your email to receive 
                your detailed results and continue your leadership journey.
              </p>
              
              <div className="space-y-4">
                <input 
                  type="email" 
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button className="btn-assessment w-full">
                  <SpiralElement size="sm" />
                  Get My Leadership Profile
                  <ArrowRight size={20} />
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-text-secondary">
              Your information is secure and will only be used to send your results.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const question = assessmentQuestions[currentQuestion];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">
              Question {currentQuestion + 1} of {assessmentQuestions.length}
            </span>
            <span className="text-sm text-text-secondary">
              {Math.round(progress)}% complete
            </span>
          </div>
          <div className="progress-bar h-2">
            <div 
              className="progress-fill h-full" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="p-8 mb-8">
          <div className="space-y-6">
            {question.context && (
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-text-secondary italic">
                  Context: {question.context}
                </p>
              </div>
            )}
            
            <h2 className="text-2xl font-semibold text-text-primary leading-relaxed">
              {question.question}
            </h2>
            
            <div className="space-y-3">
              {question.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-smooth ${
                    selectedAnswer === option
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 transition-smooth ${
                      selectedAnswer === option
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}>
                      {selectedAnswer === option && (
                        <div className="w-full h-full rounded-full bg-white scale-50" />
                      )}
                    </div>
                    <span className="text-text-secondary">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!selectedAnswer}
            className="btn-assessment"
          >
            {currentQuestion === assessmentQuestions.length - 1 ? 'Complete Assessment' : 'Next Question'}
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};