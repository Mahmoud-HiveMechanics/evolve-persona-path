import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Lightbulb, Target, Users, TrendingUp, Eye } from 'lucide-react';

export const Model = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="hero-section py-24 px-6 bg-gradient-to-br from-primary/10 via-primary/5 to-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[600px]">
            <div className="space-y-10 lg:pr-8 relative z-10">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-7xl font-bold text-text-primary leading-[1.1] tracking-tight">
                  THE <span className="text-primary">EVOLVE</span>
                  <br />
                  LEADERSHIP
                  <br />
                  MODEL
                </h1>
                
                <p className="text-xl text-text-secondary leading-relaxed max-w-xl">
                  A comprehensive framework designed to transform leaders through enhanced self-awareness, 
                  strategic vision, and purposeful action. Navigate complexity with confidence and drive 
                  meaningful organizational change.
                </p>
              </div>
              
              <Link to="/assessment" className="inline-block">
                <button className="btn-assessment text-lg px-10 py-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <SpiralElement size="sm" />
                  Discover Your Leadership Style
                  <ArrowRight size={20} />
                </button>
              </Link>
            </div>
            
            <div className="flex justify-center lg:justify-end items-center">
              <div className="relative">
                <SpiralElement size="xl" className="opacity-90 drop-shadow-2xl" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-full blur-3xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/20 to-muted/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-text-primary">
              Six Core <span className="text-primary">Principles</span>
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
              The EVOLVE model is built on six fundamental principles that guide transformational leadership development
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center space-y-6 p-8 rounded-2xl bg-white/60 shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/10 group">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <Eye className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Enhanced Vision</h3>
              <p className="text-text-secondary leading-relaxed">
                Develop clear strategic foresight and the ability to see beyond immediate challenges to long-term opportunities.
              </p>
            </div>
            
            <div className="text-center space-y-6 p-8 rounded-2xl bg-white/60 shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/10 group">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <Target className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Purposeful Action</h3>
              <p className="text-text-secondary leading-relaxed">
                Transform insights into meaningful action through strategic decision-making and intentional leadership practices.
              </p>
            </div>
            
            <div className="text-center space-y-6 p-8 rounded-2xl bg-white/60 shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/10 group">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <Lightbulb className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Self-Awareness</h3>
              <p className="text-text-secondary leading-relaxed">
                Cultivate deep understanding of your leadership style, strengths, and areas for growth through reflection and feedback.
              </p>
            </div>
            
            <div className="text-center space-y-6 p-8 rounded-2xl bg-white/60 shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/10 group">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <Users className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Relational Intelligence</h3>
              <p className="text-text-secondary leading-relaxed">
                Build authentic connections and influence through empathy, communication, and collaborative leadership approaches.
              </p>
            </div>
            
            <div className="text-center space-y-6 p-8 rounded-2xl bg-white/60 shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/10 group">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <TrendingUp className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Adaptive Growth</h3>
              <p className="text-text-secondary leading-relaxed">
                Embrace continuous learning and adaptation to thrive in dynamic business environments and changing circumstances.
              </p>
            </div>
            
            <div className="text-center space-y-6 p-8 rounded-2xl bg-white/60 shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/10 group">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <CheckCircle className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Sustainable Impact</h3>
              <p className="text-text-secondary leading-relaxed">
                Create lasting organizational change through systems thinking and sustainable leadership practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Assessment CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary/10 via-primary/5 to-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl"></div>
        
        <div className="max-w-5xl mx-auto text-center space-y-12 relative z-10">
          <div className="space-y-8">
            <div className="relative inline-block">
              <SpiralElement size="lg" className="absolute -top-6 -right-6 opacity-30 animate-pulse" />
              <h2 className="text-4xl lg:text-6xl font-bold text-text-primary leading-tight">
                Ready to Apply the <span className="text-primary">EVOLVE</span> Model?
              </h2>
            </div>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
              Take our comprehensive assessment to discover how these principles align with your current leadership style and identify your development opportunities.
            </p>
          </div>
          
          <Link to="/assessment" className="inline-block">
            <button className="btn-assessment text-xl px-12 py-6 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 bg-gradient-to-r from-primary to-primary/90">
              <SpiralElement size="sm" />
              Take the Leadership Assessment
              <ArrowRight size={24} />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};