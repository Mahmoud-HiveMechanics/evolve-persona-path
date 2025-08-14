import { SpiralElement } from './SpiralElement';
import { Link, useLocation } from 'react-router-dom';

export const Header = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <header className="bg-white border-b border-border py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <SpiralElement size="sm" />
          <div className="text-xl font-bold text-primary">
            EVOLVE
            <div className="text-sm text-text-primary font-normal tracking-wide">
              LEADERSHIP
            </div>
          </div>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-smooth ${
              isActive('/') ? 'text-primary' : 'text-text-secondary hover:text-primary'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/model" 
            className={`text-sm font-medium transition-smooth ${
              isActive('/model') ? 'text-primary' : 'text-text-secondary hover:text-primary'
            }`}
          >
            The Model
          </Link>
          <Link 
            to="/about" 
            className={`text-sm font-medium transition-smooth ${
              isActive('/about') ? 'text-primary' : 'text-text-secondary hover:text-primary'
            }`}
          >
            About us
          </Link>
        </nav>
      </div>
    </header>
  );
};