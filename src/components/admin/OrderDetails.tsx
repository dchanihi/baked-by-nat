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
import { ArrowLeft, Save, Copy, Check, X } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(order.customer_email);
    setCopied(true);
    toast({
      title: 'Email copied',
      description: 'Email address copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setSaving(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
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
        description: `Order ${newStatus === 'confirmed' ? 'accepted' : 'rejected'}.`,
      });
      onUpdate();
      onBack();
    }
    setSaving(false);
  };

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
        <div className="flex gap-2">
          {status === 'pending' && (
            <>
              <Button
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={saving}
                variant="destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleStatusUpdate('confirmed')}
                disabled={saving}
                className="bg-pink-soft hover:bg-pink-medium"
              >
                <Check className="w-4 h-4 mr-2" />
                Accept
              </Button>
            </>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="outline"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Notes'}
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold mb-4">order details</h2>
          <div className="text-sm text-muted-foreground">
            submitted {format(new Date(order.created_at), 'MMMM d, yyyy h:mm a')}
          </div>
        </div>

        <div className="grid gap-6">
          <div>
            <Label className="text-sm font-medium">customer email</Label>
            <div className="flex items-center gap-2 mt-1">
              <p>{order.customer_email}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyEmail}
                className="h-8 w-8 p-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {order.requested_date && (
            <div>
              <Label className="text-sm font-medium">requested date</Label>
              <p className="mt-1">{format(new Date(order.requested_date), 'MMMM d, yyyy')}</p>
            </div>
          )}

          {order.order_type === 'custom' && order.custom_description && (
            <div>
              <Label className="text-sm font-medium">custom order</Label>
              <p className="mt-1 whitespace-pre-wrap">{order.custom_description}</p>
            </div>
          )}

          {order.order_type === 'existing_bake' && (
            <>
              {order.bake_title && (
                <div>
                  <Label className="text-sm font-medium">selected bake</Label>
                  <p className="mt-1">{order.bake_title}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">quantity</Label>
                <p className="mt-1">{order.quantity}</p>
              </div>
              {order.pickup_date && (
                <div>
                  <Label className="text-sm font-medium">pickup date</Label>
                  <p className="mt-1">{format(new Date(order.pickup_date), 'MMMM d, yyyy')}</p>
                </div>
              )}
            </>
          )}

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
