import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ExpensesManagerProps {
  onDataChange?: () => void;
}

interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

interface Expense {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  name: string;
  amount: number;
  expense_date: string | null;
  notes: string | null;
  created_at: string;
}

interface EventExpense {
  id: string;
  event_id: string;
  name: string;
  amount: number;
  category: string | null;
  expense_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Event {
  id: string;
  name: string;
}

// Unified expense type for display
interface UnifiedExpense {
  id: string;
  name: string;
  amount: number;
  category_id: string | null;
  category_name: string | null; // For event expenses that use category name directly
  expense_date: string | null;
  notes: string | null;
  source: 'general' | 'event';
  event_name?: string;
  original: Expense | EventExpense;
}

const ExpensesManager = ({ onDataChange }: ExpensesManagerProps) => {
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [eventExpenses, setEventExpenses] = useState<EventExpense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  
  // Dialog states
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  
  // Form states
  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    name: '',
    amount: 0,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [inventoryCategoriesRes, expensesRes, eventExpensesRes, eventsRes] = await Promise.all([
      supabase.from('inventory_categories').select('*').order('display_order'),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('event_expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('events').select('id, name').order('start_time', { ascending: false }),
    ]);

    if (inventoryCategoriesRes.data) setInventoryCategories(inventoryCategoriesRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (eventExpensesRes.data) setEventExpenses(eventExpensesRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
  };

  const getEventName = (eventId: string) => events.find(e => e.id === eventId)?.name || 'Unknown Event';

  // Expense handlers
  const handleSaveExpense = async () => {
    if (!expenseForm.name.trim()) {
      toast({ title: 'Expense name is required', variant: 'destructive' });
      return;
    }

    const data = {
      name: expenseForm.name,
      amount: expenseForm.amount,
      category_id: expenseForm.category_id || null,
      expense_date: expenseForm.expense_date || null,
      notes: expenseForm.notes || null,
    };

    if (editingExpense) {
      const { error } = await supabase
        .from('expenses')
        .update(data)
        .eq('id', editingExpense.id);

      if (error) {
        toast({ title: 'Error updating expense', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Expense updated' });
    } else {
      const { error } = await supabase.from('expenses').insert(data);
      if (error) {
        toast({ title: 'Error creating expense', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Expense added' });
    }

    setIsExpenseDialogOpen(false);
    setExpenseForm({
      category_id: '',
      name: '',
      amount: 0,
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setEditingExpense(null);
    loadData();
    onDataChange?.();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting expense', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Expense deleted' });
    loadData();
    onDataChange?.();
  };

  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseForm({
      category_id: exp.category_id || '',
      name: exp.name,
      amount: exp.amount,
      expense_date: exp.expense_date || format(new Date(), 'yyyy-MM-dd'),
      notes: exp.notes || '',
    });
    setIsExpenseDialogOpen(true);
  };

  const getCategoryName = (id: string | null) => inventoryCategories.find(c => c.id === id)?.name || 'Uncategorized';

  // Create unified expense list combining general and event expenses
  const unifiedExpenses: UnifiedExpense[] = useMemo(() => {
    const generalExpenses: UnifiedExpense[] = expenses.map(exp => ({
      id: exp.id,
      name: exp.name,
      amount: exp.amount,
      category_id: exp.category_id,
      category_name: null,
      expense_date: exp.expense_date,
      notes: exp.notes,
      source: 'general' as const,
      original: exp,
    }));

    const eventExpensesList: UnifiedExpense[] = eventExpenses.map(exp => ({
      id: exp.id,
      name: exp.name,
      amount: exp.amount,
      category_id: null,
      category_name: exp.category || null,
      expense_date: exp.expense_date,
      notes: exp.notes,
      source: 'event' as const,
      event_name: getEventName(exp.event_id),
      original: exp,
    }));

    return [...generalExpenses, ...eventExpensesList].sort((a, b) => {
      const dateA = a.expense_date ? new Date(a.expense_date).getTime() : 0;
      const dateB = b.expense_date ? new Date(b.expense_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [expenses, eventExpenses, events]);

  const getUnifiedCategoryName = (exp: UnifiedExpense) => {
    if (exp.category_name) return exp.category_name;
    return getCategoryName(exp.category_id);
  };

  const filteredExpenses = unifiedExpenses.filter(exp => {
    const matchesSearch = exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    // For category filter, match by ID for general expenses or by name for event expenses
    let matchesCategory = filterCategory === 'all';
    if (!matchesCategory) {
      if (exp.category_id === filterCategory) {
        matchesCategory = true;
      } else if (exp.category_name) {
        const filterCat = inventoryCategories.find(c => c.id === filterCategory);
        matchesCategory = filterCat?.name === exp.category_name;
      }
    }
    
    const matchesSource = filterSource === 'all' || 
      (filterSource === 'general' && exp.source === 'general') ||
      (filterSource === 'event' && exp.source === 'event');
    
    return matchesSearch && matchesCategory && matchesSource;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // Calculate expenses by category for chart (includes both sources)
  const expensesByCategory = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    
    // Add general expenses by category ID
    expenses.forEach(exp => {
      const catName = getCategoryName(exp.category_id);
      const current = categoryTotals.get(catName) || 0;
      categoryTotals.set(catName, current + Number(exp.amount));
    });

    // Add event expenses by category name
    eventExpenses.forEach(exp => {
      const catName = exp.category || 'Uncategorized';
      const current = categoryTotals.get(catName) || 0;
      categoryTotals.set(catName, current + Number(exp.amount));
    });

    return Array.from(categoryTotals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, eventExpenses, inventoryCategories]);

  const CHART_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {inventoryCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => {
              setIsExpenseDialogOpen(open);
              if (!open) {
                setEditingExpense(null);
                setExpenseForm({
                  category_id: '',
                  name: '',
                  amount: 0,
                  expense_date: format(new Date(), 'yyyy-MM-dd'),
                  notes: '',
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={expenseForm.name}
                      onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                      placeholder="Expense name"
                    />
                  </div>
                  <div>
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={expenseForm.expense_date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select 
                      value={expenseForm.category_id} 
                      onValueChange={(value) => setExpenseForm({ 
                        ...expenseForm, 
                        category_id: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      placeholder="Additional notes"
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleSaveExpense} className="w-full">
                    {editingExpense ? 'Update Expense' : 'Add Expense'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Expenses</CardTitle>
                <span className="text-lg font-semibold text-destructive">Total: ${totalExpenses.toFixed(2)}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <TableRow key={`${exp.source}-${exp.id}`}>
                        <TableCell className="font-medium">{exp.name}</TableCell>
                        <TableCell>
                          {exp.source === 'event' ? (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {exp.event_name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">General</span>
                          )}
                        </TableCell>
                        <TableCell>{getUnifiedCategoryName(exp)}</TableCell>
                        <TableCell>
                          {exp.expense_date ? format(new Date(exp.expense_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          ${Number(exp.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {exp.source === 'general' ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditExpense(exp.original as Expense)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Edit in Event</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Expenses by Category</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Includes both general and event expenses
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {expensesByCategory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No expense data yet</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expensesByCategory} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {expensesByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpensesManager;
