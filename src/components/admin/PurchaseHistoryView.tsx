import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Search, DollarSign, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
}

interface Purchase {
  id: string;
  inventory_item_id: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
  supplier: string | null;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  inventory?: InventoryItem;
}

interface PurchaseHistoryViewProps {
  onPurchaseChanged: () => void;
}

const PurchaseHistoryView = ({ onPurchaseChanged }: PurchaseHistoryViewProps) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    quantity: 1,
    unit: 'units',
    cost_per_unit: 0,
    supplier: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  useEffect(() => {
    loadPurchases();
    loadInventoryItems();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('inventory_purchases')
      .select(`
        *,
        inventory:inventory_item_id (
          id,
          name,
          category,
          unit
        )
      `)
      .order('purchase_date', { ascending: false });

    if (error) {
      toast({ title: 'Error loading purchases', description: error.message, variant: 'destructive' });
    } else {
      setPurchases(data || []);
    }
    setLoading(false);
  };

  const loadInventoryItems = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, name, category, unit')
      .order('name');

    if (error) {
      console.error('Error loading inventory items:', error);
    } else {
      setInventoryItems(data || []);
    }
  };

  const handleAddPurchase = async () => {
    if (formData.quantity <= 0) {
      toast({ title: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    let itemId = selectedItemId;

    // If creating a new item
    if (isNewItem) {
      if (!formData.itemName.trim()) {
        toast({ title: 'Item name is required', variant: 'destructive' });
        return;
      }

      const { data: newItem, error: createError } = await supabase
        .from('inventory')
        .insert({
          name: formData.itemName.trim(),
          category: formData.category || null,
          quantity: formData.quantity,
          unit: formData.unit,
          cost_per_unit: formData.cost_per_unit,
        })
        .select()
        .single();

      if (createError) {
        toast({ title: 'Error creating item', description: createError.message, variant: 'destructive' });
        return;
      }

      itemId = newItem.id;
    } else {
      if (!itemId) {
        toast({ title: 'Please select an item', variant: 'destructive' });
        return;
      }
    }

    const total_cost = formData.quantity * formData.cost_per_unit;

    const { error } = await supabase
      .from('inventory_purchases')
      .insert({
        inventory_item_id: itemId,
        quantity: formData.quantity,
        unit: formData.unit || 'units',
        cost_per_unit: formData.cost_per_unit,
        total_cost,
        supplier: formData.supplier || null,
        purchase_date: formData.purchase_date,
        notes: formData.notes || null,
      });

    if (error) {
      toast({ title: 'Error adding purchase', description: error.message, variant: 'destructive' });
      return;
    }

    // Update inventory quantity and blended cost if not new item
    if (!isNewItem) {
      const { data: currentItem } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', itemId)
        .single();

      if (currentItem) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ 
            quantity: currentItem.quantity + formData.quantity
          })
          .eq('id', itemId);

        if (updateError) {
          console.error('Error updating inventory quantity:', updateError);
        }
      }
    }

    toast({ title: 'Purchase recorded successfully' });
    setShowAddForm(false);
    resetForm();
    loadPurchases();
    loadInventoryItems();
    onPurchaseChanged();
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!confirm('Are you sure you want to delete this purchase record?')) return;

    const { error } = await supabase
      .from('inventory_purchases')
      .delete()
      .eq('id', purchaseId);

    if (error) {
      toast({ title: 'Error deleting purchase', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Purchase deleted' });
    loadPurchases();
    onPurchaseChanged();
  };

  const resetForm = () => {
    setFormData({
      itemName: '',
      category: '',
      quantity: 1,
      unit: 'units',
      cost_per_unit: 0,
      supplier: '',
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setSelectedItemId('');
    setIsNewItem(false);
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setFormData(prev => ({
        ...prev,
        unit: item.unit || 'units',
        category: item.category || '',
      }));
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.inventory?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.inventory?.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpent = purchases.reduce((sum, p) => sum + p.total_cost, 0);
  const uniqueCategories = [...new Set(inventoryItems.map(item => item.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(purchases.map(p => p.inventory_item_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Purchase Form */}
      {showAddForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Record New Purchase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Item Selection */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isNewItem ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsNewItem(false)}
                >
                  Existing Item
                </Button>
                <Button
                  type="button"
                  variant={isNewItem ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsNewItem(true)}
                >
                  New Item
                </Button>
              </div>

              {isNewItem ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item-name">Item Name *</Label>
                    <Input
                      id="item-name"
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      placeholder="Enter item name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="item-category">Category</Label>
                    <Input
                      id="item-category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Ingredients, Packaging"
                      list="categories-list"
                    />
                    <datalist id="categories-list">
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat || ''} />
                      ))}
                    </datalist>
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="select-item">Select Item *</Label>
                  <select
                    id="select-item"
                    value={selectedItemId}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    className="w-full h-10 px-3 py-2 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Select an item...</option>
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.category ? `(${item.category})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="p-quantity">Quantity *</Label>
                <Input
                  id="p-quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="p-unit">Unit</Label>
                <Input
                  id="p-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="units, kg, pcs"
                />
              </div>
              <div>
                <Label htmlFor="p-cost">Cost per Unit ($)</Label>
                <Input
                  id="p-cost"
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="p-date">Purchase Date</Label>
                <Input
                  id="p-date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="p-supplier">Supplier</Label>
              <Input
                id="p-supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
            <div>
              <Label htmlFor="p-notes">Notes</Label>
              <Textarea
                id="p-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-bold">${(formData.quantity * formData.cost_per_unit).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowAddForm(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleAddPurchase}>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Purchase
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowAddForm(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Record New Purchase
        </Button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by item name, supplier, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Purchase History Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Cost/Unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No purchases match your search' : 'No purchase history yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      {format(new Date(purchase.purchase_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {purchase.inventory?.name || 'Unknown Item'}
                    </TableCell>
                    <TableCell>
                      {purchase.inventory?.category || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {purchase.quantity} {purchase.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      ${purchase.cost_per_unit.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${purchase.total_cost.toFixed(2)}
                    </TableCell>
                    <TableCell>{purchase.supplier || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePurchase(purchase.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseHistoryView;
