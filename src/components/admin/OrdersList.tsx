import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
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
  if (orders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">no orders yet</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {orders.map((order) => (
        <Card key={order.id} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="font-display font-semibold text-lg">
                  {order.customer_name}
                </h3>
                <Badge className={statusColors[order.status]}>
                  {order.status}
                </Badge>
                <Badge variant="outline">
                  {order.order_type === 'existing_bake' ? 'pre-made' : 'custom'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">email:</span>{' '}
                  <span className="font-medium">{order.customer_email}</span>
                </div>
                {order.customer_phone && (
                  <div>
                    <span className="text-muted-foreground">phone:</span>{' '}
                    <span className="font-medium">{order.customer_phone}</span>
                  </div>
                )}
                {order.requested_date && (
                  <div>
                    <span className="text-muted-foreground">requested date:</span>{' '}
                    <span className="font-medium">
                      {format(new Date(order.requested_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {order.pickup_date && (
                  <div>
                    <span className="text-muted-foreground">pickup date:</span>{' '}
                    <span className="font-medium">
                      {format(new Date(order.pickup_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {order.order_type === 'existing_bake' && order.bake_title && (
                <div className="text-sm">
                  <span className="text-muted-foreground">bake:</span>{' '}
                  <span className="font-medium">{order.bake_title}</span>
                  {' '}× {order.quantity}
                </div>
              )}

              {order.order_type === 'custom' && order.custom_description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">custom order:</span>{' '}
                  <p className="mt-1">{order.custom_description}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                submitted {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(order)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
