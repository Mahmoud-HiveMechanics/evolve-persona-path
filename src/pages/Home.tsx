import { Header } from '../components/Header';
import { SpiralElement } from '../components/SpiralElement';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Users, Star, Clock } from 'lucide-react';

export const Home = () => {
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
                  THRIVE AS A
                  <br />
                  <span className="text-primary">LEADER</span>
                </h1>
                
                <p className="text-xl text-text-secondary leading-relaxed max-w-xl">
                  Unlock your potential with THRIVE Culture – a proven framework 
                  for personal and professional growth. Enhance your self-awareness and become 
                  a more effective leader.
                </p>
              </div>
              
              <div className="space-y-6">
                <Link to="/assessment" className="inline-block">
                  <button className="btn-assessment text-lg px-10 py-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <SpiralElement size="sm" />
                    Take the free assessment
                    <ArrowRight size={20} />
                  </button>
                </Link>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-primary" />
                    <span className="font-medium">10 minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-primary" />
                    <span className="font-medium">No credit card required</span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Link to="/auth" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
                    Already have an account? Sign in →
                  </Link>
                </div>
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

      {/* How It Works */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/20 to-muted/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-text-primary">
              How It Works
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
              Discover your leadership persona in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            <div className="text-center space-y-6 group">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <span className="text-3xl font-bold text-primary">1</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Take the Assessment</h3>
              <p className="text-text-secondary text-lg leading-relaxed max-w-sm mx-auto">
                Complete our intelligent 10-minute questionnaire designed to understand your leadership style and approach.
              </p>
            </div>
            
            <div className="text-center space-y-6 group">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <span className="text-3xl font-bold text-primary">2</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Get Your Profile</h3>
              <p className="text-text-secondary text-lg leading-relaxed max-w-sm mx-auto">
                Receive your personalized leadership persona with detailed insights into your strengths and development areas.
              </p>
            </div>
            
            <div className="text-center space-y-6 group">
              <div className="relative">
                <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/25 transition-all duration-300">
                  <span className="text-3xl font-bold text-primary">3</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full opacity-20"></div>
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Receive Insights</h3>
              <p className="text-text-secondary text-lg leading-relaxed max-w-sm mx-auto">
                Get personalized development recommendations and actionable strategies to enhance your leadership effectiveness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The EVOLVE Leadership Model */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 lg:pr-8">
              <div className="space-y-6">
                <h2 className="text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
                  THE <span className="text-primary">THRIVE</span>
                  <br />
                  LEADERSHIP
                  <br />
                  MODEL
                </h2>
                
                <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                  The THRIVE Leadership Model focuses on cultivating awareness, 
                  vision, and strategic action. It empowers leaders to navigate 
                  complexity and drive meaningful change within their organizations.
                </p>
              </div>
              
              <div className="space-y-5">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors">
                  <CheckCircle size={24} className="text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-text-primary mb-1">Enhanced self-awareness</h4>
                    <p className="text-text-secondary text-sm">Develop deeper understanding of your leadership style and impact</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors">
                  <CheckCircle size={24} className="text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-text-primary mb-1">Strategic thinking development</h4>
                    <p className="text-text-secondary text-sm">Build capabilities for long-term vision and complex problem solving</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors">
                  <CheckCircle size={24} className="text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-text-primary mb-1">Transformational leadership skills</h4>
                    <p className="text-text-secondary text-sm">Learn to inspire and guide others through meaningful change</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center lg:justify-end items-center">
              <div className="relative">
                <SpiralElement size="xl" className="drop-shadow-2xl" />
                <div className="absolute -inset-8 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 rounded-full blur-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/40 to-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-16">
            <div className="space-y-8">
              <h2 className="text-4xl lg:text-5xl font-bold text-text-primary">
                Trusted by Leaders Worldwide
              </h2>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-8 lg:gap-12">
                <div className="flex items-center gap-3 px-6 py-3 bg-white/60 rounded-full shadow-sm">
                  <Users size={24} className="text-primary" />
                  <span className="font-bold text-lg text-text-primary">500+</span>
                  <span className="text-text-secondary">leaders assessed</span>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-white/60 rounded-full shadow-sm">
                  <Star size={24} className="text-primary fill-primary" />
                  <span className="font-bold text-lg text-text-primary">4.9/5</span>
                  <span className="text-text-secondary">rating</span>
                </div>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-primary/10">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} className="fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-text-secondary text-lg leading-relaxed mb-6 italic">
                  "The THRIVE assessment gave me clarity on my leadership style and actionable insights for growth. Highly recommended for any executive looking to enhance their impact."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">SC</span>
                  </div>
                  <div>
                    <div className="font-bold text-text-primary">Sarah Chen</div>
                    <div className="text-text-secondary text-sm">VP of Operations, TechCorp</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-primary/10">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} className="fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-text-secondary text-lg leading-relaxed mb-6 italic">
                  "This assessment transformed how I approach leadership challenges. The personalized insights were spot-on and immediately applicable to my role."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">MJ</span>
                  </div>
                  <div>
                    <div className="font-bold text-text-primary">Marcus Johnson</div>
                    <div className="text-text-secondary text-sm">CEO, Innovation Labs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary/10 via-primary/5 to-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl"></div>
        
        <div className="max-w-5xl mx-auto text-center space-y-12 relative z-10">
          <div className="space-y-8">
            <div className="relative inline-block">
              <SpiralElement size="lg" className="absolute -top-6 -right-6 opacity-30 animate-pulse" />
              <h2 className="text-4xl lg:text-6xl font-bold text-text-primary leading-tight">
                Ready to <span className="text-primary">Thrive</span> as a Leader?
              </h2>
            </div>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
              Unlock your potential with proven leadership insights. Join hundreds of leaders who've discovered their true leadership persona.
            </p>
          </div>
          
          <div className="space-y-8">
            <Link to="/assessment" className="inline-block">
              <button className="btn-assessment text-xl px-12 py-6 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 bg-gradient-to-r from-primary to-primary/90">
                <SpiralElement size="sm" />
                Take the free assessment
                <ArrowRight size={24} />
              </button>
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-text-secondary">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-primary" />
                <span className="font-medium">Takes approximately 10 minutes</span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-text-secondary/30 rounded-full"></div>
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-primary" />
                <span className="font-medium">No credit card required</span>
              </div>
            </div>
            
            <div className="pt-4">
              <Link to="/auth" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Already have an account? Sign in →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text-primary text-white py-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl -translate-y-32"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-4">
                <SpiralElement size="sm" />
                <div className="text-2xl font-bold">
                  THRIVE CULTURE
                </div>
              </div>
              <p className="text-white/80 text-lg leading-relaxed max-w-md">
                Empowering leaders to navigate complexity and drive meaningful change through proven assessment and development frameworks.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-white/70">
                  <Users size={18} />
                  <span className="text-sm">500+ Leaders</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Star size={18} className="fill-white/70" />
                  <span className="text-sm">4.9/5 Rating</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="font-bold text-lg text-white">Quick Links</h3>
              <div className="space-y-3">
                <Link to="/" className="block text-white/80 hover:text-white hover:translate-x-1 transition-all duration-200">
                  Home
                </Link>
                <Link to="/model" className="block text-white/80 hover:text-white hover:translate-x-1 transition-all duration-200">
                  The Model
                </Link>
                <Link to="/about" className="block text-white/80 hover:text-white hover:translate-x-1 transition-all duration-200">
                  About us
                </Link>
                <Link to="/assessment" className="block text-white/80 hover:text-white hover:translate-x-1 transition-all duration-200">
                  Assessment
                </Link>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="font-bold text-lg text-white">Support</h3>
              <div className="space-y-3">
                <a href="#" className="block text-white/80 hover:text-white hover:translate-x-1 transition-all duration-200">
                  FAQ
                </a>
                <a href="#" className="block text-white/80 hover:text-white hover:translate-x-1 transition-all duration-200">
                  Privacy Policy
                </a>
                <a href="#" className="block text-white/80 hover:text-white hover:translate-x-1 transition-all duration-200">
                  Contact
                </a>
                <a href="#" className="block text-white/80 hover:text-white hover:translate-x-1 transition-all duration-200">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/20 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-white/60">
                © 2024 EVOLVE Leadership. All rights reserved.
              </div>
              <div className="text-white/60 text-sm">
                Made with ❤️ for leaders worldwide
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};