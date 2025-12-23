import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Minus, DollarSign, Package, TrendingUp, CheckCircle, Play, Clock, Calendar, Edit2, BarChart3, Search, Filter, X, ShoppingCart, Trash2, History, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getIconComponent } from '@/lib/categoryIcons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
interface EventItem {
  id: string;
  name: string;
  cogs: number;
  price: number;
  starting_quantity: number;
  quantity_sold: number;
  category: string | null;
}
interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  category: string | null;
  cogs: number;
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
  const [allCategories, setAllCategories] = useState<{
    name: string;
    icon: string | null;
  }[]>([]);

  // Cart state for POS
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

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

  // Order history state
  interface OrderHistoryItem {
    order_id: string;
    created_at: string;
    items: {
      name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }[];
    total: number;
  }
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Cart calculations
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Cart operations
  const addToCart = (item: EventItem) => {
    const remaining = item.starting_quantity - item.quantity_sold;
    const existingCartItem = cart.find(c => c.itemId === item.id);
    const currentInCart = existingCartItem?.quantity || 0;
    if (currentInCart >= remaining) {
      toast({
        title: 'Not enough stock',
        description: `Only ${remaining} available.`,
        variant: 'destructive'
      });
      return;
    }
    if (existingCartItem) {
      setCart(cart.map(c => c.itemId === item.id ? {
        ...c,
        quantity: c.quantity + 1
      } : c));
    } else {
      setCart([...cart, {
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        category: item.category,
        cogs: item.cogs
      }]);
    }
  };
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.itemId !== itemId));
  };
  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const remaining = item.starting_quantity - item.quantity_sold;
    if (quantity > remaining) {
      toast({
        title: 'Not enough stock',
        description: `Only ${remaining} available.`,
        variant: 'destructive'
      });
      return;
    }
    setCart(cart.map(c => c.itemId === itemId ? {
      ...c,
      quantity
    } : c));
  };
  const clearCart = () => {
    setCart([]);
  };
  const checkout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      // Validate all items still have sufficient inventory
      for (const cartItem of cart) {
        const item = items.find(i => i.id === cartItem.itemId);
        if (!item) {
          throw new Error(`Item ${cartItem.name} not found`);
        }
        const remaining = item.starting_quantity - item.quantity_sold;
        if (cartItem.quantity > remaining) {
          throw new Error(`Not enough ${cartItem.name}. Only ${remaining} left.`);
        }
      }

      // Generate a unique order_id for this transaction
      const orderId = crypto.randomUUID();

      // Update inventory and create sales records
      for (const cartItem of cart) {
        const item = items.find(i => i.id === cartItem.itemId)!;
        const newQuantitySold = item.quantity_sold + cartItem.quantity;

        // Update quantity_sold
        const {
          error: updateError
        } = await supabase.from('event_items').update({
          quantity_sold: newQuantitySold
        }).eq('id', cartItem.itemId);
        if (updateError) throw updateError;

        // Record sale with order_id to group items in same transaction
        const {
          error: saleError
        } = await supabase.from('event_sales').insert({
          event_item_id: cartItem.itemId,
          quantity: cartItem.quantity,
          unit_price: cartItem.price,
          total_price: cartItem.price * cartItem.quantity,
          order_id: orderId
        });
        if (saleError) throw saleError;

        // Update local state
        setItems(prev => prev.map(i => i.id === cartItem.itemId ? {
          ...i,
          quantity_sold: newQuantitySold
        } : i));
      }
      setOrderCount(prev => prev + 1);
      toast({
        title: 'Sale Complete!',
        description: `${cartItemCount} items • $${cartTotal.toFixed(2)}`
      });
      clearCart();
      setMobileCartOpen(false);
    } catch (error: any) {
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Failed to process sale.',
        variant: 'destructive'
      });
      // Reload items to get fresh data
      loadItems();
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Get cart quantity for an item
  const getCartQuantity = (itemId: string) => {
    return cart.find(c => c.itemId === itemId)?.quantity || 0;
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
          return b.starting_quantity - b.quantity_sold - (a.starting_quantity - a.quantity_sold);
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
    loadOrderCount();
  }, [event.id]);

  // Load order count from database (count distinct order_ids)
  const loadOrderCount = async () => {
    // Get all event_item_ids for this event first
    const {
      data: eventItems
    } = await supabase.from('event_items').select('id').eq('event_id', event.id);
    if (!eventItems || eventItems.length === 0) {
      setOrderCount(0);
      return;
    }
    const itemIds = eventItems.map(item => item.id);

    // Get distinct order_ids from sales for these items
    const {
      data: sales
    } = await supabase.from('event_sales').select('order_id').in('event_item_id', itemIds);
    if (sales) {
      // Count distinct non-null order_ids
      const uniqueOrderIds = new Set(sales.map(s => s.order_id).filter(Boolean));
      setOrderCount(uniqueOrderIds.size);
    }
  };

  // Load order history from database
  const loadOrderHistory = async () => {
    setLoadingHistory(true);
    try {
      // Get all event_item_ids for this event
      const {
        data: eventItems
      } = await supabase.from('event_items').select('id, name').eq('event_id', event.id);
      if (!eventItems || eventItems.length === 0) {
        setOrderHistory([]);
        return;
      }
      const itemIds = eventItems.map(item => item.id);
      const itemNameMap = new Map(eventItems.map(item => [item.id, item.name]));

      // Get all sales for these items
      const {
        data: sales
      } = await supabase.from('event_sales').select('order_id, event_item_id, quantity, unit_price, total_price, created_at').in('event_item_id', itemIds).order('created_at', {
        ascending: false
      });
      if (!sales || sales.length === 0) {
        setOrderHistory([]);
        return;
      }

      // Group sales by order_id
      const ordersMap = new Map<string, OrderHistoryItem>();
      for (const sale of sales) {
        const orderId = sale.order_id || sale.created_at; // Fallback for legacy sales without order_id

        if (!ordersMap.has(orderId)) {
          ordersMap.set(orderId, {
            order_id: orderId,
            created_at: sale.created_at,
            items: [],
            total: 0
          });
        }
        const order = ordersMap.get(orderId)!;
        order.items.push({
          name: itemNameMap.get(sale.event_item_id) || 'Unknown Item',
          quantity: sale.quantity,
          unit_price: Number(sale.unit_price),
          total_price: Number(sale.total_price)
        });
        order.total += Number(sale.total_price);
      }

      // Convert to array and sort by most recent
      const historyArray = Array.from(ordersMap.values());
      historyArray.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrderHistory(historyArray);
    } catch (error) {
      console.error('Failed to load order history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };
  const loadCategories = async () => {
    const {
      data
    } = await supabase.from('categories').select('name, icon');
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
    const {
      data,
      error
    } = await supabase.from('event_items').insert({
      event_id: event.id,
      name: newItemName.trim(),
      price: parseFloat(newItemPrice) || 0,
      cogs: parseFloat(newItemCogs) || 0,
      starting_quantity: parseInt(newItemQuantity) || 0,
      category: newItemCategory || null
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
  const totalItemsSold = items.reduce((sum, item) => sum + item.quantity_sold, 0);
  const totalInventory = items.reduce((sum, item) => sum + item.starting_quantity, 0);
  const avgOrderSize = orderCount > 0 ? totalRevenue / orderCount : 0;
  const itemsPerOrder = orderCount > 0 ? totalItemsSold / orderCount : 0;

  // Calculate totals from all day summaries
  const allDaysRevenue = daySummaries.reduce((sum, d) => sum + d.revenue, 0);
  const allDaysItemsSold = daySummaries.reduce((sum, d) => sum + d.items_sold, 0);
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>;
  }

  // Cart Sidebar Component
  const CartSidebar = ({
    isMobile = false
  }: {
    isMobile?: boolean;
  }) => <div className={`flex flex-col h-full ${isMobile ? '' : 'bg-card border-l'}`}>
      {/* Cart Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Current Order
          </h3>
          {cart.length > 0 && <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>}
        </div>
      </div>
      
      {/* Cart Items */}
      <ScrollArea className="flex-1 p-4">
        {cart.length === 0 ? <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Cart is empty</p>
            <p className="text-sm">Tap items to add them</p>
          </div> : <div className="space-y-3 w-full">
            <AnimatePresence mode="popLayout">
              {cart.map(cartItem => {
            const CategoryIcon = getCategoryIcon(cartItem.category);
            return <motion.div key={cartItem.itemId} layout initial={{
              opacity: 0,
              y: -10
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              x: 50
            }} className="bg-secondary/50 rounded-lg p-3 w-full">
                    <div className="flex items-start gap-2 w-full">
                      <div className="w-8 h-8 rounded-lg bg-pink-soft/10 flex items-center justify-center flex-shrink-0">
                        <CategoryIcon className="w-4 h-4 text-pink-soft" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="font-medium text-sm truncate">{cartItem.name}</p>
                        <p className="text-xs text-muted-foreground">${cartItem.price.toFixed(2)} ea</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(cartItem.itemId)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity - 1)} className="h-7 w-7 p-0">
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center font-medium text-sm">{cartItem.quantity}</span>
                        <Button variant="outline" size="sm" onClick={() => updateCartQuantity(cartItem.itemId, cartItem.quantity + 1)} className="h-7 w-7 p-0">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-semibold text-sm">${(cartItem.price * cartItem.quantity).toFixed(2)}</span>
                    </div>
                  </motion.div>;
          })}
            </AnimatePresence>
          </div>}
      </ScrollArea>
      
      {/* Cart Footer */}
      <div className="p-4 border-t space-y-4 bg-background">
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">${cartTotal.toFixed(2)}</span>
        </div>
        <Button onClick={checkout} disabled={cart.length === 0 || isCheckingOut} className="w-full bg-pink-soft hover:bg-pink-medium text-white py-6 text-lg">
          {isCheckingOut ? 'Processing...' : <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Checkout ({cartItemCount} items)
            </>}
        </Button>
      </div>
    </div>;

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
                    {!editingInventory ? <Button variant="outline" size="sm" onClick={() => setEditingInventory(true)}>
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit Quantities
                      </Button> : <>
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
                      </>}
                  </div>
                </div>
                
                {editingInventory ? <div className="space-y-3">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {items.map(item => <div key={item.id} className="bg-secondary/50 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground text-sm ml-2">
                              (sold: {item.quantity_sold})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Qty:</Label>
                            <Input type="number" min="0" value={inventoryEdits[item.id] || 0} onChange={e => setInventoryEdits({
                      ...inventoryEdits,
                      [item.id]: parseInt(e.target.value) || 0
                    })} className="w-20 h-8" />
                          </div>
                        </div>)}
                    </div>
                    
                    {/* Add New Item Section */}
                    {!showAddItem ? <Button variant="outline" size="sm" onClick={() => setShowAddItem(true)} className="w-full border-dashed">
                        <Plus className="w-4 h-4 mr-1" />
                        Add New Item
                      </Button> : <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">New Item</span>
                          <Button variant="ghost" size="sm" onClick={resetNewItemForm} className="h-7 w-7 p-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">Name *</Label>
                            <Input placeholder="Item name" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Price *</Label>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">COGS</Label>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" value={newItemCogs} onChange={e => setNewItemCogs(e.target.value)} className="h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Quantity *</Label>
                            <Input type="number" min="0" placeholder="0" value={newItemQuantity} onChange={e => setNewItemQuantity(e.target.value)} className="h-8" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Category</Label>
                            <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {allCategories.map(cat => <SelectItem key={cat.name} value={cat.name}>
                                    {cat.name}
                                  </SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button size="sm" onClick={addNewItem} className="w-full bg-pink-soft hover:bg-pink-medium">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Item
                        </Button>
                      </div>}
                  </div> : <p className="text-sm text-muted-foreground">
                    Restock or adjust quantities before starting the next day.
                  </p>}
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
  return <div className="space-y-4">
      {/* Header */}
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
      <Tabs value={activeTab} onValueChange={tab => {
      setActiveTab(tab);
      if (tab === 'history') {
        loadOrderHistory();
      }
    }}>
        <TabsList>
          <TabsTrigger value="sales">
            <Package className="w-4 h-4 mr-2" />
            POS
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Order History
          </TabsTrigger>
          <TabsTrigger value="summary">
            <BarChart3 className="w-4 h-4 mr-2" />
            Day Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          {/* POS Layout - Two Column */}
          <div className="flex gap-6">
            {/* Left Side - Item Tiles */}
            <div className="flex-1 space-y-4">
              {/* Metrics Cards - Compact */}
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-card rounded-lg p-3 border">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="text-xs">Revenue</span>
                  </div>
                  <p className="text-xl font-bold text-primary">${totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-card rounded-lg p-3 border">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                    <Package className="w-3.5 h-3.5" />
                    <span className="text-xs">Items Sold</span>
                  </div>
                  <p className="text-xl font-bold">{totalItemsSold}</p>
                </div>
                <div className="bg-card rounded-lg p-3 border">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="text-xs">Orders</span>
                  </div>
                  <p className="text-xl font-bold">{orderCount}</p>
                </div>
                <div className="bg-card rounded-lg p-3 border">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-xs">Avg Order $</span>
                  </div>
                  <p className="text-xl font-bold">${avgOrderSize.toFixed(2)}</p>
                </div>
                <div className="bg-card rounded-lg p-3 border">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                    <Package className="w-3.5 h-3.5" />
                    <span className="text-xs">Items/Order</span>
                  </div>
                  <p className="text-xl font-bold">{itemsPerOrder.toFixed(1)}</p>
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-9" />
                  {searchQuery && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchQuery('')}>
                      <X className="w-4 h-4" />
                    </Button>}
                </div>
                
                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => {
                    const IconComponent = getCategoryIcon(cat);
                    return <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            <span className="capitalize">{cat}</span>
                          </div>
                        </SelectItem>;
                  })}
                  </SelectContent>
                </Select>
              </div>

              {/* POS Item Tiles Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredItems.map(item => {
                const remaining = item.starting_quantity - item.quantity_sold;
                const cartQty = getCartQuantity(item.id);
                const isOutOfStock = remaining <= 0;
                const CategoryIcon = getCategoryIcon(item.category);
                return <motion.button key={item.id} whileTap={{
                  scale: 0.95
                }} onClick={() => !isOutOfStock && addToCart(item)} disabled={isOutOfStock} className={`relative aspect-square p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center
                        ${isOutOfStock ? 'bg-muted/50 border-muted cursor-not-allowed opacity-60' : 'bg-card border-border hover:border-pink-soft hover:shadow-lg cursor-pointer active:bg-pink-soft/10'}
                        ${cartQty > 0 ? 'border-pink-soft bg-pink-soft/5' : ''}
                      `}>
                      {/* Cart Badge */}
                      {cartQty > 0 && <Badge className="absolute -top-2 -right-2 bg-pink-soft hover:bg-pink-soft text-white h-6 w-6 p-0 flex items-center justify-center rounded-full text-xs font-bold">
                          {cartQty}
                        </Badge>}
                      
                      {/* Category Icon */}
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isOutOfStock ? 'bg-muted' : 'bg-pink-soft/10'}`}>
                        <CategoryIcon className={`w-8 h-8 ${isOutOfStock ? 'text-muted-foreground' : 'text-pink-soft'}`} />
                      </div>
                      
                      {/* Item Name */}
                      <span className="font-semibold text-sm leading-tight line-clamp-2">{item.name}</span>
                      
                      {/* Price */}
                      <span className="text-lg font-bold text-primary">${item.price.toFixed(2)}</span>
                      
                      {/* Remaining */}
                      <span className={`text-xs ${isOutOfStock ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {isOutOfStock ? 'Out of stock' : `${remaining} left`}
                      </span>
                    </motion.button>;
              })}
              </div>

              {filteredItems.length === 0 && items.length > 0 && <div className="text-center py-12 text-muted-foreground">
                  <p>No items match your search or filter.</p>
                  <Button variant="link" onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}>
                    Clear filters
                  </Button>
                </div>}

              {items.length === 0 && <div className="text-center py-12 text-muted-foreground">
                  <p>No items in this event. Go back and add some inventory first.</p>
                </div>}
            </div>

            {/* Right Side - Cart Sidebar (Desktop) */}
            <div className="hidden lg:block w-80">
              <div className="sticky top-4 h-[calc(100vh-8rem)] rounded-xl overflow-hidden border bg-card">
                <CartSidebar />
              </div>
            </div>
          </div>

          {/* Mobile Cart Floating Button */}
          <div className="lg:hidden fixed bottom-6 right-6 z-50">
            <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
              <SheetTrigger asChild>
                <Button size="lg" className="h-16 w-16 rounded-full bg-pink-soft hover:bg-pink-medium shadow-lg relative">
                  <ShoppingCart className="w-6 h-6" />
                  {cartItemCount > 0 && <Badge className="absolute -top-1 -right-1 bg-primary hover:bg-primary text-primary-foreground h-6 min-w-6 p-0 flex items-center justify-center rounded-full text-xs font-bold">
                      {cartItemCount}
                    </Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 p-0">
                <CartSidebar isMobile />
              </SheetContent>
            </Sheet>
          </div>
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Order History
              </h3>
              <span className="text-sm text-muted-foreground">{orderHistory.length} orders</span>
            </div>
            
            {loadingHistory ? <div className="text-center py-12 text-muted-foreground">
                <p>Loading order history...</p>
              </div> : orderHistory.length === 0 ? <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No orders yet</p>
                <p className="text-sm">Orders will appear here after checkout</p>
              </div> : <ScrollArea className="h-[calc(100vh-20rem)]">
                <div className="space-y-3 pr-4">
                  {orderHistory.map((order, index) => <motion.div key={order.order_id} initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: index * 0.03
              }} className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Order #{orderHistory.length - index}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'h:mm a')}
                          </span>
                        </div>
                        <span className="font-bold text-lime-500">${order.total.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {order.items.map((item, itemIndex) => <div key={itemIndex} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{item.quantity}×</span>
                              <span className="truncate">{item.name}</span>
                            </div>
                            <span className="text-muted-foreground">${item.total_price.toFixed(2)}</span>
                          </div>)}
                      </div>
                    </motion.div>)}
                </div>
              </ScrollArea>}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4 mt-4">
          {/* Event Totals - High Contrast Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-primary/30 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-primary" />
                Event Totals
              </h3>
              <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{currentDay} day{currentDay !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-2xl font-bold text-green-600">${(allDaysRevenue + totalRevenue).toFixed(0)}</p>
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Revenue</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{allDaysItemsSold + totalItemsSold}</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Items Sold</p>
              </div>
              <div className="text-center p-3 bg-pink-soft/20 rounded-lg">
                <p className="text-2xl font-bold text-pink-accent">{orderCount}</p>
                <p className="text-xs text-pink-accent font-medium">Orders</p>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">${avgOrderSize.toFixed(2)}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Avg Order $</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{itemsPerOrder.toFixed(1)}</p>
                <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Items/Order</p>
              </div>
            </div>
          </div>

          {/* Revenue Chart - Line Graph */}
          {(daySummaries.length > 0 || currentDay > 0) && <div className="bg-card rounded-xl border p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Revenue by Day
              </h4>
              <div className="relative h-32">
                {(() => {
              const allDays = [...daySummaries.map(d => ({
                day: d.day_number,
                revenue: d.revenue,
                items: d.items_sold,
                current: false
              })), ...(currentDay > 0 ? [{
                day: currentDay,
                revenue: totalRevenue,
                items: totalItemsSold,
                current: true
              }] : [])].sort((a, b) => a.day - b.day);
              const maxRevenue = Math.max(...allDays.map(d => d.revenue), 1);
              const minRevenue = Math.min(...allDays.map(d => d.revenue));
              const range = maxRevenue - minRevenue || 1;

              // Calculate points for the line
              const points = allDays.map((d, i) => {
                const x = allDays.length === 1 ? 50 : i / (allDays.length - 1) * 100;
                const y = 100 - (d.revenue - minRevenue) / range * 80 - 10;
                return {
                  x,
                  y,
                  ...d
                };
              });

              // Create SVG path
              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaPath = `${linePath} L ${points[points.length - 1].x} 95 L ${points[0].x} 95 Z`;
              return <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.3" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.3" />
                      <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.3" />
                      
                      {/* Area fill */}
                      <path d={areaPath} fill="url(#greenGradient)" opacity="0.3" />
                      
                      {/* Line */}
                      <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Points */}
                      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={p.current ? '#22c55e' : '#4ade80'} stroke="white" strokeWidth="0.5" />)}
                      
                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>;
            })()}
                
                {/* Labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                  {(() => {
                const allDays = [...daySummaries.map(d => ({
                  day: d.day_number,
                  revenue: d.revenue,
                  items: d.items_sold,
                  current: false
                })), ...(currentDay > 0 ? [{
                  day: currentDay,
                  revenue: totalRevenue,
                  items: totalItemsSold,
                  current: true
                }] : [])].sort((a, b) => a.day - b.day);
                return allDays.map((d, i) => <div key={i} className="text-center group relative">
                        <span className={`text-[10px] ${d.current ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>D{d.day}</span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border rounded-md px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-md">
                          <p className="font-medium text-green-600">${d.revenue.toFixed(2)}</p>
                          <p className="text-muted-foreground">{d.items} items</p>
                        </div>
                      </div>);
              })()}
                </div>
              </div>
            </div>}

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
                  <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{
                  width: `${Math.min(totalRevenue / Math.max(allDaysRevenue + totalRevenue, 1) * 100, 100)}%`
                }} />
                </div>
              </div>
            </div>

            {/* Previous Days - Compact */}
            {daySummaries.slice().reverse().map(day => {
            const dayDuration = day.close_time ? Math.round((new Date(day.close_time).getTime() - new Date(day.open_time).getTime()) / (1000 * 60 * 60)) : 0;
            const revenuePercent = Math.min(day.revenue / Math.max(allDaysRevenue + totalRevenue, 1) * 100, 100);
            return <div key={day.id} className="bg-card rounded-lg border p-3 flex items-center gap-3">
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
                      <div className="bg-primary/60 h-1.5 rounded-full transition-all" style={{
                    width: `${revenuePercent}%`
                  }} />
                    </div>
                  </div>
                </div>;
          })}
          </div>

          {/* Top Sellers - Horizontal Bar Chart */}
          {items.length > 0 && <div className="bg-card rounded-xl border p-4">
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Top Sellers
              </h4>
              {items.filter(item => item.quantity_sold > 0).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No sales yet</p> : <div className="space-y-3">
                  {items.filter(item => item.quantity_sold > 0).sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, 8).map((item, index) => {
              const maxSold = Math.max(...items.map(i => i.quantity_sold), 1);
              const percent = item.quantity_sold / maxSold * 100;
              const CategoryIcon = getCategoryIcon(item.category);

              // Color gradient from most to least popular
              const colors = ['bg-pink-soft', 'bg-pink-soft/90', 'bg-pink-soft/80', 'bg-pink-soft/70', 'bg-pink-soft/60', 'bg-pink-soft/50', 'bg-pink-soft/40', 'bg-pink-soft/30'];
              const barColor = colors[index] || colors[colors.length - 1];
              return <div key={item.id} className="group">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                              <CategoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
                            <span className="text-sm font-bold text-primary">{item.quantity_sold}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-6 flex-shrink-0" /> {/* Spacer for alignment */}
                            <div className="flex-1 bg-secondary/50 rounded-full h-4 overflow-hidden">
                              <motion.div initial={{
                      width: 0
                    }} animate={{
                      width: `${percent}%`
                    }} transition={{
                      duration: 0.5,
                      delay: index * 0.05,
                      ease: "easeOut"
                    }} className={`${barColor} h-full rounded-full flex items-center justify-end pr-2`}>
                                {percent > 25 && <span className="text-[10px] font-medium text-white/90">
                                    ${(item.price * item.quantity_sold).toFixed(0)}
                                  </span>}
                              </motion.div>
                            </div>
                          </div>
                        </div>;
            })}
                </div>}
            </div>}
        </TabsContent>
      </Tabs>

      {/* Manual Sale Dialog */}
      <Dialog open={!!manualSaleItem} onOpenChange={() => setManualSaleItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Cart: {manualSaleItem?.name}</DialogTitle>
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
            <Button onClick={() => {
            if (manualSaleItem) {
              for (let i = 0; i < manualQuantity; i++) {
                addToCart(manualSaleItem);
              }
            }
            setManualSaleItem(null);
            setManualQuantity(1);
          }} className="bg-pink-soft hover:bg-pink-medium">
              Add to Cart
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
              <p><strong>Total Orders:</strong> {orderCount}</p>
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