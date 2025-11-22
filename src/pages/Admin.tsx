import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BakesList } from '@/components/admin/BakesList';
import { BakeEditor } from '@/components/admin/BakeEditor';
import { OrdersList } from '@/components/admin/OrdersList';
import { OrderDetails } from '@/components/admin/OrderDetails';
import { OrderOverview } from '@/components/admin/OrderOverview';
import Navigation from '@/components/Navigation';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;
type Order = Tables<'orders'>;

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bakes, setBakes] = useState<Bake[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingBake, setEditingBake] = useState<Bake | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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
        {viewingOrder ? (
          <OrderDetails
            order={viewingOrder}
            onBack={handleBackFromOrder}
            onUpdate={handleOrderUpdate}
          />
        ) : isCreating ? (
          <BakeEditor
            bake={editingBake}
            onSave={handleSaveComplete}
            onCancel={handleCancel}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="overview">order overview</TabsTrigger>
              <TabsTrigger value="orders">view orders</TabsTrigger>
              <TabsTrigger value="bakes">manage bakes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <OrderOverview orders={orders} />
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <OrdersList orders={orders} onView={handleViewOrder} />
            </TabsContent>

            <TabsContent value="bakes" className="space-y-6">
              <div className="flex justify-end">
                <Button onClick={handleCreateNew} className="bg-pink-soft hover:bg-pink-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  New Bake
                </Button>
              </div>
              <BakesList
                bakes={bakes}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Admin;
