import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Lightbulb, Target, Users, TrendingUp, Eye } from 'lucide-react';

export const Model = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold text-text-primary leading-tight">
                THE EVOLVE
                <br />
                LEADERSHIP
                <br />
                MODEL
              </h1>
              
              <p className="text-lg text-text-secondary leading-relaxed">
                A comprehensive framework designed to transform leaders through enhanced self-awareness, 
                strategic vision, and purposeful action. Navigate complexity with confidence and drive 
                meaningful organizational change.
              </p>
              
              <Link to="/assessment">
                <button className="btn-assessment">
                  <SpiralElement size="sm" />
                  Discover Your Leadership Style
                  <ArrowRight size={20} />
                </button>
              </Link>
            </div>
            
            <div className="flex justify-center">
              <SpiralElement size="xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary">
              Six Core Principles
            </h2>
            <p className="text-lg text-text-secondary max-w-3xl mx-auto">
              The EVOLVE model is built on six fundamental principles that guide transformational leadership development
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6 rounded-xl bg-muted/30">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Eye className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Enhanced Vision</h3>
              <p className="text-text-secondary">
                Develop clear strategic foresight and the ability to see beyond immediate challenges to long-term opportunities.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-xl bg-muted/30">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Target className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Purposeful Action</h3>
              <p className="text-text-secondary">
                Transform insights into meaningful action through strategic decision-making and intentional leadership practices.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-xl bg-muted/30">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Lightbulb className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Self-Awareness</h3>
              <p className="text-text-secondary">
                Cultivate deep understanding of your leadership style, strengths, and areas for growth through reflection and feedback.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-xl bg-muted/30">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Relational Intelligence</h3>
              <p className="text-text-secondary">
                Build authentic connections and influence through empathy, communication, and collaborative leadership approaches.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-xl bg-muted/30">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Adaptive Growth</h3>
              <p className="text-text-secondary">
                Embrace continuous learning and adaptation to thrive in dynamic business environments and changing circumstances.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-xl bg-muted/30">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Sustainable Impact</h3>
              <p className="text-text-secondary">
                Create lasting organizational change through systems thinking and sustainable leadership practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Assessment CTA */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary">
            Ready to Apply the EVOLVE Model?
          </h2>
          <p className="text-lg text-text-secondary">
            Take our comprehensive assessment to discover how these principles align with your current leadership style and identify your development opportunities.
          </p>
          
          <Link to="/assessment">
            <button className="btn-assessment">
              <SpiralElement size="sm" />
              Take the Leadership Assessment
              <ArrowRight size={20} />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};