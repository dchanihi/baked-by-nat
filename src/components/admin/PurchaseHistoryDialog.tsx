import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, Trash2, History } from 'lucide-react';
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
}

interface PurchaseHistoryDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseAdded?: () => void;
}

const PurchaseHistoryDialog = ({ item, open, onOpenChange, onPurchaseAdded }: PurchaseHistoryDialogProps) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 1,
    unit: '',
    cost_per_unit: 0,
    supplier: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  useEffect(() => {
    if (item && open) {
      loadPurchases();
      setFormData(prev => ({ ...prev, unit: item.unit || 'units' }));
    }
  }, [item, open]);

  const loadPurchases = async () => {
    if (!item) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('inventory_purchases')
      .select('*')
      .eq('inventory_item_id', item.id)
      .order('purchase_date', { ascending: false });

    if (error) {
      toast({ title: 'Error loading purchases', description: error.message, variant: 'destructive' });
    } else {
      setPurchases(data || []);
    }
    setLoading(false);
  };

  const handleAddPurchase = async () => {
    if (!item) return;
    
    if (formData.quantity <= 0) {
      toast({ title: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    const total_cost = formData.quantity * formData.cost_per_unit;

    const { error } = await supabase
      .from('inventory_purchases')
      .insert({
        inventory_item_id: item.id,
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

    // Update inventory quantity
    const { error: updateError } = await supabase
      .from('inventory')
      .update({ 
        quantity: (await supabase.from('inventory').select('quantity').eq('id', item.id).single()).data?.quantity + formData.quantity 
      })
      .eq('id', item.id);

    if (updateError) {
      console.error('Error updating inventory quantity:', updateError);
    }

    toast({ title: 'Purchase recorded successfully' });
    setShowAddForm(false);
    resetForm();
    loadPurchases();
    onPurchaseAdded?.();
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
  };

  const resetForm = () => {
    setFormData({
      quantity: 1,
      unit: item?.unit || 'units',
      cost_per_unit: 0,
      supplier: '',
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
  };

  const totalSpent = purchases.reduce((sum, p) => sum + p.total_cost, 0);
  const totalQuantityPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Purchase History - {item?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="text-xl font-bold">{purchases.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold">${totalSpent.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Qty Purchased</p>
            <p className="text-xl font-bold">{totalQuantityPurchased} {item?.unit || 'units'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Cost/Unit</p>
            <p className="text-xl font-bold">
              ${totalQuantityPurchased > 0 ? (totalSpent / totalQuantityPurchased).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* Add Purchase Form */}
        {showAddForm ? (
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Record New Purchase</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="p-quantity">Quantity</Label>
                <Input
                  id="p-quantity"
                  type="number"
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
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="p-cost">Cost per Unit ($)</Label>
                <Input
                  id="p-cost"
                  type="number"
                  step="0.01"
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
            <div className="text-right text-sm text-muted-foreground">
              Total: ${(formData.quantity * formData.cost_per_unit).toFixed(2)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowAddForm(false); resetForm(); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddPurchase} className="flex-1">
                Record Purchase
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowAddForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Record New Purchase
          </Button>
        )}

        {/* Purchase History Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No purchase history yet
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      {format(new Date(purchase.purchase_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {purchase.quantity} {purchase.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      ${purchase.cost_per_unit.toFixed(2)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseHistoryDialog;
