import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

interface OrderDetailsProps {
  order: Order;
  onBack: () => void;
  onUpdate: () => void;
}

export const OrderDetails = ({ order, onBack, onUpdate }: OrderDetailsProps) => {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [notes, setNotes] = useState(order.additional_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('orders')
      .update({
        status,
        additional_notes: notes,
      })
      .eq('id', order.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Order updated successfully.',
      });
      onUpdate();
      onBack();
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-pink-soft hover:bg-pink-medium"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold mb-4">order details</h2>
          <div className="text-sm text-muted-foreground">
            submitted {format(new Date(order.created_at), 'MMMM d, yyyy h:mm a')}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">customer name</Label>
              <p className="mt-1">{order.customer_name}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">email</Label>
              <p className="mt-1">{order.customer_email}</p>
            </div>

            {order.customer_phone && (
              <div>
                <Label className="text-sm font-medium">phone</Label>
                <p className="mt-1">{order.customer_phone}</p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">order type</Label>
              <p className="mt-1 capitalize">
                {order.order_type === 'existing_bake' ? 'pre-made bake' : 'custom order'}
              </p>
            </div>
          </div>

          {order.order_type === 'existing_bake' && order.bake_title && (
            <div>
              <Label className="text-sm font-medium">selected bake</Label>
              <p className="mt-1">{order.bake_title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                quantity: {order.quantity}
              </p>
            </div>
          )}

          {order.order_type === 'custom' && order.custom_description && (
            <div>
              <Label className="text-sm font-medium">custom order description</Label>
              <p className="mt-1 whitespace-pre-wrap">{order.custom_description}</p>
            </div>
          )}

          {order.requested_date && (
            <div>
              <Label className="text-sm font-medium">requested date</Label>
              <p className="mt-1">{format(new Date(order.requested_date), 'MMMM d, yyyy')}</p>
            </div>
          )}

          {order.pickup_date && (
            <div>
              <Label className="text-sm font-medium">pickup date</Label>
              <p className="mt-1">{format(new Date(order.pickup_date), 'MMMM d, yyyy')}</p>
            </div>
          )}

          <div>
            <Label htmlFor="status" className="text-sm font-medium">
              order status
            </Label>
            <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus)}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="confirmed">confirmed</SelectItem>
                <SelectItem value="in_progress">in progress</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              admin notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this order..."
              className="mt-1 min-h-[100px]"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
