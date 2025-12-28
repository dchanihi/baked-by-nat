import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, Package, TrendingUp, Calendar, MapPin, Clock, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getIconComponent } from '@/lib/categoryIcons';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface EventItem {
  id: string;
  name: string;
  cogs: number;
  price: number;
  starting_quantity: number;
  quantity_sold: number;
  category: string | null;
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
}

interface DaySummary {
  id: string;
  day_number: number;
  open_time: string;
  close_time: string | null;
  revenue: number;
  items_sold: number;
}

interface ScheduleDay {
  id: string;
  event_id: string;
  day_number: number;
  date: string;
  start_time: string;
  end_time: string | null;
}

interface EventStatisticsProps {
  event: Event;
  onBack: () => void;
}

export const EventStatistics = ({ event, onBack }: EventStatisticsProps) => {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDay[]>([]);
  const [categoryIconMap, setCategoryIconMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, [event.id]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadItems(),
      loadDaySummaries(),
      loadSchedules(),
      loadCategories(),
    ]);
    setLoading(false);
  };

  const loadItems = async () => {
    const { data } = await supabase
      .from('event_items')
      .select('*')
      .eq('event_id', event.id)
      .order('name');
    if (data) setItems(data);
  };

  const loadDaySummaries = async () => {
    const { data } = await supabase
      .from('event_day_summaries')
      .select('*')
      .eq('event_id', event.id)
      .order('day_number');
    if (data) setDaySummaries(data);
  };

  const loadSchedules = async () => {
    const { data } = await supabase
      .from('event_schedules')
      .select('*')
      .eq('event_id', event.id)
      .order('day_number');
    if (data) setSchedules(data);
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('name, icon');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(cat => {
        if (cat.icon) map[cat.name] = cat.icon;
      });
      setCategoryIconMap(map);
    }
  };

  const getCategoryIcon = (categoryName: string | null) => {
    if (!categoryName) return getIconComponent(null);
    const iconName = categoryIconMap[categoryName];
    return getIconComponent(iconName || null);
  };

  // Calculate totals from day summaries
  const totalRevenue = daySummaries.reduce((sum, d) => sum + d.revenue, 0);
  const totalItemsSold = daySummaries.reduce((sum, d) => sum + d.items_sold, 0);
  const totalDays = daySummaries.length;
  const totalInventory = items.reduce((sum, item) => sum + item.starting_quantity, 0);
  const totalCogs = items.reduce((sum, item) => sum + (item.cogs * item.quantity_sold), 0);
  const grossProfit = totalRevenue - totalCogs;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const avgRevenuePerDay = totalDays > 0 ? totalRevenue / totalDays : 0;

  // Get unique categories from items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{event.name}</h1>
              <Badge variant="outline" className="text-green-600 border-green-600">
                Completed
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(event.start_time), 'MMM d, yyyy')}
                {event.end_time && ` - ${format(new Date(event.end_time), 'MMM d, yyyy')}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
          <TabsTrigger value="items">Item Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
            </div>

            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Package className="w-4 h-4" />
                <span className="text-sm">Items Sold</span>
              </div>
              <p className="text-2xl font-bold">{totalItemsSold}</p>
              <p className="text-xs text-muted-foreground">of {totalInventory} ({totalInventory > 0 ? Math.round(totalItemsSold / totalInventory * 100) : 0}%)</p>
            </div>

            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Gross Profit</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">${grossProfit.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{profitMargin.toFixed(1)}% margin</p>
            </div>

            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Event Duration</span>
              </div>
              <p className="text-2xl font-bold">{totalDays} days</p>
              <p className="text-xs text-muted-foreground">${avgRevenuePerDay.toFixed(2)}/day avg</p>
            </div>
          </div>

          {/* Revenue Chart */}
          {daySummaries.length > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-600" />
                Revenue by Day
              </h4>
              <div className="relative h-40">
                {(() => {
                  const maxRevenue = Math.max(...daySummaries.map(d => d.revenue), 1);
                  const minRevenue = Math.min(...daySummaries.map(d => d.revenue));
                  const range = maxRevenue - minRevenue || 1;

                  const points = daySummaries.map((d, i) => {
                    const x = daySummaries.length === 1 ? 50 : (i / (daySummaries.length - 1)) * 100;
                    const y = 100 - ((d.revenue - minRevenue) / range) * 80 - 10;
                    return { x, y, ...d };
                  });

                  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPath = `${linePath} L ${points[points.length - 1].x} 95 L ${points[0].x} 95 Z`;

                  return (
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.3" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.3" />
                      <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.3" />
                      <path d={areaPath} fill="url(#greenGradientStats)" opacity="0.3" />
                      <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                      {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#22c55e" stroke="white" strokeWidth="0.5" />
                      ))}
                      <defs>
                        <linearGradient id="greenGradientStats" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  );
                })()}

                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                  {daySummaries.map((d, i) => (
                    <div key={i} className="text-center group relative">
                      <span className="text-[10px] text-muted-foreground">D{d.day_number}</span>
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border rounded-md px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-md">
                        <p className="font-medium text-green-600">${d.revenue.toFixed(2)}</p>
                        <p className="text-muted-foreground">{d.items_sold} items</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {categories.length > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <h4 className="text-sm font-medium mb-4">Sales by Category</h4>
              <div className="grid gap-3">
                {categories.map(cat => {
                  const catItems = items.filter(i => i.category === cat);
                  const catRevenue = catItems.reduce((sum, i) => sum + (i.price * i.quantity_sold), 0);
                  const catSold = catItems.reduce((sum, i) => sum + i.quantity_sold, 0);
                  const percent = totalRevenue > 0 ? (catRevenue / totalRevenue) * 100 : 0;
                  const CategoryIcon = getCategoryIcon(cat);

                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                        <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{cat}</span>
                          <span className="text-muted-foreground">${catRevenue.toFixed(2)} ({catSold} sold)</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.5 }}
                            className="bg-pink-soft h-2 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Daily Breakdown Tab */}
        <TabsContent value="daily" className="space-y-4">
          {daySummaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No daily summaries available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {daySummaries.map((day) => {
                const schedule = schedules.find(s => s.day_number === day.day_number);
                const dayDuration = day.close_time
                  ? Math.round((new Date(day.close_time).getTime() - new Date(day.open_time).getTime()) / (1000 * 60 * 60))
                  : 0;
                const revenuePercent = totalRevenue > 0 ? (day.revenue / totalRevenue) * 100 : 0;

                return (
                  <div key={day.id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{day.day_number}</span>
                        </div>
                        <div>
                          <p className="font-medium">Day {day.day_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {schedule && format(new Date(schedule.date), 'EEEE, MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">${day.revenue.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{revenuePercent.toFixed(1)}% of total</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-lg font-semibold">{day.items_sold}</p>
                        <p className="text-xs text-muted-foreground">Items Sold</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">{dayDuration}h</p>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">
                          ${day.items_sold > 0 ? (day.revenue / day.items_sold).toFixed(2) : '0.00'}
                        </p>
                        <p className="text-xs text-muted-foreground">Avg Sale</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {format(new Date(day.open_time), 'h:mm a')} – {day.close_time ? format(new Date(day.close_time), 'h:mm a') : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Item Performance Tab */}
        <TabsContent value="items" className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No items in this event.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-3 font-medium">Item</th>
                      <th className="text-center p-3 font-medium">Sold</th>
                      <th className="text-center p-3 font-medium">Remaining</th>
                      <th className="text-right p-3 font-medium">Revenue</th>
                      <th className="text-right p-3 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .sort((a, b) => (b.price * b.quantity_sold) - (a.price * a.quantity_sold))
                      .map((item) => {
                        const revenue = item.price * item.quantity_sold;
                        const profit = revenue - (item.cogs * item.quantity_sold);
                        const remaining = item.starting_quantity - item.quantity_sold;
                        const soldPercent = item.starting_quantity > 0
                          ? (item.quantity_sold / item.starting_quantity) * 100
                          : 0;
                        const CategoryIcon = getCategoryIcon(item.category);

                        return (
                          <tr key={item.id} className="border-t hover:bg-secondary/50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center">
                                  <CategoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-medium">{item.quantity_sold}</span>
                              <span className="text-muted-foreground text-xs ml-1">({soldPercent.toFixed(0)}%)</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={remaining === 0 ? 'text-green-600 font-medium' : ''}>{remaining}</span>
                            </td>
                            <td className="p-3 text-right font-medium">${revenue.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ${profit.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="bg-secondary/50 font-medium">
                    <tr>
                      <td className="p-3">Totals</td>
                      <td className="p-3 text-center">{totalItemsSold}</td>
                      <td className="p-3 text-center">{totalInventory - totalItemsSold}</td>
                      <td className="p-3 text-right">${totalRevenue.toFixed(2)}</td>
                      <td className="p-3 text-right text-green-600">${grossProfit.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
