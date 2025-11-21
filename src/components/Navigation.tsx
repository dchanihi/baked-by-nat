import { Link, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-xl font-display font-semibold text-primary-foreground hover:text-pink-accent transition-colors"
          >
            <Heart className="w-5 h-5 fill-pink-soft" />
            baked by nat
          </Link>
          
          <div className="flex gap-6">
            <Link
              to="/"
              className={`font-body text-sm transition-colors hover:text-pink-accent ${
                isActive('/') ? 'text-pink-accent font-medium' : 'text-foreground'
              }`}
            >
              home
            </Link>
            <Link
              to="/bakes"
              className={`font-body text-sm transition-colors hover:text-pink-accent ${
                isActive('/bakes') ? 'text-pink-accent font-medium' : 'text-foreground'
              }`}
            >
              bakes
            </Link>
            <Link
              to="/about"
              className={`font-body text-sm transition-colors hover:text-pink-accent ${
                isActive('/about') ? 'text-pink-accent font-medium' : 'text-foreground'
              }`}
            >
              about
            </Link>
            <Link
              to="/order"
              className={`font-body text-sm transition-colors hover:text-pink-accent ${
                isActive('/order') ? 'text-pink-accent font-medium' : 'text-foreground'
              }`}
            >
              order
            </Link>
            <Link
              to="/contact"
              className={`font-body text-sm transition-colors hover:text-pink-accent ${
                isActive('/contact') ? 'text-pink-accent font-medium' : 'text-foreground'
              }`}
            >
              contact
            </Link>
            <Link
              to="/admin"
              className={`font-body text-sm transition-colors hover:text-pink-accent ${
                isActive('/admin') ? 'text-pink-accent font-medium' : 'text-foreground'
              }`}
            >
              admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
