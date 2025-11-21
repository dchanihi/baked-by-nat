import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Package, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { format, subDays, isAfter } from 'date-fns';

type Order = Tables<'orders'>;

interface OrderOverviewProps {
  orders: Order[];
}

export const OrderOverview = ({ orders }: OrderOverviewProps) => {
  const stats = useMemo(() => {
    const now = new Date();
    const last7Days = subDays(now, 7);
    const last30Days = subDays(now, 30);

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
    const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    const ordersLast7Days = orders.filter(o => 
      isAfter(new Date(o.created_at), last7Days)
    ).length;

    const ordersLast30Days = orders.filter(o => 
      isAfter(new Date(o.created_at), last30Days)
    ).length;

    const customOrders = orders.filter(o => o.order_type === 'custom').length;
    const preMadeOrders = orders.filter(o => o.order_type === 'existing_bake').length;

    // Recent orders (last 5)
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders,
      ordersLast7Days,
      ordersLast30Days,
      customOrders,
      preMadeOrders,
      recentOrders,
    };
  }, [orders]);

  const statCards = [
    {
      title: 'total orders',
      value: stats.totalOrders,
      icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'pending',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      title: 'in progress',
      value: stats.inProgressOrders,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'completed',
      value: stats.completedOrders,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
  ];

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-display font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-display font-semibold mb-4">order breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">last 7 days</span>
              <span className="font-semibold">{stats.ordersLast7Days}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">last 30 days</span>
              <span className="font-semibold">{stats.ordersLast30Days}</span>
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">custom orders</span>
                <span className="font-semibold">{stats.customOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">pre-made orders</span>
                <span className="font-semibold">{stats.preMadeOrders}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-display font-semibold mb-4">status distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">pending</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${stats.totalOrders > 0 ? (stats.pendingOrders / stats.totalOrders) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-semibold w-8 text-right">{stats.pendingOrders}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">confirmed</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${stats.totalOrders > 0 ? (stats.confirmedOrders / stats.totalOrders) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-semibold w-8 text-right">{stats.confirmedOrders}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">in progress</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{
                      width: `${stats.totalOrders > 0 ? (stats.inProgressOrders / stats.totalOrders) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-semibold w-8 text-right">{stats.inProgressOrders}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">completed</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${stats.totalOrders > 0 ? (stats.completedOrders / stats.totalOrders) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-semibold w-8 text-right">{stats.completedOrders}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">cancelled</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${stats.totalOrders > 0 ? (stats.cancelledOrders / stats.totalOrders) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-semibold w-8 text-right">{stats.cancelledOrders}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-display font-semibold mb-4">recent orders</h3>
        {stats.recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">no recent orders</p>
        ) : (
          <div className="space-y-3">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.order_type === 'existing_bake' && order.bake_title
                      ? order.bake_title
                      : 'custom order'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM d')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
