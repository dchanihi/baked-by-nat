import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, PieChart, Calendar, Filter, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import IncomeOverview from '@/components/admin/financials/IncomeOverview';
import ExpensesManager from '@/components/admin/financials/ExpensesManager';

const Financials = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadSummaryData();
    }
  }, [isAdmin, selectedPeriod, selectedLocation]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      navigate('/');
      return;
    }

    setIsAdmin(true);
    await loadSummaryData();
    setLoading(false);
  };

  const loadSummaryData = async () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get archived years to exclude
    const { data: archivesData } = await supabase
      .from('yearly_archives')
      .select('year');
    
    const archivedYears = archivesData?.map(a => a.year) || [];

    // Load all completed events (we'll filter by location and period)
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, location, start_time')
      .eq('status', 'completed');

    // Filter events based on archived years, location, and period
    const filteredEvents = eventsData?.filter(event => {
      const eventDate = parseISO(event.start_time);
      const eventYear = eventDate.getFullYear();
      
      // Skip archived years
      if (archivedYears.includes(eventYear)) return false;
      
      // Filter by location
      if (selectedLocation !== 'all' && event.location !== selectedLocation) return false;
      
      // Filter by period
      if (selectedPeriod !== 'year') {
        switch (selectedPeriod) {
          case 'month':
            if (eventDate < startOfMonth(now) || eventDate > endOfMonth(now)) return false;
            break;
          case '3months':
            if (eventDate < subMonths(now, 3)) return false;
            break;
          case '6months':
            if (eventDate < subMonths(now, 6)) return false;
            break;
        }
      }
      
      return true;
    }) || [];

    const filteredEventIds = filteredEvents.map(e => e.id);

    // Get items for filtered events
    let totalRevenue = 0;
    let totalEventExpenses = 0;

    if (filteredEventIds.length > 0) {
      const { data: items } = await supabase
        .from('event_items')
        .select('id')
        .in('event_id', filteredEventIds);

      if (items && items.length > 0) {
        const itemIds = items.map(i => i.id);
        
        const { data: salesData } = await supabase
          .from('event_sales')
          .select('total_price')
          .in('event_item_id', itemIds);

        totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;
      }

      // Get event expenses for filtered events
      const { data: eventExpensesData } = await supabase
        .from('event_expenses')
        .select('amount')
        .in('event_id', filteredEventIds);

      totalEventExpenses = eventExpensesData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
    }

    // Load general expenses (filter by period if applicable)
    let expensesQuery = supabase.from('expenses').select('amount, expense_date');
    
    if (selectedPeriod !== 'year') {
      let periodStart: Date;
      switch (selectedPeriod) {
        case 'month':
          periodStart = startOfMonth(now);
          break;
        case '3months':
          periodStart = subMonths(now, 3);
          break;
        case '6months':
          periodStart = subMonths(now, 6);
          break;
        default:
          periodStart = new Date(0);
      }
      expensesQuery = expensesQuery.gte('expense_date', format(periodStart, 'yyyy-MM-dd'));
    }

    const { data: expensesData } = await expensesQuery;

    // Filter out archived years from expenses
    const filteredExpenses = expensesData?.filter(exp => {
      if (!exp.expense_date) return true;
      const expYear = new Date(exp.expense_date).getFullYear();
      return !archivedYears.includes(expYear);
    }) || [];

    const totalGeneralExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const totalExpenses = totalEventExpenses + totalGeneralExpenses;

    // Monthly data (current month only, respecting location filter)
    let monthlyRevenue = 0;
    let monthlyEventExpenses = 0;

    const monthFilteredEvents = filteredEvents.filter(event => {
      const eventDate = parseISO(event.start_time);
      return eventDate >= monthStart && eventDate <= monthEnd;
    });

    const monthFilteredEventIds = monthFilteredEvents.map(e => e.id);

    if (monthFilteredEventIds.length > 0) {
      const { data: monthItems } = await supabase
        .from('event_items')
        .select('id')
        .in('event_id', monthFilteredEventIds);

      if (monthItems && monthItems.length > 0) {
        const monthItemIds = monthItems.map(i => i.id);
        
        const { data: monthlySales } = await supabase
          .from('event_sales')
          .select('total_price')
          .in('event_item_id', monthItemIds);

        monthlyRevenue = monthlySales?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;
      }

      const { data: monthEventExpenses } = await supabase
        .from('event_expenses')
        .select('amount')
        .in('event_id', monthFilteredEventIds);

      monthlyEventExpenses = monthEventExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
    }

    const { data: monthlyGeneralExp } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('expense_date', format(monthEnd, 'yyyy-MM-dd'));

    const monthlyGeneralExpenses = monthlyGeneralExp?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
    const monthlyExpenses = monthlyEventExpenses + monthlyGeneralExpenses;

    setSummaryData({
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      monthlyRevenue,
      monthlyExpenses,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Financials</h1>
          <p className="text-muted-foreground mt-1">Track income, expenses, and profitability</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${summaryData.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${summaryData.totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summaryData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${summaryData.netProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryData.monthlyRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryData.monthlyExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="income" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="income">Income Overview</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
            </TabsList>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {(selectedLocation !== 'all' || selectedPeriod !== 'year') && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {(selectedLocation !== 'all' ? 1 : 0) + (selectedPeriod !== 'year' ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Period</label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">All Unarchived</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="3months">Last 3 Months</SelectItem>
                        <SelectItem value="6months">Last 6 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(selectedLocation !== 'all' || selectedPeriod !== 'year') && (
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => {
                      setSelectedLocation('all');
                      setSelectedPeriod('year');
                    }}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <TabsContent value="income">
            <IncomeOverview 
              onDataChange={loadSummaryData} 
              selectedPeriod={selectedPeriod}
              selectedLocation={selectedLocation}
              onLocationsLoaded={setLocations}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesManager onDataChange={loadSummaryData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Financials;
