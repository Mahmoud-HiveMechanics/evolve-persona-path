import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Users, Star, Clock } from 'lucide-react';

export const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="hero-section py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold text-text-primary leading-tight">
                EVOLVE YOUR
                <br />
                LEADERSHIP
              </h1>
              
              <p className="text-lg text-text-secondary leading-relaxed max-w-lg">
                Unlock your potential with the EVOLVE Leadership Model – a proven framework 
                for personal and professional growth. Enhance your self-awareness and become 
                a more effective leader.
              </p>
              
              <div className="space-y-4">
                <Link to="/assessment">
                  <button className="btn-assessment">
                    <SpiralElement size="sm" />
                    Take the free assessment
                    <ArrowRight size={20} />
                  </button>
                </Link>
                
                <div className="text-center">
                  <Link to="/auth" className="text-primary hover:underline text-sm">
                    Already have an account? Sign in
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>10 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center lg:justify-end">
              <SpiralElement size="xl" className="opacity-80" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary">
              How It Works
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Discover your leadership persona in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Take the Assessment</h3>
              <p className="text-text-secondary">
                Complete our intelligent 10-minute questionnaire designed to understand your leadership style and approach.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Get Your Profile</h3>
              <p className="text-text-secondary">
                Receive your personalized leadership persona with detailed insights into your strengths and development areas.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Receive Insights</h3>
              <p className="text-text-secondary">
                Get personalized development recommendations and actionable strategies to enhance your leadership effectiveness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The EVOLVE Leadership Model */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-text-primary">
                THE EVOLVE
                <br />
                LEADERSHIP
                <br />
                MODEL
              </h2>
              
              <p className="text-lg text-text-secondary leading-relaxed">
                The EVOLVE Leadership Model focuses on cultivating awareness, 
                vision, and strategic action. It empowers leaders to navigate 
                complexity and drive meaningful change within their organizations.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-primary flex-shrink-0" />
                  <span className="text-text-secondary">Enhanced self-awareness</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-primary flex-shrink-0" />
                  <span className="text-text-secondary">Strategic thinking development</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-primary flex-shrink-0" />
                  <span className="text-text-secondary">Transformational leadership skills</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <SpiralElement size="xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                Trusted by Leaders Worldwide
              </h2>
              <div className="flex justify-center items-center gap-8 text-text-secondary">
                <div className="flex items-center gap-2">
                  <Users size={20} />
                  <span className="font-semibold">500+ leaders assessed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={20} />
                  <span className="font-semibold">4.9/5 rating</span>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-text-secondary mb-4">
                  "The EVOLVE assessment gave me clarity on my leadership style and actionable insights for growth. Highly recommended for any executive looking to enhance their impact."
                </p>
                <div className="text-sm">
                  <div className="font-semibold text-text-primary">Sarah Chen</div>
                  <div className="text-text-secondary">VP of Operations, TechCorp</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-text-secondary mb-4">
                  "This assessment transformed how I approach leadership challenges. The personalized insights were spot-on and immediately applicable to my role."
                </p>
                <div className="text-sm">
                  <div className="font-semibold text-text-primary">Marcus Johnson</div>
                  <div className="text-text-secondary">CEO, Innovation Labs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="relative">
            <SpiralElement size="lg" className="absolute -top-8 -right-8 opacity-20" />
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary">
              Ready to Evolve Your Leadership?
            </h2>
            <p className="text-lg text-text-secondary mt-4 max-w-2xl mx-auto">
              Unlock your potential with proven leadership insights. Join hundreds of leaders who've discovered their true leadership persona.
            </p>
          </div>
          
          <div className="space-y-4">
            <Link to="/assessment">
              <button className="btn-assessment">
                <SpiralElement size="sm" />
                Take the free assessment
                <ArrowRight size={20} />
              </button>
            </Link>
            
            <div className="text-center">
              <Link to="/auth" className="text-primary hover:underline text-sm">
                Already have an account? Sign in
              </Link>
            </div>
          </div>
          
          <p className="text-sm text-text-secondary">
            Takes approximately 10 minutes • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text-primary text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SpiralElement size="sm" />
                <div className="text-lg font-bold">
                  EVOLVE LEADERSHIP
                </div>
              </div>
              <p className="text-white/80 text-sm">
                Empowering leaders to navigate complexity and drive meaningful change.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Quick Links</h3>
              <div className="space-y-2 text-sm">
                <Link to="/" className="block text-white/80 hover:text-white transition-smooth">Home</Link>
                <Link to="/model" className="block text-white/80 hover:text-white transition-smooth">The Model</Link>
                <Link to="/about" className="block text-white/80 hover:text-white transition-smooth">About us</Link>
                <Link to="/assessment" className="block text-white/80 hover:text-white transition-smooth">Assessment</Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Support</h3>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-white/80 hover:text-white transition-smooth">FAQ</a>
                <a href="#" className="block text-white/80 hover:text-white transition-smooth">Privacy Policy</a>
                <a href="#" className="block text-white/80 hover:text-white transition-smooth">Contact</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/60">
            © 2024 EVOLVE Leadership. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};