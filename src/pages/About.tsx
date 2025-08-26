import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Users, Globe, Heart } from 'lucide-react';

export const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="hero-section py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[600px]">
            <div className="space-y-10 lg:pr-8">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-7xl font-bold text-text-primary leading-[1.1] tracking-tight">
                  ABOUT
                  <br />
                  <span className="text-primary">EVOLVE</span>
                  <br />
                  LEADERSHIP
                </h1>
                
                <p className="text-xl text-text-secondary leading-relaxed max-w-xl">
                  We believe that great leadership isn't born—it's evolved. Our mission is to empower 
                  leaders at every level to unlock their potential through proven frameworks, personalized 
                  insights, and transformational development.
                </p>
              </div>
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

      {/* Mission & Values */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/20 to-muted/40">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16">
            <div className="space-y-8 p-8 bg-white/60 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-primary/10">
              <h2 className="text-4xl font-bold text-text-primary">Our <span className="text-primary">Mission</span></h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                To transform the way leaders think, act, and influence by providing cutting-edge 
                assessment tools and development frameworks that drive real organizational change. 
                We're committed to helping leaders navigate complexity with confidence and purpose.
              </p>
            </div>
            
            <div className="space-y-8 p-8 bg-white/60 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-primary/10">
              <h2 className="text-4xl font-bold text-text-primary">Our <span className="text-primary">Vision</span></h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                A world where every leader has the self-awareness, vision, and tools necessary 
                to create positive impact in their organizations and communities. We envision 
                leadership development as a continuous journey of growth and transformation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-text-primary">
              Our Core <span className="text-primary">Values</span>
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
              These principles guide everything we do and shape how we approach leadership development
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-6 group p-6 rounded-2xl hover:bg-primary/5 transition-all duration-300">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <Award className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Excellence</h3>
              <p className="text-text-secondary leading-relaxed">
                We strive for the highest standards in everything we deliver, from assessments to insights.
              </p>
            </div>
            
            <div className="text-center space-y-6 group p-6 rounded-2xl hover:bg-primary/5 transition-all duration-300">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <Users className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Collaboration</h3>
              <p className="text-text-secondary leading-relaxed">
                We believe in the power of collective wisdom and collaborative growth.
              </p>
            </div>
            
            <div className="text-center space-y-6 group p-6 rounded-2xl hover:bg-primary/5 transition-all duration-300">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <Globe className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Impact</h3>
              <p className="text-text-secondary leading-relaxed">
                We're committed to creating meaningful, lasting change in organizations worldwide.
              </p>
            </div>
            
            <div className="text-center space-y-6 group p-6 rounded-2xl hover:bg-primary/5 transition-all duration-300">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <Heart className="text-primary" size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Authenticity</h3>
              <p className="text-text-secondary leading-relaxed">
                We value genuine, authentic leadership that aligns actions with values.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary/10 via-primary/5 to-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl"></div>
        
        <div className="max-w-5xl mx-auto text-center space-y-12 relative z-10">
          <div className="space-y-8">
            <div className="relative inline-block">
              <SpiralElement size="lg" className="absolute -top-6 -right-6 opacity-30 animate-pulse" />
              <h2 className="text-4xl lg:text-6xl font-bold text-text-primary leading-tight">
                Start Your Leadership <span className="text-primary">Evolution</span>
              </h2>
            </div>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
              Join hundreds of leaders who have transformed their approach to leadership through 
              the EVOLVE model. Take the first step today.
            </p>
          </div>
          
          <Link to="/assessment" className="inline-block">
            <button className="btn-assessment text-xl px-12 py-6 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 bg-gradient-to-r from-primary to-primary/90">
              <SpiralElement size="sm" />
              Begin Your Journey
              <ArrowRight size={24} />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};