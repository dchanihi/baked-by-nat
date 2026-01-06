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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Package, AlertTriangle, Search, History, ShoppingCart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import PurchaseHistoryDialog from './PurchaseHistoryDialog';
import PurchaseHistoryView from './PurchaseHistoryView';

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  unit: string | null;
  cost_per_unit: number | null;
  minimum_stock: number | null;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PurchaseSummary {
  inventory_item_id: string;
  total_quantity: number;
  total_cost: number;
  avg_cost: number;
}

const InventoryContent = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchaseSummaries, setPurchaseSummaries] = useState<Map<string, PurchaseSummary>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    quantity: 0,
    unit: 'units',
    cost_per_unit: 0,
    minimum_stock: 0,
    supplier: '',
    notes: '',
  });

  useEffect(() => {
    loadItems();
    loadPurchaseSummaries();
  }, []);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('name');

    if (error) {
      toast({ title: 'Error loading inventory', description: error.message, variant: 'destructive' });
      return;
    }

    setItems(data || []);
  };

  const loadPurchaseSummaries = async () => {
    const { data, error } = await supabase
      .from('inventory_purchases')
      .select('inventory_item_id, quantity, total_cost');

    if (error) {
      console.error('Error loading purchase summaries:', error);
      return;
    }

    // Aggregate purchases by item
    const summaryMap = new Map<string, PurchaseSummary>();
    (data || []).forEach(purchase => {
      const existing = summaryMap.get(purchase.inventory_item_id);
      if (existing) {
        existing.total_quantity += purchase.quantity;
        existing.total_cost += purchase.total_cost;
        existing.avg_cost = existing.total_cost / existing.total_quantity;
      } else {
        summaryMap.set(purchase.inventory_item_id, {
          inventory_item_id: purchase.inventory_item_id,
          total_quantity: purchase.quantity,
          total_cost: purchase.total_cost,
          avg_cost: purchase.total_cost / purchase.quantity,
        });
      }
    });

    setPurchaseSummaries(summaryMap);
  };

  const getBlendedCostPerUnit = (itemId: string, fallbackCost: number | null): number => {
    const summary = purchaseSummaries.get(itemId);
    if (summary && summary.total_quantity > 0) {
      return summary.avg_cost;
    }
    return fallbackCost || 0;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      quantity: 0,
      unit: 'units',
      cost_per_unit: 0,
      minimum_stock: 0,
      supplier: '',
      notes: '',
    });
    setEditingItem(null);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      quantity: item.quantity,
      unit: item.unit || 'units',
      cost_per_unit: item.cost_per_unit || 0,
      minimum_stock: item.minimum_stock || 0,
      supplier: item.supplier || '',
      notes: item.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    if (editingItem) {
      const { error } = await supabase
        .from('inventory')
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          quantity: formData.quantity,
          unit: formData.unit,
          cost_per_unit: formData.cost_per_unit,
          minimum_stock: formData.minimum_stock,
          supplier: formData.supplier || null,
          notes: formData.notes || null,
        })
        .eq('id', editingItem.id);

      if (error) {
        toast({ title: 'Error updating item', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Item updated successfully' });
    }

    setIsDialogOpen(false);
    resetForm();
    loadItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const { error } = await supabase.from('inventory').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error deleting item', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Item deleted successfully' });
    loadItems();
  };

  const handlePurchaseChanged = () => {
    loadItems();
    loadPurchaseSummaries();
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = items.filter(item => 
    item.minimum_stock && item.quantity <= item.minimum_stock
  );

  const totalValue = items.reduce((sum, item) => {
    const costPerUnit = getBlendedCostPerUnit(item.id, item.cost_per_unit);
    return sum + (item.quantity * costPerUnit);
  }, 0);

  const uniqueCategories = [...new Set(items.map(item => item.category).filter(Boolean))];

  if (showPurchaseHistory) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Purchase History</h2>
            <p className="text-muted-foreground mt-1">Track and record ingredient purchases</p>
          </div>
          <Button variant="outline" onClick={() => setShowPurchaseHistory(false)}>
            <Package className="w-4 h-4 mr-2" />
            View Inventory
          </Button>
        </div>
        <PurchaseHistoryView onPurchaseChanged={handlePurchaseChanged} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Inventory</h2>
          <p className="text-muted-foreground mt-1">Manage your stock and supplies</p>
        </div>
        <Button onClick={() => setShowPurchaseHistory(true)}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Purchase History
        </Button>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="units, kg, pcs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">Cost per Unit ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.001"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="minStock">Minimum Stock</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({ ...formData, minimum_stock: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Ingredients, Packaging"
                list="categories"
              />
              <datalist id="categories">
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat || ''} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Item description"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
            <Button onClick={handleSubmit} className="w-full">
              Update Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCategories.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className={lowStockItems.length > 0 ? 'border-amber-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockItems.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-amber-500' : ''}`}>
              {lowStockItems.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, category, or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Cost/Unit</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No items match your search' : 'No inventory items yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const isLowStock = item.minimum_stock && item.quantity <= item.minimum_stock;
                  const blendedCost = getBlendedCostPerUnit(item.id, item.cost_per_unit);
                  return (
                    <TableRow 
                      key={item.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedItemForHistory(item);
                        setHistoryDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div>
                            {item.name}
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <History className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        ${blendedCost.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(item.quantity * blendedCost).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="secondary">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(item);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Purchase History Dialog */}
      <PurchaseHistoryDialog
        item={selectedItemForHistory}
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        onPurchaseAdded={handlePurchaseChanged}
      />
    </div>
  );
};

export default InventoryContent;
