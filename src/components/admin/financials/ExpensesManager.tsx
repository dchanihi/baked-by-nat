import { useEffect, useState } from 'react';
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
import { Plus, Edit2, Trash2, FolderPlus, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ExpensesManagerProps {
  onDataChange?: () => void;
}

interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

interface Subcategory {
  id: string;
  category_id: string;
  event_id: string | null;
  name: string;
  description: string | null;
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

interface Event {
  id: string;
  name: string;
}

const ExpensesManager = ({ onDataChange }: ExpensesManagerProps) => {
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Dialog states
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  
  // Form states
  const [subcategoryForm, setSubcategoryForm] = useState({ 
    category_id: '', 
    event_id: '', 
    name: '', 
    description: '' 
  });
  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    subcategory_id: '',
    name: '',
    amount: 0,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [inventoryCategoriesRes, subcategoriesRes, expensesRes, eventsRes] = await Promise.all([
      supabase.from('inventory_categories').select('*').order('display_order'),
      supabase.from('expense_subcategories').select('*').order('name'),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('events').select('id, name').order('start_time', { ascending: false }),
    ]);

    if (inventoryCategoriesRes.data) setInventoryCategories(inventoryCategoriesRes.data);
    if (subcategoriesRes.data) setSubcategories(subcategoriesRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
  };

  // Subcategory handlers
  const handleSaveSubcategory = async () => {
    if (!subcategoryForm.name.trim() || !subcategoryForm.category_id) {
      toast({ title: 'Name and category are required', variant: 'destructive' });
      return;
    }

    const data = {
      name: subcategoryForm.name,
      category_id: subcategoryForm.category_id,
      event_id: subcategoryForm.event_id || null,
      description: subcategoryForm.description || null,
    };

    if (editingSubcategory) {
      const { error } = await supabase
        .from('expense_subcategories')
        .update(data)
        .eq('id', editingSubcategory.id);

      if (error) {
        toast({ title: 'Error updating subcategory', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Subcategory updated' });
    } else {
      const { error } = await supabase.from('expense_subcategories').insert(data);
      if (error) {
        toast({ title: 'Error creating subcategory', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Subcategory created' });
    }

    setIsSubcategoryDialogOpen(false);
    setSubcategoryForm({ category_id: '', event_id: '', name: '', description: '' });
    setEditingSubcategory(null);
    loadData();
    onDataChange?.();
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm('This will unlink expenses from this subcategory. Continue?')) return;
    
    const { error } = await supabase.from('expense_subcategories').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting subcategory', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Subcategory deleted' });
    loadData();
    onDataChange?.();
  };

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
      subcategory_id: expenseForm.subcategory_id || null,
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
      subcategory_id: '',
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

  const openEditSubcategory = (sub: Subcategory) => {
    setEditingSubcategory(sub);
    setSubcategoryForm({
      category_id: sub.category_id,
      event_id: sub.event_id || '',
      name: sub.name,
      description: sub.description || '',
    });
    setIsSubcategoryDialogOpen(true);
  };

  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseForm({
      category_id: exp.category_id || '',
      subcategory_id: exp.subcategory_id || '',
      name: exp.name,
      amount: exp.amount,
      expense_date: exp.expense_date || format(new Date(), 'yyyy-MM-dd'),
      notes: exp.notes || '',
    });
    setIsExpenseDialogOpen(true);
  };

  const getCategoryName = (id: string | null) => inventoryCategories.find(c => c.id === id)?.name || '-';
  const getSubcategoryName = (id: string | null) => subcategories.find(s => s.id === id)?.name || '-';
  const getEventName = (id: string | null) => events.find(e => e.id === id)?.name;

  const filteredSubcategories = expenseForm.category_id 
    ? subcategories.filter(s => s.category_id === expenseForm.category_id)
    : [];

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || exp.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="categories">Categories & Subcategories</TabsTrigger>
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
            </div>
            
            <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => {
              setIsExpenseDialogOpen(open);
              if (!open) {
                setEditingExpense(null);
                setExpenseForm({
                  category_id: '',
                  subcategory_id: '',
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
                        category_id: value,
                        subcategory_id: '' 
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
                  {filteredSubcategories.length > 0 && (
                    <div>
                      <Label>Subcategory</Label>
                      <Select 
                        value={expenseForm.subcategory_id} 
                        onValueChange={(value) => setExpenseForm({ ...expenseForm, subcategory_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSubcategories.map(sub => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                              {sub.event_id && ` (${getEventName(sub.event_id)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                <span className="text-lg font-semibold text-red-600">Total: ${totalExpenses.toFixed(2)}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subcategory</TableHead>
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
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{exp.name}</TableCell>
                        <TableCell>{getCategoryName(exp.category_id)}</TableCell>
                        <TableCell>{getSubcategoryName(exp.subcategory_id)}</TableCell>
                        <TableCell>
                          {exp.expense_date ? format(new Date(exp.expense_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          ${Number(exp.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditExpense(exp)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
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
          {/* Categories Section - Read-only from Inventory Categories */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Categories</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Managed in Settings → Inventory Categories
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryCategories.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No categories yet</p>
              ) : (
                <div className="space-y-2">
                  {inventoryCategories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        {cat.description && (
                          <p className="text-sm text-muted-foreground">{cat.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subcategories Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Subcategories</CardTitle>
                <Dialog open={isSubcategoryDialogOpen} onOpenChange={(open) => {
                  setIsSubcategoryDialogOpen(open);
                  if (!open) {
                    setEditingSubcategory(null);
                    setSubcategoryForm({ category_id: '', event_id: '', name: '', description: '' });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={inventoryCategories.length === 0}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Add Subcategory
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Parent Category *</Label>
                        <Select 
                          value={subcategoryForm.category_id} 
                          onValueChange={(value) => setSubcategoryForm({ ...subcategoryForm, category_id: value })}
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
                        <Label>Name *</Label>
                        <Input
                          value={subcategoryForm.name}
                          onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                          placeholder="Subcategory name"
                        />
                      </div>
                      <div>
                        <Label>Link to Event (Optional)</Label>
                        <Select 
                          value={subcategoryForm.event_id} 
                          onValueChange={(value) => setSubcategoryForm({ ...subcategoryForm, event_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select event (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No event</SelectItem>
                            {events.map(event => (
                              <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Link to a specific event for event-related expenses
                        </p>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={subcategoryForm.description}
                          onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                          placeholder="Optional description"
                          rows={2}
                        />
                      </div>
                      <Button onClick={handleSaveSubcategory} className="w-full">
                        {editingSubcategory ? 'Update' : 'Create'} Subcategory
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {subcategories.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No subcategories yet</p>
              ) : (
                <div className="space-y-2">
                  {subcategories.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{sub.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getCategoryName(sub.category_id)}
                          {sub.event_id && ` → ${getEventName(sub.event_id)}`}
                        </p>
                        {sub.description && (
                          <p className="text-xs text-muted-foreground">{sub.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditSubcategory(sub)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSubcategory(sub.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
