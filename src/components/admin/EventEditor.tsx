import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Trash2, Link, Package, Filter, Calendar as CalendarIcon, Clock, Tag } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
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

type Bake = Tables<'bakes'> & { recipe_id?: string | null };
type Category = Tables<'categories'> & { icon?: string | null };

interface EventItem {
  id?: string;
  bake_id: string | null;
  name: string;
  cogs: number;
  price: number;
  starting_quantity: number;
  category: string | null;
  icon_color: string;
}

interface ScheduleDay {
  id?: string;
  day_number: number;
  date: string;
  start_time: string;
  end_time: string;
}

type ScheduleMode = 'same' | 'different';

interface EventDeal {
  id?: string;
  name: string;
  description: string;
  quantity_required: number;
  category: string | null;
  deal_price: number;
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
  const [notes, setNotes] = useState(event?.notes || '');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('same');
  const [commonStartTime, setCommonStartTime] = useState('09:00');
  const [commonEndTime, setCommonEndTime] = useState('17:00');
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([
    { day_number: 1, date: '', start_time: '09:00', end_time: '17:00' }
  ]);
  
  // Drag-select state for calendar
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [dragEndDate, setDragEndDate] = useState<Date | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [deals, setDeals] = useState<EventDeal[]>([]);
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
      loadScheduleDays();
      loadEventDeals();
    }
  }, [event]);

  const loadEventDeals = async () => {
    if (!event) return;
    const { data } = await supabase
      .from('event_deals')
      .select('*')
      .eq('event_id', event.id);
    if (data) {
      setDeals(data.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description || '',
        quantity_required: d.quantity_required,
        category: d.category,
        deal_price: Number(d.deal_price),
      })));
    }
  };

  const loadScheduleDays = async () => {
    if (!event) return;
    const { data } = await supabase
      .from('event_schedules')
      .select('*')
      .eq('event_id', event.id)
      .order('day_number');
    
    if (data && data.length > 0) {
      const loadedDays = data.map(d => ({
        id: d.id,
        day_number: d.day_number,
        date: d.date,
        start_time: d.start_time,
        end_time: d.end_time || '',
      }));
      setScheduleDays(loadedDays);
      
      // Determine schedule mode based on loaded data
      const allSameTime = loadedDays.every(
        d => d.start_time === loadedDays[0].start_time && d.end_time === loadedDays[0].end_time
      );
      if (allSameTime && loadedDays.length > 0) {
        setScheduleMode('same');
        setCommonStartTime(loadedDays[0].start_time);
        setCommonEndTime(loadedDays[0].end_time);
      } else {
        setScheduleMode('different');
      }
    } else if (event.start_time) {
      // Fallback to legacy single start/end time
      const startDate = new Date(event.start_time);
      const startTime = startDate.toTimeString().slice(0, 5);
      const endTime = event.end_time ? new Date(event.end_time).toTimeString().slice(0, 5) : '';
      setScheduleDays([{
        day_number: 1,
        date: startDate.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
      }]);
      setCommonStartTime(startTime);
      setCommonEndTime(endTime);
    }
  };

  // When schedule mode changes to 'same', apply common times to all days
  const handleScheduleModeChange = (mode: ScheduleMode) => {
    setScheduleMode(mode);
    if (mode === 'same') {
      setScheduleDays(prev => prev.map(day => ({
        ...day,
        start_time: commonStartTime,
        end_time: commonEndTime,
      })));
    }
  };

  // When common times change, apply to all days if in 'same' mode
  const handleCommonStartTimeChange = (time: string) => {
    setCommonStartTime(time);
    if (scheduleMode === 'same') {
      setScheduleDays(prev => prev.map(day => ({
        ...day,
        start_time: time,
      })));
    }
  };

  const handleCommonEndTimeChange = (time: string) => {
    setCommonEndTime(time);
    if (scheduleMode === 'same') {
      setScheduleDays(prev => prev.map(day => ({
        ...day,
        end_time: time,
      })));
    }
  };

  const addScheduleDay = () => {
    const lastDay = scheduleDays[scheduleDays.length - 1];
    let nextDate = '';
    if (lastDay?.date) {
      const d = new Date(lastDay.date);
      d.setDate(d.getDate() + 1);
      nextDate = d.toISOString().split('T')[0];
    }
    const startTime = scheduleMode === 'same' ? commonStartTime : (lastDay?.start_time || '09:00');
    const endTime = scheduleMode === 'same' ? commonEndTime : (lastDay?.end_time || '17:00');
    setScheduleDays([...scheduleDays, {
      day_number: scheduleDays.length + 1,
      date: nextDate,
      start_time: startTime,
      end_time: endTime,
    }]);
  };

  const addMultipleDays = (count: number) => {
    const lastDay = scheduleDays[scheduleDays.length - 1];
    const newDays: ScheduleDay[] = [];
    for (let i = 0; i < count; i++) {
      let nextDate = '';
      const prevDay = i === 0 ? lastDay : newDays[i - 1];
      if (prevDay?.date) {
        const d = new Date(prevDay.date);
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().split('T')[0];
      }
      newDays.push({
        day_number: scheduleDays.length + i + 1,
        date: nextDate,
        start_time: scheduleMode === 'same' ? commonStartTime : (lastDay?.start_time || '09:00'),
        end_time: scheduleMode === 'same' ? commonEndTime : (lastDay?.end_time || '17:00'),
      });
    }
    setScheduleDays([...scheduleDays, ...newDays]);
  };

  const removeScheduleDay = (index: number) => {
    if (scheduleDays.length <= 1) return;
    const updated = scheduleDays.filter((_, i) => i !== index).map((d, i) => ({
      ...d,
      day_number: i + 1,
    }));
    setScheduleDays(updated);
  };

  const updateScheduleDay = (index: number, field: keyof ScheduleDay, value: string | number) => {
    const updated = [...scheduleDays];
    updated[index] = { ...updated[index], [field]: value };
    setScheduleDays(updated);
  };

  // Drag-select handlers for calendar
  const handleDayMouseDown = useCallback((date: Date, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartDate(date);
    setDragEndDate(date);
  }, []);

  const handleDayMouseEnter = useCallback((date: Date) => {
    if (isDragging && dragStartDate) {
      setDragEndDate(date);
    }
  }, [isDragging, dragStartDate]);

  const handleDragEnd = useCallback(() => {
    if (isDragging && dragStartDate && dragEndDate) {
      const startTime = dragStartDate.getTime();
      const endTime = dragEndDate.getTime();
      const minDate = new Date(Math.min(startTime, endTime));
      const maxDate = new Date(Math.max(startTime, endTime));
      
      // Generate all dates in the range
      const newDates: Date[] = [];
      const current = new Date(minDate);
      while (current <= maxDate) {
        newDates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      
      // Merge with existing dates
      const existingDateStrings = new Set(scheduleDays.map(d => d.date).filter(Boolean));
      const allDates = [...newDates];
      scheduleDays.forEach(d => {
        if (d.date && !newDates.some(nd => format(nd, 'yyyy-MM-dd') === d.date)) {
          allDates.push(new Date(d.date + 'T00:00:00'));
        }
      });
      
      const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
      const newScheduleDays: ScheduleDay[] = sortedDates.map((date, index) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const existingDay = scheduleDays.find(d => d.date === dateStr);
        return {
          id: existingDay?.id,
          day_number: index + 1,
          date: dateStr,
          start_time: existingDay?.start_time || (scheduleMode === 'same' ? commonStartTime : '09:00'),
          end_time: existingDay?.end_time || (scheduleMode === 'same' ? commonEndTime : '17:00'),
        };
      });
      
      setScheduleDays(newScheduleDays.length > 0 ? newScheduleDays : [{ day_number: 1, date: '', start_time: commonStartTime, end_time: commonEndTime }]);
    }
    setIsDragging(false);
    setDragStartDate(null);
    setDragEndDate(null);
  }, [isDragging, dragStartDate, dragEndDate, scheduleDays, scheduleMode, commonStartTime, commonEndTime]);

  // Global mouse up listener for drag-select
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging, handleDragEnd]);

  // Calculate dates in drag range for highlighting
  const getDragRangeDates = useCallback((): Set<string> => {
    if (!isDragging || !dragStartDate || !dragEndDate) return new Set();
    const startTime = dragStartDate.getTime();
    const endTime = dragEndDate.getTime();
    const minDate = new Date(Math.min(startTime, endTime));
    const maxDate = new Date(Math.max(startTime, endTime));
    
    const dates = new Set<string>();
    const current = new Date(minDate);
    while (current <= maxDate) {
      dates.add(format(current, 'yyyy-MM-dd'));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [isDragging, dragStartDate, dragEndDate]);

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
        icon_color: (item as any).icon_color || '#F5B8C9',
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
      icon_color: '#F5B8C9',
    }]);
  };

  const addFromBake = async (bake: Bake) => {
    let cogs = 0;
    
    // If bake has a linked recipe, calculate COGS from it
    if (bake.recipe_id) {
      cogs = await calculateRecipeCogs(bake.recipe_id);
    }
    
    setItems([...items, {
      bake_id: bake.id,
      name: bake.title,
      cogs,
      price: 0,
      starting_quantity: 0,
      category: bake.category || null,
      icon_color: '#F5B8C9',
    }]);
    setShowBakeSelector(false);
  };

  const calculateRecipeCogs = async (recipeId: string): Promise<number> => {
    // Get recipe ingredients
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('quantity, inventory_item_id')
      .eq('recipe_id', recipeId);

    if (!ingredients || ingredients.length === 0) return 0;

    // Get inventory items with costs
    const itemIds = ingredients.map(i => i.inventory_item_id);
    const { data: items } = await supabase
      .from('inventory')
      .select('id, cost_per_unit')
      .in('id', itemIds);

    if (!items) return 0;

    // Calculate total cost
    const totalCost = ingredients.reduce((sum, ing) => {
      const item = items.find(i => i.id === ing.inventory_item_id);
      if (!item || !item.cost_per_unit) return sum;
      return sum + Number(ing.quantity) * Number(item.cost_per_unit);
    }, 0);

    // Get yield quantity for cost per unit
    const { data: recipe } = await supabase
      .from('recipes')
      .select('yield_quantity')
      .eq('id', recipeId)
      .single();

    const yieldQty = recipe?.yield_quantity || 1;
    return totalCost / yieldQty;
  };

  const updateItem = (index: number, field: keyof EventItem, value: string | number | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Deal management functions
  const addDeal = () => {
    setDeals([...deals, {
      name: '',
      description: '',
      quantity_required: 0,
      category: null,
      deal_price: 0,
    }]);
  };

  const updateDeal = (index: number, field: keyof EventDeal, value: string | number | null) => {
    const updated = [...deals];
    updated[index] = { ...updated[index], [field]: value };
    setDeals(updated);
  };

  const removeDeal = (index: number) => {
    setDeals(deals.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || scheduleDays.length === 0 || !scheduleDays[0].date) {
      toast({
        title: 'Error',
        description: 'Please fill in event name and at least one schedule day.',
        variant: 'destructive',
      });
      return;
    }

    // Calculate overall start and end times from schedule
    const sortedDays = [...scheduleDays].sort((a, b) => a.date.localeCompare(b.date));
    const firstDay = sortedDays[0];
    const lastDay = sortedDays[sortedDays.length - 1];
    const overallStartTime = new Date(`${firstDay.date}T${firstDay.start_time}`).toISOString();
    const overallEndTime = lastDay.end_time 
      ? new Date(`${lastDay.date}T${lastDay.end_time}`).toISOString()
      : null;

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
            start_time: overallStartTime,
            end_time: overallEndTime,
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
            start_time: overallStartTime,
            end_time: overallEndTime,
            notes: notes || null,
            status: 'draft',
          })
          .select()
          .single();

        if (error) throw error;
        eventId = data.id;
      }

      // Handle items - upsert to preserve quantity_sold and other runtime data
      if (eventId) {
        // Get existing items to find which ones to delete
        const { data: existingItems } = await supabase
          .from('event_items')
          .select('id')
          .eq('event_id', eventId);
        
        const existingIds = new Set(existingItems?.map(i => i.id) || []);
        const currentIds = new Set(items.filter(i => i.id).map(i => i.id));
        
        // Delete items that are no longer in the list
        const idsToDelete = [...existingIds].filter(id => !currentIds.has(id));
        if (idsToDelete.length > 0) {
          await supabase
            .from('event_items')
            .delete()
            .in('id', idsToDelete);
        }
        
        // Update existing items (only the editable fields, preserving quantity_sold)
        const itemsToUpdate = items.filter(item => item.id);
        for (const item of itemsToUpdate) {
          await supabase
            .from('event_items')
            .update({
              bake_id: item.bake_id,
              name: item.name,
              cogs: item.cogs,
              price: item.price,
              starting_quantity: item.starting_quantity,
              category: item.category,
              icon_color: item.icon_color,
            })
            .eq('id', item.id);
        }
        
        // Insert new items
        const itemsToInsert = items.filter(item => !item.id);
        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from('event_items')
            .insert(
              itemsToInsert.map(item => ({
                event_id: eventId,
                bake_id: item.bake_id,
                name: item.name,
                cogs: item.cogs,
                price: item.price,
                starting_quantity: item.starting_quantity,
                category: item.category,
                icon_color: item.icon_color,
              }))
            );

          if (itemsError) throw itemsError;
        }

        // Save schedule days
        // Delete existing schedules
        await supabase
          .from('event_schedules')
          .delete()
          .eq('event_id', eventId);
        
        // Insert new schedules
        const { error: scheduleError } = await supabase
          .from('event_schedules')
          .insert(
            scheduleDays.map((day, index) => ({
              event_id: eventId,
              day_number: index + 1,
              date: day.date,
              start_time: day.start_time,
              end_time: day.end_time || null,
            }))
          );
        
        if (scheduleError) throw scheduleError;

        // Save deals
        // Delete existing deals
        await supabase
          .from('event_deals')
          .delete()
          .eq('event_id', eventId);
        
        // Insert new deals (only non-empty ones)
        const dealsToInsert = deals.filter(d => d.name.trim());
        if (dealsToInsert.length > 0) {
          const { error: dealsError } = await supabase
            .from('event_deals')
            .insert(
              dealsToInsert.map(deal => ({
                event_id: eventId,
                name: deal.name,
                description: deal.description || null,
                quantity_required: deal.quantity_required,
                category: deal.category,
                deal_price: deal.deal_price,
              }))
            );
          
          if (dealsError) throw dealsError;
        }
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

        {/* Schedule Days - Calendar Layout */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Schedule *
            </Label>
            <span className="text-sm text-muted-foreground">
              {scheduleDays.length} day{scheduleDays.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          {/* Schedule Mode Selector */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleScheduleModeChange('same')}
              className="flex items-center gap-2 text-sm"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                scheduleMode === 'same'
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50'
              }`}>
                {scheduleMode === 'same' && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={scheduleMode === 'same' ? 'text-foreground' : 'text-muted-foreground'}>Same times each day</span>
            </button>
            <button
              type="button"
              onClick={() => handleScheduleModeChange('different')}
              className="flex items-center gap-2 text-sm"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                scheduleMode === 'different'
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50'
              }`}>
                {scheduleMode === 'different' && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={scheduleMode === 'different' ? 'text-foreground' : 'text-muted-foreground'}>Different times per day</span>
            </button>
          </div>

          {/* Common time inputs for 'same' mode */}
          {scheduleMode === 'same' && (
            <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Daily hours:</span>
              <Input
                type="time"
                value={commonStartTime}
                onChange={(e) => handleCommonStartTimeChange(e.target.value)}
                className="h-9 w-28"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="time"
                value={commonEndTime}
                onChange={(e) => handleCommonEndTimeChange(e.target.value)}
                className="h-9 w-28"
              />
            </div>
          )}

          {/* Calendar + Day Details Split View */}
          <div className="grid grid-cols-[auto_1fr] gap-4 border rounded-lg bg-muted/10">
            {/* Left: Calendar with drag-select */}
            <div className="border-r p-2 select-none">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-muted-foreground">Select dates</span>
                {scheduleDays.some(d => d.date) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScheduleDays([{ day_number: 1, date: '', start_time: commonStartTime, end_time: commonEndTime }])}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <Calendar
                mode="multiple"
                selected={scheduleDays.map(d => d.date ? new Date(d.date + 'T00:00:00') : undefined).filter(Boolean) as Date[]}
                onSelect={(dates) => {
                  // Only handle clicks when not dragging
                  if (isDragging) return;
                  if (!dates) {
                    setScheduleDays([{ day_number: 1, date: '', start_time: commonStartTime, end_time: commonEndTime }]);
                    return;
                  }
                  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
                  const newScheduleDays: ScheduleDay[] = sortedDates.map((date, index) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const existingDay = scheduleDays.find(d => d.date === dateStr);
                    return {
                      id: existingDay?.id,
                      day_number: index + 1,
                      date: dateStr,
                      start_time: existingDay?.start_time || (scheduleMode === 'same' ? commonStartTime : '09:00'),
                      end_time: existingDay?.end_time || (scheduleMode === 'same' ? commonEndTime : '17:00'),
                    };
                  });
                  if (newScheduleDays.length === 0) {
                    setScheduleDays([{ day_number: 1, date: '', start_time: commonStartTime, end_time: commonEndTime }]);
                  } else {
                    setScheduleDays(newScheduleDays);
                  }
                }}
                className="pointer-events-auto"
                modifiers={{
                  dragging: (date) => getDragRangeDates().has(format(date, 'yyyy-MM-dd')),
                }}
                modifiersClassNames={{
                  dragging: 'bg-primary/30 text-primary-foreground',
                }}
                components={{
                  Day: ({ date, ...props }) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isSelected = scheduleDays.some(d => d.date === dateStr);
                    const isInDragRange = getDragRangeDates().has(dateStr);
                    
                    // Check if adjacent dates are selected for connected styling
                    const prevDate = new Date(date);
                    prevDate.setDate(prevDate.getDate() - 1);
                    const nextDate = new Date(date);
                    nextDate.setDate(nextDate.getDate() + 1);
                    const prevDateStr = format(prevDate, 'yyyy-MM-dd');
                    const nextDateStr = format(nextDate, 'yyyy-MM-dd');
                    const hasPrevSelected = scheduleDays.some(d => d.date === prevDateStr);
                    const hasNextSelected = scheduleDays.some(d => d.date === nextDateStr);
                    
                    // Determine position in range for styling
                    const isRangeStart = isSelected && !hasPrevSelected && hasNextSelected;
                    const isRangeEnd = isSelected && hasPrevSelected && !hasNextSelected;
                    const isRangeMiddle = isSelected && hasPrevSelected && hasNextSelected;
                    const isSingle = isSelected && !hasPrevSelected && !hasNextSelected;
                    
                    const handleClick = (e: React.MouseEvent) => {
                      e.preventDefault();
                      if (isSelected) {
                        // Deselect the date
                        const updated = scheduleDays.filter(d => d.date !== dateStr).map((d, i) => ({
                          ...d,
                          day_number: i + 1,
                        }));
                        if (updated.length === 0) {
                          setScheduleDays([{ day_number: 1, date: '', start_time: commonStartTime, end_time: commonEndTime }]);
                        } else {
                          setScheduleDays(updated);
                        }
                      } else {
                        // Select the date
                        const newDay: ScheduleDay = {
                          day_number: scheduleDays.length + 1,
                          date: dateStr,
                          start_time: scheduleMode === 'same' ? commonStartTime : '09:00',
                          end_time: scheduleMode === 'same' ? commonEndTime : '17:00',
                        };
                        const allDays = [...scheduleDays.filter(d => d.date), newDay];
                        const sorted = allDays.sort((a, b) => a.date.localeCompare(b.date)).map((d, i) => ({
                          ...d,
                          day_number: i + 1,
                        }));
                        setScheduleDays(sorted);
                      }
                    };
                    
                    // Build rounded corners based on position
                    let roundedClasses = 'rounded-md';
                    if (isRangeStart) roundedClasses = 'rounded-l-md rounded-r-none';
                    else if (isRangeEnd) roundedClasses = 'rounded-r-md rounded-l-none';
                    else if (isRangeMiddle) roundedClasses = 'rounded-none';
                    else if (isSingle) roundedClasses = 'rounded-md';
                    
                    return (
                      <button
                        {...props}
                        type="button"
                        onClick={handleClick}
                        onMouseDown={(e) => {
                          // Only start drag if not clicking to toggle
                          if (!isSelected) {
                            handleDayMouseDown(date, e);
                          }
                        }}
                        onMouseEnter={() => handleDayMouseEnter(date)}
                        className={`h-9 w-9 p-0 font-normal transition-colors cursor-pointer
                          ${roundedClasses}
                          ${isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/80' : ''}
                          ${isInDragRange && !isSelected ? 'bg-primary/40 text-foreground rounded-md' : ''}
                          ${!isSelected && !isInDragRange ? 'hover:bg-accent hover:text-accent-foreground rounded-md' : ''}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  },
                }}
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Click or drag to select dates
              </p>
            </div>

            {/* Right: Day Details - Scrollable */}
            <div className="py-3 pr-3">
              <ScrollArea className="h-[280px]">
                <div className="space-y-2 pr-2">
                  {scheduleDays.filter(d => d.date).length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
                      Click or drag on the calendar to select event days
                    </div>
                  ) : (
                    scheduleDays.filter(d => d.date).sort((a, b) => a.date.localeCompare(b.date)).map((day, index) => (
                      <div 
                        key={day.date} 
                        className="bg-background rounded-lg p-3 border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Day {index + 1}
                            </span>
                            <span className="font-medium text-sm">
                              {format(new Date(day.date + 'T00:00:00'), 'EEE, MMM d, yyyy')}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = scheduleDays.filter(d => d.date !== day.date).map((d, i) => ({
                                ...d,
                                day_number: i + 1,
                              }));
                              if (updated.length === 0) {
                                setScheduleDays([{ day_number: 1, date: '', start_time: commonStartTime, end_time: commonEndTime }]);
                              } else {
                                setScheduleDays(updated);
                              }
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            type="button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {scheduleMode === 'different' && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              type="time"
                              value={day.start_time}
                              onChange={(e) => {
                                const idx = scheduleDays.findIndex(d => d.date === day.date);
                                if (idx !== -1) updateScheduleDay(idx, 'start_time', e.target.value);
                              }}
                              className="h-8 w-24 text-sm"
                            />
                            <span className="text-muted-foreground text-xs">to</span>
                            <Input
                              type="time"
                              value={day.end_time}
                              onChange={(e) => {
                                const idx = scheduleDays.findIndex(d => d.date === day.date);
                                if (idx !== -1) updateScheduleDay(idx, 'end_time', e.target.value);
                              }}
                              className="h-8 w-24 text-sm"
                            />
                          </div>
                        )}
                        {scheduleMode === 'same' && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{commonStartTime} - {commonEndTime}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
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

        {/* Deals Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-medium flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Deals & Bundles
            </Label>
            <Button variant="outline" size="sm" onClick={addDeal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Button>
          </div>
          
          {deals.length === 0 ? (
            <div className="border rounded-lg p-6 text-center text-muted-foreground bg-muted/10">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No deals configured for this event.</p>
              <p className="text-xs mt-1">Add deals like "2 cookies for $5" to offer bundle pricing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {deals.map((deal, index) => (
                  <motion.div
                    key={deal.id || `new-deal-${index}`}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="border rounded-lg p-4 bg-card space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Deal Name</Label>
                          <Input
                            value={deal.name}
                            onChange={(e) => updateDeal(index, 'name', e.target.value)}
                            placeholder="e.g., Cookie Bundle"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Description (shown to customers)</Label>
                          <Input
                            value={deal.description}
                            onChange={(e) => updateDeal(index, 'description', e.target.value)}
                            placeholder="e.g., Buy 2 cookies for $5!"
                            className="h-9"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDeal(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Quantity Required</Label>
                        <Input
                          type="number"
                          min={0}
                          value={deal.quantity_required === 0 ? '' : deal.quantity_required}
                          onChange={(e) => updateDeal(index, 'quantity_required', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                          className="h-9"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Applies to Category</Label>
                        <Select
                          value={deal.category || 'all'}
                          onValueChange={(val) => updateDeal(index, 'category', val === 'all' ? null : val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
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
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Bundle Price ($)</Label>
                        <CurrencyInput
                          value={deal.deal_price}
                          onChange={(val) => updateDeal(index, 'deal_price', val)}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
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
                Add Item
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
            <div className="grid grid-cols-[1fr_140px_48px_100px_100px_80px_48px] bg-muted/50 border-b">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Item Name</div>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Category</div>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground text-center">Color</div>
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
                      className="grid grid-cols-[1fr_140px_48px_100px_100px_80px_48px] items-center bg-card"
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
                      <div className="px-2 py-1.5 flex justify-center">
                        <div className="relative">
                          <input
                            type="color"
                            value={item.icon_color}
                            onChange={(e) => updateItem(originalIndex, 'icon_color', e.target.value)}
                            className="sr-only"
                            id={`color-picker-${item.id || originalIndex}`}
                          />
                          <label
                            htmlFor={`color-picker-${item.id || originalIndex}`}
                            className="w-7 h-7 rounded-full border-2 border-border cursor-pointer block hover:scale-110 transition-transform"
                            style={{ backgroundColor: item.icon_color }}
                            title="Click to change icon color"
                          />
                        </div>
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
