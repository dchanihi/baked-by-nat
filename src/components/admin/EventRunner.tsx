import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Minus, DollarSign, Package, TrendingUp, CheckCircle, Play, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface EventItem {
  id: string;
  name: string;
  cogs: number;
  price: number;
  starting_quantity: number;
  quantity_sold: number;
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  status: 'draft' | 'active' | 'completed';
  current_day?: number;
  day_open_time?: string | null;
  day_close_time?: string | null;
}

interface EventRunnerProps {
  event: Event;
  onBack: () => void;
  onUpdate: () => void;
}

export const EventRunner = ({ event, onBack, onUpdate }: EventRunnerProps) => {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualSaleItem, setManualSaleItem] = useState<EventItem | null>(null);
  const [manualQuantity, setManualQuantity] = useState(1);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showEndDayDialog, setShowEndDayDialog] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event>(event);

  // Determine if we need to show the start confirmation
  const isDayActive = currentEvent.day_open_time && !currentEvent.day_close_time;
  const currentDay = currentEvent.current_day || 0;

  useEffect(() => {
    loadItems();
    loadEventDetails();
  }, [event.id]);

  const loadEventDetails = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', event.id)
      .maybeSingle();

    if (data) {
      setCurrentEvent(data as Event);
      // Show start confirmation if day isn't active
      if (!data.day_open_time || data.day_close_time) {
        setShowStartConfirm(true);
      }
    }
  };

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('event_items')
      .select('*')
      .eq('event_id', event.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load items.',
        variant: 'destructive',
      });
    } else {
      setItems(data?.map(item => ({
        id: item.id,
        name: item.name,
        cogs: Number(item.cogs),
        price: Number(item.price),
        starting_quantity: item.starting_quantity,
        quantity_sold: item.quantity_sold,
      })) || []);
    }
    setLoading(false);
  };

  const startDay = async () => {
    const newDay = (currentEvent.current_day || 0) + 1;
    const openTime = new Date().toISOString();

    const { error } = await supabase
      .from('events')
      .update({
        status: 'active',
        current_day: newDay,
        day_open_time: openTime,
        day_close_time: null,
      })
      .eq('id', event.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to start the day.',
        variant: 'destructive',
      });
      return;
    }

    setCurrentEvent({
      ...currentEvent,
      status: 'active',
      current_day: newDay,
      day_open_time: openTime,
      day_close_time: null,
    });
    setShowStartConfirm(false);
    onUpdate();

    toast({
      title: `Day ${newDay} Started`,
      description: `Event opened at ${format(new Date(openTime), 'h:mm a')}`,
    });
  };

  const endDay = async () => {
    const closeTime = new Date().toISOString();

    const { error } = await supabase
      .from('events')
      .update({
        day_close_time: closeTime,
      })
      .eq('id', event.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to end the day.',
        variant: 'destructive',
      });
      return;
    }

    setCurrentEvent({
      ...currentEvent,
      day_close_time: closeTime,
    });
    setShowEndDayDialog(false);
    setShowStartConfirm(true);
    onUpdate();

    toast({
      title: `Day ${currentDay} Ended`,
      description: `Event closed at ${format(new Date(closeTime), 'h:mm a')}`,
    });
  };

  const recordSale = async (itemId: string, quantity: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const remaining = item.starting_quantity - item.quantity_sold;
    if (quantity > remaining) {
      toast({
        title: 'Not enough inventory',
        description: `Only ${remaining} left in stock.`,
        variant: 'destructive',
      });
      return;
    }

    const newQuantitySold = item.quantity_sold + quantity;

    setItems(items.map(i =>
      i.id === itemId ? { ...i, quantity_sold: newQuantitySold } : i
    ));

    const { error: updateError } = await supabase
      .from('event_items')
      .update({ quantity_sold: newQuantitySold })
      .eq('id', itemId);

    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to update inventory.',
        variant: 'destructive',
      });
      loadItems();
      return;
    }

    await supabase.from('event_sales').insert({
      event_item_id: itemId,
      quantity,
      unit_price: item.price,
      total_price: item.price * quantity,
    });
  };

  const handleQuickSale = (itemId: string) => {
    recordSale(itemId, 1);
  };

  const handleQuickRemove = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.quantity_sold <= 0) return;

    const newQuantitySold = item.quantity_sold - 1;

    setItems(items.map(i =>
      i.id === itemId ? { ...i, quantity_sold: newQuantitySold } : i
    ));

    await supabase
      .from('event_items')
      .update({ quantity_sold: newQuantitySold })
      .eq('id', itemId);

    const { data: recentSale } = await supabase
      .from('event_sales')
      .select('id')
      .eq('event_item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSale) {
      await supabase.from('event_sales').delete().eq('id', recentSale.id);
    }
  };

  const handleManualSale = () => {
    if (!manualSaleItem || manualQuantity <= 0) return;
    recordSale(manualSaleItem.id, manualQuantity);
    setManualSaleItem(null);
    setManualQuantity(1);
  };

  const completeEvent = async () => {
    const closeTime = new Date().toISOString();

    await supabase
      .from('events')
      .update({
        status: 'completed',
        day_close_time: closeTime,
      })
      .eq('id', event.id);
    
    toast({
      title: 'Event Completed',
      description: 'The event has been marked as completed.',
    });
    setShowCompleteDialog(false);
    onUpdate();
    onBack();
  };

  // Calculate metrics
  const totalRevenue = items.reduce((sum, item) => sum + (item.price * item.quantity_sold), 0);
  const totalCOGS = items.reduce((sum, item) => sum + (item.cogs * item.quantity_sold), 0);
  const totalProfit = totalRevenue - totalCOGS;
  const totalItemsSold = items.reduce((sum, item) => sum + item.quantity_sold, 0);
  const totalInventory = items.reduce((sum, item) => sum + item.starting_quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Start Confirmation Screen
  if (showStartConfirm) {
    const isFirstDay = currentDay === 0;
    const dayNumber = currentDay + 1;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl border p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-pink-soft/20 flex items-center justify-center">
              <Play className="w-8 h-8 text-pink-soft" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">{event.name}</h2>
              <p className="text-muted-foreground mt-1">
                {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}
                {event.location && ` • ${event.location}`}
              </p>
            </div>

            <div className="bg-secondary rounded-lg p-4 space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Day {dayNumber}</span>
                {!isFirstDay && (
                  <span className="text-muted-foreground">(Multi-day event)</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Opening time will be recorded when you start</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>{items.length} items ready • {totalInventory} total inventory</span>
              </div>
            </div>

            {!isFirstDay && currentEvent.day_close_time && (
              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <p>Day {currentDay} ended at {format(new Date(currentEvent.day_close_time), 'h:mm a')}</p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={startDay}
                className="w-full bg-pink-soft hover:bg-pink-medium text-white py-6 text-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                {isFirstDay ? 'Start Event' : `Start Day ${dayNumber}`}
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-foreground">{event.name}</h2>
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Day {currentDay}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentEvent.day_open_time && (
                <>Opened at {format(new Date(currentEvent.day_open_time), 'h:mm a')} • </>
              )}
              {event.location && `${event.location}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowEndDayDialog(true)}
            variant="outline"
          >
            <Clock className="w-4 h-4 mr-2" />
            End Day {currentDay}
          </Button>
          <Button
            onClick={() => setShowCompleteDialog(true)}
            variant="outline"
            className="text-green-600 hover:text-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Event
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Profit</span>
          </div>
          <p className="text-2xl font-bold text-primary">${totalProfit.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="w-4 h-4" />
            <span className="text-sm">Items Sold</span>
          </div>
          <p className="text-2xl font-bold">{totalItemsSold} / {totalInventory}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">COGS</span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground">${totalCOGS.toFixed(2)}</p>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const remaining = item.starting_quantity - item.quantity_sold;
          const itemRevenue = item.price * item.quantity_sold;
          const soldPercentage = item.starting_quantity > 0 
            ? (item.quantity_sold / item.starting_quantity) * 100 
            : 0;

          return (
            <div key={item.id} className="bg-card rounded-lg p-4 border space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${itemRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity_sold} sold</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-pink-soft h-2 rounded-full transition-all"
                  style={{ width: `${soldPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{remaining} remaining</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickRemove(item.id)}
                    disabled={item.quantity_sold <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleQuickSale(item.id)}
                    disabled={remaining <= 0}
                    className="bg-pink-soft hover:bg-pink-medium"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setManualSaleItem(item);
                      setManualQuantity(1);
                    }}
                    disabled={remaining <= 0}
                  >
                    +#
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No items in this event. Go back and add some inventory first.</p>
        </div>
      )}

      {/* Manual Sale Dialog */}
      <Dialog open={!!manualSaleItem} onOpenChange={() => setManualSaleItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Sale: {manualSaleItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                max={manualSaleItem ? manualSaleItem.starting_quantity - manualSaleItem.quantity_sold : 1}
                value={manualQuantity}
                onChange={(e) => setManualQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            {manualSaleItem && (
              <p className="text-sm text-muted-foreground">
                Total: ${(manualSaleItem.price * manualQuantity).toFixed(2)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualSaleItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleManualSale} className="bg-pink-soft hover:bg-pink-medium">
              Record Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Day Dialog */}
      <Dialog open={showEndDayDialog} onOpenChange={setShowEndDayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Day {currentDay}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>Are you sure you want to end Day {currentDay}? You can start a new day afterwards for multi-day events.</p>
            <div className="bg-secondary rounded-lg p-4 space-y-2">
              {currentEvent.day_open_time && (
                <p><strong>Opened at:</strong> {format(new Date(currentEvent.day_open_time), 'h:mm a')}</p>
              )}
              <p><strong>Closing at:</strong> {format(new Date(), 'h:mm a')}</p>
              <p><strong>Today's Revenue:</strong> ${totalRevenue.toFixed(2)}</p>
              <p><strong>Items Sold:</strong> {totalItemsSold}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={endDay} className="bg-pink-soft hover:bg-pink-medium">
              End Day {currentDay}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Event Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>Are you sure you want to mark this event as completed? This will end the event permanently.</p>
            <div className="bg-secondary rounded-lg p-4 space-y-2">
              <p><strong>Total Days:</strong> {currentDay}</p>
              <p><strong>Final Revenue:</strong> ${totalRevenue.toFixed(2)}</p>
              <p><strong>Total COGS:</strong> ${totalCOGS.toFixed(2)}</p>
              <p><strong>Net Profit:</strong> ${totalProfit.toFixed(2)}</p>
              <p><strong>Items Sold:</strong> {totalItemsSold} / {totalInventory}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={completeEvent} className="bg-green-600 hover:bg-green-700">
              Complete Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};