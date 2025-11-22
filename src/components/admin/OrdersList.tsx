import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;

interface OrdersListProps {
  orders: Order[];
  onView: (order: Order) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const OrdersList = ({ orders, onView }: OrdersListProps) => {
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (orders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">no orders yet</p>
      </Card>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Date Info</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                <div className="space-y-1">
                  <div className="font-display">{order.customer_name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{order.customer_email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => copyToClipboard(order.customer_email, 'Email')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {order.customer_phone && (
                    <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[order.status]}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {order.order_type === 'existing_bake' ? 'pre-made' : 'custom'}
                </Badge>
              </TableCell>
              <TableCell>
                {order.order_type === 'existing_bake' && order.bake_title ? (
                  <div className="text-sm">
                    <div className="font-medium">{order.bake_title}</div>
                    <div className="text-muted-foreground">Qty: {order.quantity}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground max-w-xs truncate">
                    {order.custom_description || 'Custom order'}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm space-y-1">
                  {order.requested_date && (
                    <div className="text-muted-foreground">
                      Need: {format(new Date(order.requested_date), 'MMM d')}
                    </div>
                  )}
                  {order.pickup_date && (
                    <div className="text-muted-foreground">
                      Pickup: {format(new Date(order.pickup_date), 'MMM d')}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(order.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(order)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
