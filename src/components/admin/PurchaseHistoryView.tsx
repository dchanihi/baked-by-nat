import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const filteredInventoryItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const exactMatch = inventoryItems.find(
    item => item.name.toLowerCase() === itemSearch.toLowerCase()
  );

  const handleItemSearchChange = (value: string) => {
    setItemSearch(value);
    setShowItemDropdown(true);
    setSelectedItem(null);
    setIsNewItem(false);
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemSearch(item.name);
    setIsNewItem(false);
    setShowItemDropdown(false);
    setFormData(prev => ({
      ...prev,
      unit: item.unit || 'units',
      category: item.category || '',
    }));
  };

  const handleCreateNewItem = () => {
    setIsNewItem(true);
    setSelectedItem(null);
    setShowItemDropdown(false);
  };

  const handleAddPurchase = async () => {
    if (!itemSearch.trim()) {
      toast({ title: 'Item name is required', variant: 'destructive' });
      return;
    }

    if (formData.quantity <= 0) {
      toast({ title: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    let itemId: string;

    if (isNewItem || (!selectedItem && !exactMatch)) {
      // Create new item
      const { data: newItem, error: createError } = await supabase
        .from('inventory')
        .insert({
          name: itemSearch.trim(),
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
      // Use existing item
      itemId = selectedItem?.id || exactMatch?.id || '';
      if (!itemId) {
        toast({ title: 'Please select an item', variant: 'destructive' });
        return;
      }

      // Update inventory quantity
      const { data: currentItem } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', itemId)
        .single();

      if (currentItem) {
        await supabase
          .from('inventory')
          .update({ quantity: currentItem.quantity + formData.quantity })
          .eq('id', itemId);
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

    toast({ title: 'Purchase recorded' });
    setShowAddDialog(false);
    resetForm();
    loadPurchases();
    loadInventoryItems();
    onPurchaseChanged();
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!confirm('Delete this purchase record?')) return;

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
      category: '',
      quantity: 1,
      unit: 'units',
      cost_per_unit: 0,
      supplier: '',
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setItemSearch('');
    setSelectedItem(null);
    setIsNewItem(false);
  };

  const filteredPurchases = purchases.filter(p => 
    p.inventory?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.inventory?.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpent = purchases.reduce((sum, p) => sum + p.total_cost, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-0 px-4">
            <CardTitle className="text-xs font-medium">Total Purchases</CardTitle>
            <Package className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-0 px-4">
            <div className="text-xl font-bold">{purchases.length}</div>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-0 px-4">
            <CardTitle className="text-xs font-medium">Total Spent</CardTitle>
            <DollarSign className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-0 px-4">
            <div className="text-xl font-bold">${totalSpent.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-0 px-4">
            <CardTitle className="text-xs font-medium">Unique Items</CardTitle>
          </CardHeader>
          <CardContent className="pb-0 px-4">
            <div className="text-xl font-bold">
              {new Set(purchases.map(p => p.inventory_item_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Purchase Button */}
      <Button onClick={() => setShowAddDialog(true)} size="sm">
        <Plus className="w-4 h-4 mr-1" />
        Record Purchase
      </Button>

      {/* Add Purchase Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">Record Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Item Search */}
            <div className="relative" ref={dropdownRef}>
              <Label className="text-xs">Item Name *</Label>
              <Input
                value={itemSearch}
                onChange={(e) => handleItemSearchChange(e.target.value)}
                onFocus={() => setShowItemDropdown(true)}
                placeholder="Search or enter new item..."
                className="h-8 text-sm"
              />
              {showItemDropdown && itemSearch && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                  {filteredInventoryItems.length > 0 ? (
                    <>
                      {filteredInventoryItems.slice(0, 5).map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex justify-between items-center"
                        >
                          <span>{item.name}</span>
                          {item.category && (
                            <span className="text-xs text-muted-foreground">{item.category}</span>
                          )}
                        </button>
                      ))}
                      {!exactMatch && (
                        <button
                          type="button"
                          onClick={handleCreateNewItem}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent border-t text-primary font-medium"
                        >
                          + Create "{itemSearch}"
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateNewItem}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent text-primary font-medium"
                    >
                      + Create "{itemSearch}"
                    </button>
                  )}
                </div>
              )}
              {(selectedItem || isNewItem) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isNewItem ? '✨ New item will be created' : `✓ Adding to: ${selectedItem?.name}`}
                </p>
              )}
            </div>

            {/* Category - only show for new items */}
            {isNewItem && (
              <div>
                <Label className="text-xs">Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Ingredients"
                  className="h-8 text-sm"
                />
              </div>
            )}

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Quantity *</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="any"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="kg, pcs"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Cost and Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Cost/Unit ($)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Supplier */}
            <div>
              <Label className="text-xs">Supplier</Label>
              <Input
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
                className="h-8 text-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs">Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
                className="h-8 text-sm"
              />
            </div>

            {/* Total and Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm">
                Total: <span className="font-bold">${(formData.quantity * formData.cost_per_unit).toFixed(2)}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddPurchase}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search purchases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Purchase History Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Item</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs text-right">$/Unit</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs">Supplier</TableHead>
                <TableHead className="text-xs text-right w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">
                    {searchQuery ? 'No matches' : 'No purchases yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="text-xs py-2">
                      {format(new Date(purchase.purchase_date), 'MMM d, yy')}
                    </TableCell>
                    <TableCell className="text-xs py-2 font-medium">
                      {purchase.inventory?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      {purchase.inventory?.category || '-'}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right">
                      {purchase.quantity} {purchase.unit}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right">
                      ${purchase.cost_per_unit.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right font-medium">
                      ${purchase.total_cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs py-2">{purchase.supplier || '-'}</TableCell>
                    <TableCell className="text-right py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeletePurchase(purchase.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
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
