import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';
import { BakesList } from '@/components/admin/BakesList';
import { BakeEditor } from '@/components/admin/BakeEditor';
import { CategorySettings } from '@/components/admin/CategorySettings';
import { OrdersList } from '@/components/admin/OrdersList';
import { OrderDetails } from '@/components/admin/OrderDetails';
import Navigation from '@/components/Navigation';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;
type Order = Tables<'orders'>;

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bakes, setBakes] = useState<Bake[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingBake, setEditingBake] = useState<Bake | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const view = searchParams.get('view') || 'bakes';
  const showSettings = view === 'settings';
  const showOrders = view === 'orders';

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
    loadOrders();
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

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load orders.',
        variant: 'destructive',
      });
    } else {
      setOrders(data || []);
    }
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

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order);
  };

  const handleBackFromOrder = () => {
    setViewingOrder(null);
  };

  const handleOrderUpdate = () => {
    loadOrders();
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
              <Button 
                variant="outline" 
                onClick={() => setSearchParams({})}
              >
                Back to Bakes
              </Button>
            </div>
            <CategorySettings />
          </div>
        ) : showOrders ? (
          viewingOrder ? (
            <OrderDetails
              order={viewingOrder}
              onBack={handleBackFromOrder}
              onUpdate={handleOrderUpdate}
            />
          ) : (
            <>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-display font-bold text-primary-foreground">
                  manage orders
                </h1>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchParams({})}
                >
                  Back to Bakes
                </Button>
              </div>
              <OrdersList orders={orders} onView={handleViewOrder} />
            </>
          )
        ) : isCreating ? (
          <BakeEditor
            bake={editingBake}
            onSave={handleSaveComplete}
            onCancel={handleCancel}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-display font-bold text-primary-foreground">
                manage bakes
              </h1>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setSearchParams({ view: 'orders' })}
                >
                  View Orders
                </Button>
                <Button onClick={handleCreateNew} className="bg-pink-soft hover:bg-pink-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  New Bake
                </Button>
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
