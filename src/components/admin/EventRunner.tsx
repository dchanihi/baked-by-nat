import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Minus, DollarSign, Package, TrendingUp, CheckCircle, Play, Clock, Calendar, Edit2, BarChart3, Search, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getIconComponent } from '@/lib/categoryIcons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EventItem {
  id: string;
  name: string;
  cogs: number;
  price: number;
  starting_quantity: number;
  quantity_sold: number;
  category: string | null;
}
interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  current_day?: number;
  day_open_time?: string | null;
  day_close_time?: string | null;
}
interface DaySummary {
  id: string;
  day_number: number;
  open_time: string;
  close_time: string | null;
  revenue: number;
  items_sold: number;
}
interface EventRunnerProps {
  event: Event;
  onBack: () => void;
  onUpdate: () => void;
  onEdit?: () => void;
}
export const EventRunner = ({
  event,
  onBack,
  onUpdate,
  onEdit
}: EventRunnerProps) => {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualSaleItem, setManualSaleItem] = useState<EventItem | null>(null);
  const [manualQuantity, setManualQuantity] = useState(1);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showEndDayDialog, setShowEndDayDialog] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event>(event);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [editingInventory, setEditingInventory] = useState(false);
  const [inventoryEdits, setInventoryEdits] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('sales');
  const [categoryIconMap, setCategoryIconMap] = useState<Record<string, string>>({});
  const [allCategories, setAllCategories] = useState<{name: string; icon: string | null}[]>([]);
  
  // Add new item state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCogs, setNewItemCogs] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  // Determine if we need to show the start confirmation
  const isDayActive = currentEvent.day_open_time && !currentEvent.day_close_time;
  const currentDay = currentEvent.current_day || 0;
  
  // Get unique categories from items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [items]);
  
  // Helper to get the icon for a category name
  const getCategoryIcon = (categoryName: string | null) => {
    if (!categoryName) return getIconComponent(null);
    const iconName = categoryIconMap[categoryName];
    return getIconComponent(iconName || null);
  };
  
  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(query));
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }
    
    // Sort items
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'remaining':
          return (b.starting_quantity - b.quantity_sold) - (a.starting_quantity - a.quantity_sold);
        default:
          return 0;
      }
    });
    
    return result;
  }, [items, searchQuery, selectedCategory, sortBy]);
  useEffect(() => {
    loadItems();
    loadEventDetails();
    loadDaySummaries();
    loadCategories();
  }, [event.id]);
  
  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('name, icon');
    if (data) {
      const iconMap: Record<string, string> = {};
      data.forEach(cat => {
        if (cat.name && cat.icon) {
          iconMap[cat.name] = cat.icon;
        }
      });
      setCategoryIconMap(iconMap);
      setAllCategories(data);
    }
  };
  
  const resetNewItemForm = () => {
    setNewItemName('');
    setNewItemPrice('');
    setNewItemCogs('');
    setNewItemQuantity('');
    setNewItemCategory('');
    setShowAddItem(false);
  };
  
  const addNewItem = async () => {
    if (!newItemName.trim() || !newItemPrice || !newItemQuantity) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in name, price, and quantity.',
        variant: 'destructive'
      });
      return;
    }
    
    const { data, error } = await supabase.from('event_items').insert({
      event_id: event.id,
      name: newItemName.trim(),
      price: parseFloat(newItemPrice) || 0,
      cogs: parseFloat(newItemCogs) || 0,
      starting_quantity: parseInt(newItemQuantity) || 0,
      category: newItemCategory || null,
    }).select().single();
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item.',
        variant: 'destructive'
      });
      return;
    }
    
    // Add to local state
    const newItem: EventItem = {
      id: data.id,
      name: data.name,
      cogs: Number(data.cogs),
      price: Number(data.price),
      starting_quantity: data.starting_quantity,
      quantity_sold: data.quantity_sold,
      category: data.category || null
    };
    setItems([...items, newItem]);
    setInventoryEdits({
      ...inventoryEdits,
      [data.id]: data.starting_quantity
    });
    
    resetNewItemForm();
    toast({
      title: 'Item Added',
      description: `${newItemName} has been added to the inventory.`
    });
  };
  const loadEventDetails = async () => {
    const {
      data,
      error
    } = await supabase.from('events').select('*').eq('id', event.id).maybeSingle();
    if (data) {
      setCurrentEvent(data as Event);
      // Show start confirmation if day isn't active
      if (!data.day_open_time || data.day_close_time) {
        setShowStartConfirm(true);
      }
    }
  };
  const loadItems = async () => {
    const {
      data,
      error
    } = await supabase.from('event_items').select('*').eq('event_id', event.id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load items.',
        variant: 'destructive'
      });
    } else {
      const loadedItems = data?.map(item => ({
        id: item.id,
        name: item.name,
        cogs: Number(item.cogs),
        price: Number(item.price),
        starting_quantity: item.starting_quantity,
        quantity_sold: item.quantity_sold,
        category: item.category || null
      })) || [];
      setItems(loadedItems);
      // Initialize inventory edits
      const edits: Record<string, number> = {};
      loadedItems.forEach(item => {
        edits[item.id] = item.starting_quantity;
      });
      setInventoryEdits(edits);
    }
    setLoading(false);
  };
  const loadDaySummaries = async () => {
    const {
      data,
      error
    } = await supabase.from('event_day_summaries').select('*').eq('event_id', event.id).order('day_number', {
      ascending: true
    });
    if (!error && data) {
      setDaySummaries(data.map(d => ({
        id: d.id,
        day_number: d.day_number,
        open_time: d.open_time,
        close_time: d.close_time,
        revenue: Number(d.revenue),
        items_sold: d.items_sold
      })));
    }
  };
  const startDay = async () => {
    const newDay = (currentEvent.current_day || 0) + 1;
    const openTime = new Date().toISOString();
    const {
      error
    } = await supabase.from('events').update({
      status: 'active',
      current_day: newDay,
      day_open_time: openTime,
      day_close_time: null
    }).eq('id', event.id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to start the day.',
        variant: 'destructive'
      });
      return;
    }
    setCurrentEvent({
      ...currentEvent,
      status: 'active',
      current_day: newDay,
      day_open_time: openTime,
      day_close_time: null
    });
    setShowStartConfirm(false);
    setEditingInventory(false);
    onUpdate();
    toast({
      title: `Day ${newDay} Started`,
      description: `Event opened at ${format(new Date(openTime), 'h:mm a')}`
    });
  };
  const endDay = async () => {
    const closeTime = new Date().toISOString();

    // Calculate today's metrics (since day started)
    const dayRevenue = totalRevenue;
    const dayItemsSold = totalItemsSold;

    // Save day summary
    await supabase.from('event_day_summaries').insert({
      event_id: event.id,
      day_number: currentDay,
      open_time: currentEvent.day_open_time!,
      close_time: closeTime,
      revenue: dayRevenue,
      items_sold: dayItemsSold
    });
    const {
      error
    } = await supabase.from('events').update({
      day_close_time: closeTime
    }).eq('id', event.id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to end the day.',
        variant: 'destructive'
      });
      return;
    }
    setCurrentEvent({
      ...currentEvent,
      day_close_time: closeTime
    });
    setShowEndDayDialog(false);
    setShowStartConfirm(true);
    loadDaySummaries();
    onUpdate();
    toast({
      title: `Day ${currentDay} Ended`,
      description: `Event closed at ${format(new Date(closeTime), 'h:mm a')}`
    });
  };
  const saveInventoryEdits = async () => {
    const updates = Object.entries(inventoryEdits).map(([id, quantity]) => ({
      id,
      starting_quantity: quantity
    }));
    for (const update of updates) {
      await supabase.from('event_items').update({
        starting_quantity: update.starting_quantity
      }).eq('id', update.id);
    }
    await loadItems();
    setEditingInventory(false);
    toast({
      title: 'Inventory Updated',
      description: 'Starting quantities have been updated for the next day.'
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
        variant: 'destructive'
      });
      return;
    }
    const newQuantitySold = item.quantity_sold + quantity;
    setItems(items.map(i => i.id === itemId ? {
      ...i,
      quantity_sold: newQuantitySold
    } : i));
    const {
      error: updateError
    } = await supabase.from('event_items').update({
      quantity_sold: newQuantitySold
    }).eq('id', itemId);
    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to update inventory.',
        variant: 'destructive'
      });
      loadItems();
      return;
    }
    await supabase.from('event_sales').insert({
      event_item_id: itemId,
      quantity,
      unit_price: item.price,
      total_price: item.price * quantity
    });
  };
  const handleQuickSale = (itemId: string) => {
    recordSale(itemId, 1);
  };
  const handleQuickRemove = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.quantity_sold <= 0) return;
    const newQuantitySold = item.quantity_sold - 1;
    setItems(items.map(i => i.id === itemId ? {
      ...i,
      quantity_sold: newQuantitySold
    } : i));
    await supabase.from('event_items').update({
      quantity_sold: newQuantitySold
    }).eq('id', itemId);
    const {
      data: recentSale
    } = await supabase.from('event_sales').select('id').eq('event_item_id', itemId).order('created_at', {
      ascending: false
    }).limit(1).maybeSingle();
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

    // Save final day summary if day was active
    if (isDayActive) {
      await supabase.from('event_day_summaries').insert({
        event_id: event.id,
        day_number: currentDay,
        open_time: currentEvent.day_open_time!,
        close_time: closeTime,
        revenue: totalRevenue,
        items_sold: totalItemsSold
      });
    }
    await supabase.from('events').update({
      status: 'completed',
      day_close_time: closeTime
    }).eq('id', event.id);
    toast({
      title: 'Event Completed',
      description: 'The event has been marked as completed.'
    });
    setShowCompleteDialog(false);
    onUpdate();
    onBack();
  };

  // Calculate metrics
  const totalRevenue = items.reduce((sum, item) => sum + item.price * item.quantity_sold, 0);
  const totalCOGS = items.reduce((sum, item) => sum + item.cogs * item.quantity_sold, 0);
  const totalProfit = totalRevenue - totalCOGS;
  const totalItemsSold = items.reduce((sum, item) => sum + item.quantity_sold, 0);
  const totalInventory = items.reduce((sum, item) => sum + item.starting_quantity, 0);

  // Calculate totals from all day summaries
  const allDaysRevenue = daySummaries.reduce((sum, d) => sum + d.revenue, 0);
  const allDaysItemsSold = daySummaries.reduce((sum, d) => sum + d.items_sold, 0);
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>;
  }

  // Start Confirmation Screen (with inventory editing for multi-day events)
  if (showStartConfirm) {
    const isFirstDay = currentDay === 0;
    const dayNumber = currentDay + 1;
    return <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-xl border p-8 space-y-6">
            <div className="text-center space-y-4">
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
            </div>

            <div className="bg-secondary rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Day {dayNumber}</span>
                {!isFirstDay && <span className="text-muted-foreground">(Multi-day event)</span>}
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

            {!isFirstDay && currentEvent.day_close_time && <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <p>Day {currentDay} ended at {format(new Date(currentEvent.day_close_time), 'h:mm a')}</p>
              </div>}

            {/* Day Summaries Section */}
            {daySummaries.length > 0 && <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Previous Days Summary</h3>
                </div>
                <div className="space-y-2">
                  {daySummaries.map(day => <div key={day.id} className="bg-secondary/50 rounded-lg p-3 flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Day {day.day_number}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(day.open_time), 'h:mm a')} - {day.close_time ? format(new Date(day.close_time), 'h:mm a') : 'ongoing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{day.items_sold} sold</span>
                        <span className="font-medium text-green-600">${day.revenue.toFixed(2)}</span>
                      </div>
                    </div>)}
                  <div className="bg-primary/10 rounded-lg p-3 flex justify-between items-center text-sm font-medium">
                    <span>Total from previous days</span>
                    <div className="flex items-center gap-4">
                      <span>{allDaysItemsSold} sold</span>
                      <span className="text-green-600">${allDaysRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>}

            {/* Inventory Editing (for multi-day events) */}
            {!isFirstDay && <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Adjust Inventory for Day {dayNumber}</h3>
                  <div className="flex gap-2">
                    {!editingInventory ? (
                      <Button variant="outline" size="sm" onClick={() => setEditingInventory(true)}>
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit Quantities
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingInventory(false);
                          setShowAddItem(false);
                          const edits: Record<string, number> = {};
                          items.forEach(item => {
                            edits[item.id] = item.starting_quantity;
                          });
                          setInventoryEdits(edits);
                        }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveInventoryEdits} className="bg-pink-soft hover:bg-pink-medium">
                          Save Changes
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {editingInventory ? (
                  <div className="space-y-3">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {items.map(item => (
                        <div key={item.id} className="bg-secondary/50 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground text-sm ml-2">
                              (sold: {item.quantity_sold})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Qty:</Label>
                            <Input 
                              type="number" 
                              min="0" 
                              value={inventoryEdits[item.id] || 0} 
                              onChange={e => setInventoryEdits({
                                ...inventoryEdits,
                                [item.id]: parseInt(e.target.value) || 0
                              })} 
                              className="w-20 h-8" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add New Item Section */}
                    {!showAddItem ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowAddItem(true)}
                        className="w-full border-dashed"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add New Item
                      </Button>
                    ) : (
                      <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">New Item</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={resetNewItemForm}
                            className="h-7 w-7 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">Name *</Label>
                            <Input 
                              placeholder="Item name" 
                              value={newItemName}
                              onChange={e => setNewItemName(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Price *</Label>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="0.00" 
                              value={newItemPrice}
                              onChange={e => setNewItemPrice(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">COGS</Label>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="0.00" 
                              value={newItemCogs}
                              onChange={e => setNewItemCogs(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Quantity *</Label>
                            <Input 
                              type="number" 
                              min="0"
                              placeholder="0" 
                              value={newItemQuantity}
                              onChange={e => setNewItemQuantity(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Category</Label>
                            <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {allCategories.map(cat => (
                                  <SelectItem key={cat.name} value={cat.name}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={addNewItem}
                          className="w-full bg-pink-soft hover:bg-pink-medium"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Item
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Restock or adjust quantities before starting the next day.
                  </p>
                )}
              </div>}

            <div className="space-y-3 pt-2">
              <Button onClick={startDay} className="w-full bg-pink-soft hover:bg-pink-medium text-white py-6 text-lg" disabled={editingInventory}>
                <Play className="w-5 h-5 mr-2" />
                {isFirstDay ? 'Start Event' : `Start Day ${dayNumber}`}
              </Button>
              <Button variant="outline" onClick={onBack} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>;
  }
  return <div className="space-y-6">
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
              {currentEvent.day_open_time && <>Opened at {format(new Date(currentEvent.day_open_time), 'h:mm a')} • </>}
              {event.location && `${event.location}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onEdit && <Button onClick={onEdit} variant="ghost" size="icon" className="h-9 w-9">
              <Edit2 className="w-4 h-4" />
            </Button>}
          <Button onClick={() => setShowEndDayDialog(true)} variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            End Day {currentDay}
          </Button>
          <Button onClick={() => setShowCompleteDialog(true)} variant="outline" className="text-green-600 hover:text-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Event
          </Button>
        </div>
      </div>

      {/* Tabs for Sales and Day Summary */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sales">
            <Package className="w-4 h-4 mr-2" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="summary">
            <BarChart3 className="w-4 h-4 mr-2" />
            Day Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6 mt-4">
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">COGS</span>
              </div>
              <p className="text-2xl font-bold text-muted-foreground">${totalCOGS.toFixed(2)}</p>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-primary">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Profit</span>
              </div>
              <p className="text-2xl font-bold text-[#16a249]">${totalProfit.toFixed(2)}</p>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="w-4 h-4" />
                <span className="text-sm">Items Sold</span>
              </div>
              <p className="text-2xl font-bold">{totalItemsSold} / {totalInventory}</p>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => {
                  const IconComponent = getCategoryIcon(cat);
                  return (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span className="capitalize">{cat}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                <SelectItem value="remaining">Most Remaining</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const remaining = item.starting_quantity - item.quantity_sold;
              const itemRevenue = item.price * item.quantity_sold;
              const soldPercentage = item.starting_quantity > 0 ? item.quantity_sold / item.starting_quantity * 100 : 0;
              const CategoryIcon = getCategoryIcon(item.category);
              
              return (
                <div key={item.id} className="bg-card rounded-lg p-4 border space-y-3">
                  <div className="flex gap-3">
                    {/* Category Icon */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-pink-soft/10 flex items-center justify-center">
                      <CategoryIcon className="w-7 h-7 text-pink-soft" />
                    </div>
                    
                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-bold text-green-600">${itemRevenue.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity_sold} sold</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-pink-soft h-2 rounded-full transition-all" style={{
                      width: `${soldPercentage}%`
                    }} />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{remaining} remaining</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleQuickRemove(item.id)} disabled={item.quantity_sold <= 0}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleQuickSale(item.id)} disabled={remaining <= 0} className="bg-pink-soft hover:bg-pink-medium">
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => {
                        setManualSaleItem(item);
                        setManualQuantity(1);
                      }} disabled={remaining <= 0}>
                        +#
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && items.length > 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No items match your search or filter.</p>
              <Button variant="link" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                Clear filters
              </Button>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No items in this event. Go back and add some inventory first.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4 mt-4">
          {/* Event Totals - Compact Header */}
          <div className="bg-gradient-to-r from-primary/10 to-pink-soft/10 rounded-xl border border-primary/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Event Totals
              </h3>
              <span className="text-xs text-muted-foreground">{currentDay} day{currentDay !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">${(allDaysRevenue + totalRevenue).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{allDaysItemsSold + totalItemsSold}</p>
                <p className="text-xs text-muted-foreground">Sold</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-primary">${totalProfit.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Profit</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-600">${totalCOGS.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">COGS</p>
              </div>
            </div>
          </div>

          {/* Revenue Chart - Mini Bar Graph */}
          {(daySummaries.length > 0 || currentDay > 0) && (
            <div className="bg-card rounded-xl border p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Revenue by Day
              </h4>
              <div className="flex items-end gap-1 h-20">
                {(() => {
                  const allDays = [
                    ...daySummaries.map(d => ({ day: d.day_number, revenue: d.revenue, items: d.items_sold, current: false })),
                    ...(currentDay > 0 ? [{ day: currentDay, revenue: totalRevenue, items: totalItemsSold, current: true }] : [])
                  ].sort((a, b) => a.day - b.day);
                  const maxRevenue = Math.max(...allDays.map(d => d.revenue), 1);
                  
                  return allDays.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div 
                        className={`w-full rounded-t transition-all ${d.current ? 'bg-green-500' : 'bg-green-400/70'} hover:opacity-80`}
                        style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 8)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">D{d.day}</span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border rounded-md px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-md">
                        <p className="font-medium">${d.revenue.toFixed(2)}</p>
                        <p className="text-muted-foreground">{d.items} items</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Daily Breakdown - Compact Cards */}
          <div className="space-y-2">
            {/* Current Day */}
            <div className="bg-card rounded-lg border p-3 flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-green-600">{currentDay}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Today</span>
                  <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">Live</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {currentEvent.day_open_time ? format(new Date(currentEvent.day_open_time), 'h:mm a') : '-'} – now
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{totalItemsSold} sold</p>
              </div>
              <div className="w-16">
                <div className="w-full bg-secondary rounded-full h-1.5">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full transition-all" 
                    style={{ width: `${Math.min((totalRevenue / Math.max(allDaysRevenue + totalRevenue, 1)) * 100, 100)}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Previous Days - Compact */}
            {daySummaries.slice().reverse().map(day => {
              const dayDuration = day.close_time 
                ? Math.round((new Date(day.close_time).getTime() - new Date(day.open_time).getTime()) / (1000 * 60 * 60))
                : 0;
              const revenuePercent = Math.min((day.revenue / Math.max(allDaysRevenue + totalRevenue, 1)) * 100, 100);
              
              return (
                <div key={day.id} className="bg-card rounded-lg border p-3 flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-bold text-muted-foreground">{day.day_number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">Day {day.day_number}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(new Date(day.open_time), 'h:mm a')} – {day.close_time ? format(new Date(day.close_time), 'h:mm a') : '-'}
                      {dayDuration > 0 && <span className="ml-1">({dayDuration}h)</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${day.revenue.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{day.items_sold} sold</p>
                  </div>
                  <div className="w-16">
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div 
                        className="bg-primary/60 h-1.5 rounded-full transition-all" 
                        style={{ width: `${revenuePercent}%` }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Items Sold Distribution - Mini Visual */}
          {items.length > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Top Sellers
              </h4>
              <div className="space-y-2">
                {items
                  .filter(item => item.quantity_sold > 0)
                  .sort((a, b) => b.quantity_sold - a.quantity_sold)
                  .slice(0, 5)
                  .map(item => {
                    const maxSold = Math.max(...items.map(i => i.quantity_sold), 1);
                    const percent = (item.quantity_sold / maxSold) * 100;
                    const CategoryIcon = getCategoryIcon(item.category);
                    
                    return (
                      <div key={item.id} className="flex items-center gap-2">
                        <CategoryIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="truncate font-medium">{item.name}</span>
                            <span className="text-muted-foreground ml-2">{item.quantity_sold}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1">
                            <div 
                              className="bg-pink-soft h-1 rounded-full transition-all" 
                              style={{ width: `${percent}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {items.filter(item => item.quantity_sold > 0).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No sales yet</p>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Manual Sale Dialog */}
      <Dialog open={!!manualSaleItem} onOpenChange={() => setManualSaleItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Sale: {manualSaleItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min="1" max={manualSaleItem ? manualSaleItem.starting_quantity - manualSaleItem.quantity_sold : 1} value={manualQuantity} onChange={e => setManualQuantity(parseInt(e.target.value) || 1)} />
            </div>
            {manualSaleItem && <p className="text-sm text-muted-foreground">
                Total: ${(manualSaleItem.price * manualQuantity).toFixed(2)}
              </p>}
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
              {currentEvent.day_open_time && <p><strong>Opened at:</strong> {format(new Date(currentEvent.day_open_time), 'h:mm a')}</p>}
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
              <p><strong>Final Revenue:</strong> ${(allDaysRevenue + totalRevenue).toFixed(2)}</p>
              <p><strong>Total COGS:</strong> ${totalCOGS.toFixed(2)}</p>
              <p><strong>Net Profit:</strong> ${totalProfit.toFixed(2)}</p>
              <p><strong>Items Sold:</strong> {allDaysItemsSold + totalItemsSold} / {totalInventory}</p>
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
    </div>;
};