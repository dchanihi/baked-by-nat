import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Trash2, Link, Package, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CurrencyInput } from './CurrencyInput';
import { LocationAutocomplete } from './LocationAutocomplete';
import { NumericInput } from './NumericInput';
import { getIconComponent } from '@/lib/categoryIcons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;
type Category = Tables<'categories'> & { icon?: string | null };

interface EventItem {
  id?: string;
  bake_id: string | null;
  name: string;
  cogs: number;
  price: number;
  starting_quantity: number;
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
  notes: string | null;
}

interface EventEditorProps {
  event: Event | null;
  onSave: () => void;
  onCancel: () => void;
}

export const EventEditor = ({ event, onSave, onCancel }: EventEditorProps) => {
  const [name, setName] = useState(event?.name || '');
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');
  const [startTime, setStartTime] = useState(
    event?.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : ''
  );
  const [endTime, setEndTime] = useState(
    event?.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : ''
  );
  const [notes, setNotes] = useState(event?.notes || '');
  const [items, setItems] = useState<EventItem[]>([]);
  const [bakes, setBakes] = useState<Bake[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [showBakeSelector, setShowBakeSelector] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // Refs for cell navigation - columns: 0=COGS, 1=Price, 2=Qty
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  
  const getCellKey = (row: number, col: number) => `${row}-${col}`;
  
  const focusCell = useCallback((row: number, col: number) => {
    const key = getCellKey(row, col);
    const cell = cellRefs.current.get(key);
    if (cell) {
      const focusable = cell.querySelector('[tabindex="0"]') as HTMLElement;
      focusable?.focus();
      setActiveCell({ row, col });
    }
  }, []);
  
  const handleCellNavigate = useCallback((row: number, col: number, direction: 'up' | 'down' | 'left' | 'right') => {
    let newRow = row;
    let newCol = col;
    
    switch (direction) {
      case 'up':
        newRow = Math.max(0, row - 1);
        break;
      case 'down':
        newRow = Math.min(items.length - 1, row + 1);
        break;
      case 'left':
        if (col > 0) {
          newCol = col - 1;
        }
        break;
      case 'right':
        if (col < 2) {
          newCol = col + 1;
        }
        break;
    }
    
    setTimeout(() => focusCell(newRow, newCol), 0);
  }, [items.length, focusCell]);

  // Handle paste from Excel - tab-separated columns, newline-separated rows
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!activeCell) return;
    
    const pastedData = e.clipboardData.getData('text');
    if (!pastedData) return;
    
    // Parse Excel data (tab-separated columns, newline-separated rows)
    const rows = pastedData.split(/\r?\n/).filter(row => row.trim());
    if (rows.length === 0) return;
    
    e.preventDefault();
    
    const updated = [...items];
    const colFields: (keyof EventItem)[] = ['cogs', 'price', 'starting_quantity'];
    
    rows.forEach((row, rowOffset) => {
      const targetRow = activeCell.row + rowOffset;
      if (targetRow >= updated.length) return;
      
      const cells = row.split('\t');
      cells.forEach((cellValue, colOffset) => {
        const targetCol = activeCell.col + colOffset;
        if (targetCol > 2) return;
        
        const field = colFields[targetCol];
        // Parse the value - remove currency symbols and commas
        const cleanValue = cellValue.replace(/[$,]/g, '').trim();
        const numValue = parseFloat(cleanValue);
        
        if (!isNaN(numValue)) {
          if (field === 'starting_quantity') {
            updated[targetRow] = { ...updated[targetRow], [field]: Math.round(numValue) };
          } else {
            updated[targetRow] = { ...updated[targetRow], [field]: numValue };
          }
        }
      });
    });
    
    setItems(updated);
    toast({
      title: 'Pasted',
      description: `Updated ${Math.min(rows.length, items.length - activeCell.row)} row(s)`,
    });
  }, [activeCell, items]);

  const handleCellFocus = useCallback((row: number, col: number) => {
    setActiveCell({ row, col });
  }, []);

  useEffect(() => {
    loadBakes();
    loadCategories();
    if (event) {
      loadEventItems();
    }
  }, [event]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    setCategories(data || []);
  };

  const loadBakes = async () => {
    const { data } = await supabase
      .from('bakes')
      .select('*')
      .eq('status', 'published')
      .order('title');
    setBakes(data || []);
  };

  const loadEventItems = async () => {
    if (!event) return;
    const { data } = await supabase
      .from('event_items')
      .select('*')
      .eq('event_id', event.id);
    if (data) {
      setItems(data.map(item => ({
        id: item.id,
        bake_id: item.bake_id,
        name: item.name,
        cogs: Number(item.cogs),
        price: Number(item.price),
        starting_quantity: item.starting_quantity,
        category: (item as any).category || null,
      })));
    }
  };

  const addItem = () => {
    setItems([...items, {
      bake_id: null,
      name: '',
      cogs: 0,
      price: 0,
      starting_quantity: 0,
      category: null,
    }]);
  };

  const addFromBake = (bake: Bake) => {
    setItems([...items, {
      bake_id: bake.id,
      name: bake.title,
      cogs: 0,
      price: 0,
      starting_quantity: 0,
      category: bake.category || null,
    }]);
    setShowBakeSelector(false);
  };

  const updateItem = (index: number, field: keyof EventItem, value: string | number | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !startTime) {
      toast({
        title: 'Error',
        description: 'Please fill in event name and start time.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      let eventId = event?.id;

      if (event) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update({
            name,
            description: description || null,
            location: location || null,
            start_time: new Date(startTime).toISOString(),
            end_time: endTime ? new Date(endTime).toISOString() : null,
            notes: notes || null,
          })
          .eq('id', event.id);

        if (error) throw error;
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('events')
          .insert({
            name,
            description: description || null,
            location: location || null,
            start_time: new Date(startTime).toISOString(),
            end_time: endTime ? new Date(endTime).toISOString() : null,
            notes: notes || null,
            status: 'draft',
          })
          .select()
          .single();

        if (error) throw error;
        eventId = data.id;
      }

      // Handle items - delete existing and insert new
      if (event) {
        await supabase
          .from('event_items')
          .delete()
          .eq('event_id', event.id);
      }

      if (items.length > 0 && eventId) {
        const { error: itemsError } = await supabase
          .from('event_items')
          .insert(
            items.map(item => ({
              event_id: eventId,
              bake_id: item.bake_id,
              name: item.name,
              cogs: item.cogs,
              price: item.price,
              starting_quantity: item.starting_quantity,
              category: item.category,
            }))
          );

        if (itemsError) throw itemsError;
      }

      toast({
        title: 'Success',
        description: `Event ${event ? 'updated' : 'created'} successfully.`,
      });
      onSave();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save event.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-semibold text-foreground">
          {event ? 'edit event' : 'new event'}
        </h2>
      </div>

      <div className="bg-card rounded-lg p-6 space-y-6">
        {/* Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Farmer's Market Pop-up"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              placeholder="Search for an address..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time *</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Event details..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes for this event..."
            rows={2}
          />
        </div>

        {/* Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-medium">Inventory Items</Label>
            <div className="flex gap-2">
              <Dialog open={showBakeSelector} onOpenChange={setShowBakeSelector}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Link className="w-4 h-4 mr-2" />
                    From Catalog
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select from Bakes Catalog</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {bakes.map((bake) => (
                      <button
                        key={bake.id}
                        onClick={() => addFromBake(bake)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <span className="font-medium">{bake.title}</span>
                      </button>
                    ))}
                    {bakes.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No published bakes available
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Custom
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && items.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={() => setCategoryFilter(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  categoryFilter === null
                    ? 'bg-pink-soft text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                All ({items.length})
              </button>
              <button
                onClick={() => setCategoryFilter('uncategorized')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  categoryFilter === 'uncategorized'
                    ? 'bg-pink-soft text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                <Package className="w-3 h-3" />
                Uncategorized ({items.filter(i => !i.category).length})
              </button>
              {categories.map((cat) => {
                const Icon = getIconComponent(cat.icon);
                const count = items.filter(i => i.category === cat.name).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.name)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      categoryFilter === cat.name
                        ? 'bg-pink-soft text-white'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_140px_100px_100px_80px_48px] bg-muted/50 border-b">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Item Name</div>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Category</div>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">COGS ($)</div>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">Price ($)</div>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground text-center">Qty</div>
              <div className="px-3 py-2"></div>
            </div>

            {/* Table Body */}
            {items.length === 0 ? (
              <div className="px-3 py-8 text-muted-foreground text-center text-sm">
                No items added yet. Add items from your catalog or create custom items.
              </div>
            ) : (
              <div className="divide-y" onPaste={handlePaste}>
                <AnimatePresence mode="popLayout">
                  {items
                    .map((item, index) => ({ item, originalIndex: index }))
                    .filter(({ item }) => {
                      if (categoryFilter === null) return true;
                      if (categoryFilter === 'uncategorized') return !item.category;
                      return item.category === categoryFilter;
                    })
                    .map(({ item, originalIndex }) => (
                    <motion.div
                      key={item.id || `new-${originalIndex}`}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="grid grid-cols-[1fr_140px_100px_100px_80px_48px] items-center bg-card"
                    >
                      <div className="px-2 py-1.5">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(originalIndex, 'name', e.target.value)}
                          placeholder="Item name"
                          className="h-8 border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0"
                        />
                      </div>
                      <div className="px-2 py-1.5">
                        <Select
                          value={item.category || 'none'}
                          onValueChange={(val) => updateItem(originalIndex, 'category', val === 'none' ? null : val)}
                        >
                          <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-1 focus:ring-offset-0">
                            <SelectValue placeholder="Select">
                              {item.category ? (
                                <span className="flex items-center gap-1.5">
                                  {(() => {
                                    const cat = categories.find(c => c.name === item.category);
                                    const Icon = getIconComponent(cat?.icon);
                                    return <Icon className="w-3.5 h-3.5" />;
                                  })()}
                                  <span className="truncate">{item.category}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">No category</span>
                            </SelectItem>
                            {categories.map((cat) => {
                              const Icon = getIconComponent(cat.icon);
                              return (
                                <SelectItem key={cat.id} value={cat.name}>
                                  <span className="flex items-center gap-2">
                                    <Icon className="w-4 h-4" />
                                    {cat.name}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div 
                        className="px-2 py-1.5"
                        ref={(el) => {
                          if (el) cellRefs.current.set(getCellKey(originalIndex, 0), el);
                        }}
                      >
                        <CurrencyInput
                          value={item.cogs}
                          onChange={(val) => updateItem(originalIndex, 'cogs', val)}
                          onNavigate={(dir) => handleCellNavigate(originalIndex, 0, dir)}
                          onEnter={() => handleCellNavigate(originalIndex, 0, 'down')}
                          onFocus={() => handleCellFocus(originalIndex, 0)}
                        />
                      </div>
                      <div 
                        className="px-2 py-1.5"
                        ref={(el) => {
                          if (el) cellRefs.current.set(getCellKey(originalIndex, 1), el);
                        }}
                      >
                        <CurrencyInput
                          value={item.price}
                          onChange={(val) => updateItem(originalIndex, 'price', val)}
                          onNavigate={(dir) => handleCellNavigate(originalIndex, 1, dir)}
                          onEnter={() => handleCellNavigate(originalIndex, 1, 'down')}
                          onFocus={() => handleCellFocus(originalIndex, 1)}
                        />
                      </div>
                      <div 
                        className="px-2 py-1.5"
                        ref={(el) => {
                          if (el) cellRefs.current.set(getCellKey(originalIndex, 2), el);
                        }}
                      >
                        <NumericInput
                          value={item.starting_quantity}
                          onChange={(val) => updateItem(originalIndex, 'starting_quantity', val)}
                          onNavigate={(dir) => handleCellNavigate(originalIndex, 2, dir)}
                          onEnter={() => handleCellNavigate(originalIndex, 2, 'down')}
                          onFocus={() => handleCellFocus(originalIndex, 2)}
                        />
                      </div>
                      <div className="px-2 py-1.5 flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(originalIndex)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Save Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-pink-soft hover:bg-pink-medium"
          >
            {saving ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
          </Button>
        </div>
      </div>
    </div>
  );
};
