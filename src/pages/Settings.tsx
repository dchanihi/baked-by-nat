import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { AccountSettings } from '@/components/admin/AccountSettings';
import { CategorySettings } from '@/components/admin/CategorySettings';
import { InventoryCategorySettings } from '@/components/admin/InventoryCategorySettings';
import Navigation from '@/components/Navigation';

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const currentPage = location.pathname.split('/').pop() || 'profile';

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/auth');
      return;
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const hasAdminRole = roles?.some(r => r.role === 'admin');
    
    if (!hasAdminRole) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-secondary">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-display font-bold text-primary-foreground">
              settings
            </h1>
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin')}
            >
              back to admin
            </Button>
          </div>

          <div className="flex gap-4 border-b border-border mb-6">
            <Link to="/admin/settings/profile">
              <Button 
                variant="ghost" 
                className={`rounded-none border-b-2 ${
                  currentPage === 'profile' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                profile
              </Button>
            </Link>
            <Link to="/admin/settings/categories">
              <Button 
                variant="ghost" 
                className={`rounded-none border-b-2 ${
                  currentPage === 'categories' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                bake categories
              </Button>
            </Link>
            <Link to="/admin/settings/inventory-categories">
              <Button 
                variant="ghost" 
                className={`rounded-none border-b-2 ${
                  currentPage === 'inventory-categories' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                inventory categories
              </Button>
            </Link>
          </div>

          <div className="mt-8">
            {currentPage === 'profile' && <AccountSettings />}
            {currentPage === 'categories' && <CategorySettings />}
            {currentPage === 'inventory-categories' && <InventoryCategorySettings />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
