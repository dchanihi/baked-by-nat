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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Search, DollarSign, Package, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
}

interface InventoryCategory {
  id: string;
  name: string;
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
  showAddDialog?: boolean;
  onShowAddDialogChange?: (show: boolean) => void;
}

const PurchaseHistoryView = ({ onPurchaseChanged, showAddDialog: externalShowAddDialog, onShowAddDialogChange }: PurchaseHistoryViewProps) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalShowAddDialog, setInternalShowAddDialog] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const showAddDialog = externalShowAddDialog !== undefined ? externalShowAddDialog : internalShowAddDialog;
  const setShowAddDialog = (show: boolean) => {
    if (onShowAddDialogChange) {
      onShowAddDialogChange(show);
    } else {
      setInternalShowAddDialog(show);
    }
  };
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [knownStores, setKnownStores] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    category: '',
    quantity: '',
    unit: 'kg',
    total_cost: '',
    purchase_date: getTodayDateString(),
    notes: '',
  });

  useEffect(() => {
    loadPurchases();
    loadInventoryItems();
    loadKnownStores();
    loadInventoryCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
        setShowStoreDropdown(false);
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

  const loadInventoryCategories = async () => {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('id, name')
      .order('display_order');

    if (!error && data) {
      setInventoryCategories(data);
    }
  };

  const loadKnownStores = async () => {
    const { data, error } = await supabase
      .from('inventory_purchases')
      .select('supplier')
      .not('supplier', 'is', null);

    if (!error && data) {
      const uniqueStores = [...new Set(data.map(p => p.supplier).filter(Boolean))] as string[];
      setKnownStores(uniqueStores.sort());
    }
  };

  const filteredInventoryItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const exactMatch = inventoryItems.find(
    item => item.name.toLowerCase() === itemSearch.toLowerCase()
  );

  const filteredStores = knownStores.filter(store =>
    store.toLowerCase().includes(storeSearch.toLowerCase())
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
      unit: item.unit || 'kg',
      category: item.category || '',
    }));
  };

  const handleCreateNewItem = () => {
    setIsNewItem(true);
    setSelectedItem(null);
    setShowItemDropdown(false);
  };

  const handleStoreSearchChange = (value: string) => {
    setStoreSearch(value);
    setShowStoreDropdown(true);
  };

  const handleSelectStore = (store: string) => {
    setStoreSearch(store);
    setShowStoreDropdown(false);
  };

  const handleAddPurchase = async () => {
    if (!itemSearch.trim()) {
      toast({ title: 'Item name is required', variant: 'destructive' });
      return;
    }

    const quantity = parseFloat(formData.quantity);
    const totalCost = parseFloat(formData.total_cost);

    if (!quantity || quantity <= 0) {
      toast({ title: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    if (!totalCost || totalCost < 0) {
      toast({ title: 'Please enter a valid cost', variant: 'destructive' });
      return;
    }

    const costPerUnit = totalCost / quantity;

    let itemId: string;

    if (isNewItem || (!selectedItem && !exactMatch)) {
      // Create new item
      const { data: newItem, error: createError } = await supabase
        .from('inventory')
        .insert({
          name: itemSearch.trim(),
          category: formData.category || null,
          quantity: quantity,
          unit: formData.unit,
          cost_per_unit: costPerUnit,
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
          .update({ quantity: currentItem.quantity + quantity })
          .eq('id', itemId);
      }
    }

    const { error } = await supabase
      .from('inventory_purchases')
      .insert({
        inventory_item_id: itemId,
        quantity: quantity,
        unit: formData.unit || 'kg',
        cost_per_unit: costPerUnit,
        total_cost: totalCost,
        supplier: storeSearch || null,
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
    loadKnownStores();
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
      quantity: '',
      unit: 'kg',
      total_cost: '',
      purchase_date: getTodayDateString(),
      notes: '',
    });
    setItemSearch('');
    setSelectedItem(null);
    setIsNewItem(false);
    setStoreSearch('');
    setShowNotes(false);
  };

  const filteredPurchases = purchases.filter(p => 
    p.inventory?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.inventory?.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpent = purchases.reduce((sum, p) => sum + p.total_cost, 0);

  return (
    <div className="space-y-4">

      {/* Add Purchase Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">Record Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {/* Item Name and Category on same line */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative" ref={dropdownRef}>
                <Label className="text-xs">Item Name *</Label>
                <Input
                  value={itemSearch}
                  onChange={(e) => handleItemSearchChange(e.target.value)}
                  onFocus={() => setShowItemDropdown(true)}
                  placeholder="Search or new..."
                  className="h-7 text-xs"
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
                            className="w-full px-2 py-1.5 text-left text-xs hover:bg-accent flex justify-between items-center"
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
                            className="w-full px-2 py-1.5 text-left text-xs hover:bg-accent border-t text-primary font-medium"
                          >
                            + Create "{itemSearch}"
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCreateNewItem}
                        className="w-full px-2 py-1.5 text-left text-xs hover:bg-accent text-primary font-medium"
                      >
                        + Create "{itemSearch}"
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  disabled={!!selectedItem && !isNewItem}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status message */}
            {(selectedItem || isNewItem) && (
              <p className="text-xs text-muted-foreground">
                {isNewItem ? '✨ New item will be created' : `✓ Adding to: ${selectedItem?.name}`}
              </p>
            )}

            {/* Quantity, Unit, Cost on same line */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Quantity *</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="any"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <div className="flex h-7 rounded-md border border-input overflow-hidden">
                  {['kg', 'g', 'pc'].map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setFormData({ ...formData, unit })}
                      className={`flex-1 text-xs font-medium transition-colors ${
                        formData.unit === unit
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-accent'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Cost ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_cost}
                  onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                  placeholder="0.00"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Date and Store on same line */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
              <div className="relative" ref={storeDropdownRef}>
                <Label className="text-xs">Store</Label>
                <Input
                  value={storeSearch}
                  onChange={(e) => handleStoreSearchChange(e.target.value)}
                  onFocus={() => setShowStoreDropdown(true)}
                  placeholder="Store name"
                  className="h-7 text-xs"
                />
                {showStoreDropdown && (storeSearch || knownStores.length > 0) && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-auto">
                    {filteredStores.length > 0 ? (
                      filteredStores.slice(0, 5).map(store => (
                        <button
                          key={store}
                          type="button"
                          onClick={() => handleSelectStore(store)}
                          className="w-full px-2 py-1.5 text-left text-xs hover:bg-accent"
                        >
                          {store}
                        </button>
                      ))
                    ) : storeSearch ? (
                      <button
                        type="button"
                        onClick={() => setShowStoreDropdown(false)}
                        className="w-full px-2 py-1.5 text-left text-xs hover:bg-accent text-primary"
                      >
                        Use "{storeSearch}"
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Notes - collapsible */}
            {!showNotes ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNotes(true)}
                className="h-6 px-2 text-xs text-muted-foreground"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add notes
              </Button>
            ) : (
              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="h-7 text-xs"
                />
              </div>
            )}

            {/* Total display and Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {formData.quantity && formData.total_cost ? (
                  <>Cost/unit: ${(parseFloat(formData.total_cost) / parseFloat(formData.quantity)).toFixed(3)}</>
                ) : null}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={handleAddPurchase}>
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
                      {new Date(purchase.purchase_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-xs py-2 font-medium">
                      {purchase.inventory?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      {purchase.inventory?.category ? (
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3 text-primary animate-pulse" />
                          {purchase.inventory.category}
                        </span>
                      ) : '-'}
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
