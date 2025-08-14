import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Users, Globe, Heart } from 'lucide-react';

export const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold text-text-primary leading-tight">
                ABOUT
                <br />
                EVOLVE
                <br />
                LEADERSHIP
              </h1>
              
              <p className="text-lg text-text-secondary leading-relaxed">
                We believe that great leadership isn't born—it's evolved. Our mission is to empower 
                leaders at every level to unlock their potential through proven frameworks, personalized 
                insights, and transformational development.
              </p>
            </div>
            
            <div className="flex justify-center">
              <SpiralElement size="xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-text-primary">Our Mission</h2>
              <p className="text-text-secondary leading-relaxed">
                To transform the way leaders think, act, and influence by providing cutting-edge 
                assessment tools and development frameworks that drive real organizational change. 
                We're committed to helping leaders navigate complexity with confidence and purpose.
              </p>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-text-primary">Our Vision</h2>
              <p className="text-text-secondary leading-relaxed">
                A world where every leader has the self-awareness, vision, and tools necessary 
                to create positive impact in their organizations and communities. We envision 
                leadership development as a continuous journey of growth and transformation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary">
              Our Core Values
            </h2>
            <p className="text-lg text-text-secondary max-w-3xl mx-auto">
              These principles guide everything we do and shape how we approach leadership development
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Award className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Excellence</h3>
              <p className="text-text-secondary text-sm">
                We strive for the highest standards in everything we deliver, from assessments to insights.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Collaboration</h3>
              <p className="text-text-secondary text-sm">
                We believe in the power of collective wisdom and collaborative growth.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Globe className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Impact</h3>
              <p className="text-text-secondary text-sm">
                We're committed to creating meaningful, lasting change in organizations worldwide.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Heart className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Authenticity</h3>
              <p className="text-text-secondary text-sm">
                We value genuine, authentic leadership that aligns actions with values.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary">
            Start Your Leadership Evolution
          </h2>
          <p className="text-lg text-text-secondary">
            Join hundreds of leaders who have transformed their approach to leadership through 
            the EVOLVE model. Take the first step today.
          </p>
          
          <Link to="/assessment">
            <button className="btn-assessment">
              <SpiralElement size="sm" />
              Begin Your Journey
              <ArrowRight size={20} />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};