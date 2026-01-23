import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, startOfYear, endOfYear } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Archive, TrendingUp, ShoppingCart, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface IncomeOverviewProps {
  onDataChange?: () => void;
  selectedPeriod: string;
  selectedLocation: string;
  onLocationsLoaded?: (locations: string[]) => void;
}

interface EventSummary {
  id: string;
  name: string;
  location: string | null;
  start_time: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  itemsSold: number;
}

interface OrderSummary {
  id: string;
  customer_name: string;
  bake_title: string | null;
  quantity: number;
  created_at: string;
}

interface YearlyArchive {
  id: string;
  year: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  orders_revenue: number;
  events_revenue: number;
  total_orders_completed: number;
  total_events_completed: number;
  total_items_sold: number;
  archived_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const IncomeOverview = ({ onDataChange, selectedPeriod, selectedLocation, onLocationsLoaded }: IncomeOverviewProps) => {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [archives, setArchives] = useState<YearlyArchive[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; eventsRevenue: number; ordersCount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);

    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));

    // Fetch all data in parallel for maximum speed
    const [
      { data: archivesData },
      { data: eventsData },
      { data: allEventItems },
      { data: allEventSales },
      { data: allEventExpenses },
      { data: ordersData },
      { data: fullArchivesData },
      { data: yearSales },
      { data: yearOrders },
    ] = await Promise.all([
      supabase.from('yearly_archives').select('year'),
      supabase.from('events').select('id, name, location, start_time').eq('status', 'completed').order('start_time', { ascending: false }),
      supabase.from('event_items').select('id, event_id'),
      supabase.from('event_sales').select('event_item_id, total_price, quantity, created_at'),
      supabase.from('event_expenses').select('event_id, amount'),
      supabase.from('orders').select('id, customer_name, bake_title, quantity, created_at').eq('status', 'completed').order('created_at', { ascending: false }),
      supabase.from('yearly_archives').select('*').order('year', { ascending: false }),
      supabase.from('event_sales').select('total_price, created_at').gte('created_at', yearStart.toISOString()).lte('created_at', yearEnd.toISOString()),
      supabase.from('orders').select('id, created_at').eq('status', 'completed').gte('created_at', yearStart.toISOString()).lte('created_at', yearEnd.toISOString()),
    ]);

    const archivedYears = archivesData?.map(a => a.year) || [];

    // Build lookup maps for O(1) access
    const itemsByEvent = new Map<string, string[]>();
    allEventItems?.forEach(item => {
      const items = itemsByEvent.get(item.event_id) || [];
      items.push(item.id);
      itemsByEvent.set(item.event_id, items);
    });

    const salesByItem = new Map<string, { total_price: number; quantity: number }[]>();
    allEventSales?.forEach(sale => {
      const sales = salesByItem.get(sale.event_item_id) || [];
      sales.push({ total_price: Number(sale.total_price), quantity: sale.quantity });
      salesByItem.set(sale.event_item_id, sales);
    });

    const expensesByEvent = new Map<string, number>();
    allEventExpenses?.forEach(exp => {
      expensesByEvent.set(exp.event_id, (expensesByEvent.get(exp.event_id) || 0) + Number(exp.amount));
    });

    if (eventsData) {
      const uniqueLocations = [...new Set(eventsData.map(e => e.location).filter(Boolean))] as string[];
      onLocationsLoaded?.(uniqueLocations);

      const eventSummaries: EventSummary[] = eventsData
        .filter(event => {
          const eventYear = parseISO(event.start_time).getFullYear();
          return !archivedYears.includes(eventYear);
        })
        .map(event => {
          const itemIds = itemsByEvent.get(event.id) || [];
          let revenue = 0;
          let itemsSold = 0;

          itemIds.forEach(itemId => {
            const sales = salesByItem.get(itemId) || [];
            sales.forEach(sale => {
              revenue += sale.total_price;
              itemsSold += sale.quantity;
            });
          });

          const expenses = expensesByEvent.get(event.id) || 0;

          return {
            id: event.id,
            name: event.name,
            location: event.location,
            start_time: event.start_time,
            revenue,
            expenses,
            netProfit: revenue - expenses,
            itemsSold,
          };
        });

      setEvents(eventSummaries);
    }

    if (ordersData) {
      const filteredOrders = ordersData.filter(order => {
        const orderYear = parseISO(order.created_at).getFullYear();
        return !archivedYears.includes(orderYear);
      });
      setOrders(filteredOrders);
    }

    if (fullArchivesData) {
      setArchives(fullArchivesData as YearlyArchive[]);
    }

    // Calculate monthly data from already-fetched data (no additional queries!)
    const now = new Date();
    const months: { month: string; eventsRevenue: number; ordersCount: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      if (monthDate.getFullYear() !== currentYear) continue;

      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const eventsRevenue = yearSales
        ?.filter(s => {
          const saleDate = parseISO(s.created_at);
          return saleDate >= monthStart && saleDate <= monthEnd;
        })
        .reduce((sum, s) => sum + Number(s.total_price), 0) || 0;

      const ordersCount = yearOrders
        ?.filter(o => {
          const orderDate = parseISO(o.created_at);
          return orderDate >= monthStart && orderDate <= monthEnd;
        }).length || 0;

      months.push({
        month: format(monthDate, 'MMM'),
        eventsRevenue,
        ordersCount,
      });
    }

    setMonthlyData(months);
    setLoading(false);
  };

  const archiveCurrentYear = async () => {
    const currentYear = new Date().getFullYear();
    
    // Check if already archived
    const existingArchive = archives.find(a => a.year === currentYear);
    if (existingArchive) {
      toast.error(`Year ${currentYear} has already been archived`);
      return;
    }

    setArchiving(true);

    try {
      const totalEventsRevenue = events.reduce((sum, e) => sum + e.revenue, 0);
      const totalEventsExpenses = events.reduce((sum, e) => sum + e.expenses, 0);
      const totalItemsSold = events.reduce((sum, e) => sum + e.itemsSold, 0);

      // Get all expenses for current year
      const yearStart = startOfYear(new Date(currentYear, 0, 1));
      const yearEnd = endOfYear(new Date(currentYear, 11, 31));

      const { data: generalExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', format(yearStart, 'yyyy-MM-dd'))
        .lte('expense_date', format(yearEnd, 'yyyy-MM-dd'));

      const totalGeneralExpenses = generalExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalExpenses = totalEventsExpenses + totalGeneralExpenses;

      const { error } = await supabase
        .from('yearly_archives')
        .insert({
          year: currentYear,
          total_revenue: totalEventsRevenue,
          total_expenses: totalExpenses,
          net_profit: totalEventsRevenue - totalExpenses,
          orders_revenue: 0, // Orders don't have prices in current schema
          events_revenue: totalEventsRevenue,
          total_orders_completed: orders.length,
          total_events_completed: events.length,
          total_items_sold: totalItemsSold,
        });

      if (error) throw error;

      toast.success(`Successfully archived ${currentYear} financial data`);
      loadData();
      onDataChange?.();
    } catch (error) {
      console.error('Error archiving year:', error);
      toast.error('Failed to archive year');
    } finally {
      setArchiving(false);
    }
  };

  const filteredEvents = events.filter(event => {
    // Filter by location first
    if (selectedLocation !== 'all' && event.location !== selectedLocation) {
      return false;
    }
    
    if (selectedPeriod === 'year') return true;
    
    const eventDate = parseISO(event.start_time);
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'month':
        return eventDate >= startOfMonth(now) && eventDate <= endOfMonth(now);
      case '3months':
        return eventDate >= subMonths(now, 3);
      case '6months':
        return eventDate >= subMonths(now, 6);
      default:
        return true;
    }
  });

  const hasActiveFilters = selectedLocation !== 'all' || selectedPeriod !== 'year';

  const totalEventsRevenue = filteredEvents.reduce((sum, e) => sum + e.revenue, 0);
  const totalEventsNetProfit = filteredEvents.reduce((sum, e) => sum + e.netProfit, 0);
  const totalItemsSold = filteredEvents.reduce((sum, e) => sum + e.itemsSold, 0);
  const completedOrdersCount = orders.length;

  const pieData = filteredEvents
    .filter(e => e.revenue > 0)
    .slice(0, 5)
    .map(e => ({
      name: e.name,
      value: e.revenue,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showArchive) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setShowArchive(false)}>
            ← Back to Income
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Yearly Archives</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Total Expenses</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Items Sold</TableHead>
                  <TableHead>Archived</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No archived years yet. Archive a year to see historical data here.
                    </TableCell>
                  </TableRow>
                ) : (
                  archives.map((archive) => (
                    <TableRow key={archive.id}>
                      <TableCell className="font-bold">{archive.year}</TableCell>
                      <TableCell className="text-right text-green-600">
                        ${Number(archive.total_revenue).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        ${Number(archive.total_expenses).toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${Number(archive.net_profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Number(archive.net_profit).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{archive.total_events_completed}</TableCell>
                      <TableCell className="text-right">{archive.total_orders_completed}</TableCell>
                      <TableCell className="text-right">{archive.total_items_sold}</TableCell>
                      <TableCell>{format(parseISO(archive.archived_at), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex gap-1 flex-wrap">
          {selectedPeriod !== 'year' && (
            <Badge variant="secondary" className="text-xs">
              {selectedPeriod === 'month' ? 'This Month' : selectedPeriod === '3months' ? 'Last 3 Months' : 'Last 6 Months'}
            </Badge>
          )}
          {selectedLocation !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {selectedLocation}
            </Badge>
          )}
        </div>
      )}

      {/* Summary Cards - Primary metrics large, secondary metrics smaller */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">${totalEventsRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${totalEventsNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalEventsNetProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Secondary metrics - smaller cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="py-2">
            <CardContent className="pt-2 pb-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Items Sold</p>
                  <p className="text-lg font-semibold">{totalItemsSold}</p>
                </div>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="py-2">
            <CardContent className="pt-2 pb-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-lg font-semibold">{completedOrdersCount}</p>
                </div>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="py-2">
            <CardContent className="pt-2 pb-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Events</p>
                  <p className="text-lg font-semibold">{filteredEvents.length}</p>
                </div>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'eventsRevenue' ? `$${value.toFixed(2)}` : value,
                        name === 'eventsRevenue' ? 'Events Revenue' : 'Orders Completed'
                      ]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="eventsRevenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Event (Top 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name.slice(0, 15)}${name.length > 15 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No revenue data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Event Revenue Details</CardTitle>
            <Button 
              variant="outline" 
              onClick={archiveCurrentYear}
              disabled={archiving || events.length === 0}
            >
              <Archive className="h-4 w-4 mr-2" />
              {archiving ? 'Archiving...' : `Archive ${new Date().getFullYear()}`}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Items Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No completed events found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{format(parseISO(event.start_time), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">{event.itemsSold}</TableCell>
                      <TableCell className="text-right text-green-600">
                        ${event.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        ${event.expenses.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${event.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${event.netProfit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Completed Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Completed Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No completed orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.slice(0, 10).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.customer_name}</TableCell>
                      <TableCell>{order.bake_title || 'Custom Order'}</TableCell>
                      <TableCell className="text-right">{order.quantity}</TableCell>
                      <TableCell>{format(parseISO(order.created_at), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                )}
                {orders.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-2 text-muted-foreground">
                      ... and {orders.length - 10} more orders
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
};

export default IncomeOverview;