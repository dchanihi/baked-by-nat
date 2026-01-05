import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BakesList } from '@/components/admin/BakesList';
import { BakeEditor } from '@/components/admin/BakeEditor';
import { ArchivedBakesList } from '@/components/admin/ArchivedBakesList';
import { OrdersList } from '@/components/admin/OrdersList';
import { OrderDetails } from '@/components/admin/OrderDetails';
import { OrderOverview } from '@/components/admin/OrderOverview';
import { EventsList } from '@/components/admin/EventsList';
import { ArchivedEventsList } from '@/components/admin/ArchivedEventsList';
import { EventEditor } from '@/components/admin/EventEditor';
import { EventRunner } from '@/components/admin/EventRunner';
import { EventStatistics } from '@/components/admin/EventStatistics';
import IncomeOverview from '@/components/admin/financials/IncomeOverview';
import ExpensesManager from '@/components/admin/financials/ExpensesManager';
import InventoryContent from '@/components/admin/InventoryContent';
import Navigation from '@/components/Navigation';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;
type Order = Tables<'orders'>;

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  notes: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bakes, setBakes] = useState<Bake[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [editingBake, setEditingBake] = useState<Bake | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [runningEvent, setRunningEvent] = useState<Event | null>(null);
  const [viewingEventStats, setViewingEventStats] = useState<Event | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingArchive, setViewingArchive] = useState(false);
  const [viewingBakeArchive, setViewingBakeArchive] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
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
    loadEvents();
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

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load events.',
        variant: 'destructive',
      });
    } else {
      setEvents((data || []) as Event[]);
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

  const handleArchiveBake = async (id: string) => {
    if (!confirm('Are you sure you want to archive this bake?')) return;

    const { error } = await supabase
      .from('bakes')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive bake.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Bake archived successfully.',
      });
      loadBakes();
    }
  };

  const handleRestoreBake = async (id: string) => {
    const { error } = await supabase
      .from('bakes')
      .update({ is_archived: false })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore bake.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Bake restored successfully.',
      });
      loadBakes();
    }
  };

  const handleToggleBakeVisibility = async (id: string, isVisible: boolean) => {
    const { error } = await supabase
      .from('bakes')
      .update({ is_visible: isVisible })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update visibility.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: isVisible ? 'Bake is now visible.' : 'Bake is now hidden.',
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

  // Event handlers
  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsCreatingEvent(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsCreatingEvent(true);
  };

  const handleArchiveEvent = async (id: string) => {
    if (!confirm('Are you sure you want to archive this event?')) return;

    const { error } = await supabase
      .from('events')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive event.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Event archived successfully.',
      });
      loadEvents();
    }
  };

  const handleRestoreEvent = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .update({ status: 'draft' })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore event.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Event restored successfully.',
      });
      loadEvents();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this event? This cannot be undone.')) return;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Event permanently deleted.',
      });
      loadEvents();
    }
  };

  const handleRunEvent = (event: Event) => {
    setRunningEvent(event);
  };

  const handleViewEventStats = (event: Event) => {
    setViewingEventStats(event);
  };

  const handleBackFromEventStats = () => {
    setViewingEventStats(null);
  };

  const handleEventSaveComplete = () => {
    setIsCreatingEvent(false);
    setEditingEvent(null);
    loadEvents();
  };

  const handleEventCancel = () => {
    setIsCreatingEvent(false);
    setEditingEvent(null);
  };

  const handleBackFromEvent = () => {
    setRunningEvent(null);
    loadEvents();
  };

  const handleEventUpdate = () => {
    loadEvents();
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
        ) : viewingEventStats ? (
          <EventStatistics
            event={viewingEventStats}
            onBack={handleBackFromEventStats}
          />
        ) : runningEvent ? (
          <EventRunner
            event={runningEvent}
            onBack={handleBackFromEvent}
            onUpdate={handleEventUpdate}
            onEdit={() => {
              setEditingEvent(runningEvent);
              setIsCreatingEvent(true);
              setRunningEvent(null);
            }}
          />
        ) : isCreatingEvent ? (
          <EventEditor
            event={editingEvent}
            onSave={handleEventSaveComplete}
            onCancel={handleEventCancel}
          />
        ) : isCreating ? (
          <BakeEditor
            bake={editingBake}
            onSave={handleSaveComplete}
            onCancel={handleCancel}
          />
        ) : viewingBakeArchive ? (
          <ArchivedBakesList
            bakes={bakes}
            onRestore={handleRestoreBake}
            onDelete={handleDelete}
            onBack={() => setViewingBakeArchive(false)}
          />
        ) : viewingArchive ? (
          <ArchivedEventsList
            events={events}
            onRestore={handleRestoreEvent}
            onDelete={handleDeleteEvent}
            onBack={() => setViewingArchive(false)}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-5xl grid-cols-6">
              <TabsTrigger value="overview">order overview</TabsTrigger>
              <TabsTrigger value="orders">view orders</TabsTrigger>
              <TabsTrigger value="bakes">manage bakes</TabsTrigger>
              <TabsTrigger value="events">events</TabsTrigger>
              <TabsTrigger value="financials">financials</TabsTrigger>
              <TabsTrigger value="inventory">inventory</TabsTrigger>
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
                onArchive={handleArchiveBake}
                onToggleVisibility={handleToggleBakeVisibility}
                onViewArchive={() => setViewingBakeArchive(true)}
              />
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <EventsList
                events={events}
                onEdit={handleEditEvent}
                onArchive={handleArchiveEvent}
                onRun={handleRunEvent}
                onViewStats={handleViewEventStats}
                onCreate={handleCreateEvent}
                onViewArchive={() => setViewingArchive(true)}
              />
            </TabsContent>

            <TabsContent value="financials" className="space-y-6">
              <Tabs defaultValue="income" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="income">income</TabsTrigger>
                  <TabsTrigger value="expenses">expenses</TabsTrigger>
                </TabsList>
                <TabsContent value="income">
                  <IncomeOverview selectedPeriod="year" selectedLocation="all" />
                </TabsContent>
                <TabsContent value="expenses">
                  <ExpensesManager />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
              <InventoryContent />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Admin;
