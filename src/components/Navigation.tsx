import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Settings, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  const isAdminRoute = location.pathname === '/admin';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };
  
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
            {isAdminRoute && (
              <>
                <Link
                  to="/admin?view=settings"
                  className={`font-body text-sm transition-colors hover:text-pink-accent flex items-center gap-1 ${
                    location.search === '?view=settings' ? 'text-pink-accent font-medium' : 'text-foreground'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  settings
                </Link>
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="font-body text-sm transition-colors hover:text-pink-accent flex items-center gap-1 h-auto p-0"
                  >
                    <LogOut className="w-4 h-4" />
                    sign out
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
