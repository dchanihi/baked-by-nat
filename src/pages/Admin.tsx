import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Plus, LogOut } from 'lucide-react';
import { BakesList } from '@/components/admin/BakesList';
import { BakeEditor } from '@/components/admin/BakeEditor';
import { CategorySettings } from '@/components/admin/CategorySettings';
import Navigation from '@/components/Navigation';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bakes, setBakes] = useState<Bake[]>([]);
  const [editingBake, setEditingBake] = useState<Bake | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const showSettings = searchParams.get('view') === 'settings';

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
    loadBakes();
    setLoading(false);
  };

  const loadBakes = async () => {
    const { data, error } = await supabase
      .from('bakes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load bakes.',
        variant: 'destructive',
      });
    } else {
      setBakes(data || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleCreateNew = () => {
    setEditingBake(null);
    setIsCreating(true);
  };

  const handleEdit = (bake: Bake) => {
    setEditingBake(bake);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bake?')) return;

    const { error } = await supabase
      .from('bakes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete bake.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Bake deleted successfully.',
      });
      loadBakes();
    }
  };

  const handleSaveComplete = () => {
    setIsCreating(false);
    setEditingBake(null);
    loadBakes();
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingBake(null);
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
        {showSettings ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-display font-bold text-primary-foreground">
                settings
              </h1>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setSearchParams({})}
                >
                  Back to Bakes
                </Button>
                {isAdmin && (
                  <Button variant="outline" onClick={handleSignOut} size="sm">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
            <CategorySettings />
          </div>
        ) : isCreating ? (
          <>
            <div className="flex items-center justify-end gap-3 mb-6">
              {isAdmin && (
                <Button variant="outline" onClick={handleSignOut} size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              )}
            </div>
            <BakeEditor
              bake={editingBake}
              onSave={handleSaveComplete}
              onCancel={handleCancel}
            />
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-display font-bold text-primary-foreground">
                manage bakes
              </h1>
              <div className="flex items-center gap-3">
                <Button onClick={handleCreateNew} className="bg-pink-soft hover:bg-pink-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  New Bake
                </Button>
                {isAdmin && (
                  <Button variant="outline" onClick={handleSignOut} size="sm">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
            <BakesList
              bakes={bakes}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
