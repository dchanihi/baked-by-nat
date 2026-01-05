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
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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

    // Load event sales for total revenue
    const { data: salesData } = await supabase
      .from('event_sales')
      .select('total_price');

    const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;

    // Load all expenses
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('amount');

    const { data: eventExpensesData } = await supabase
      .from('event_expenses')
      .select('amount');

    const totalExpenses = 
      (expensesData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0) +
      (eventExpensesData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0);

    // Monthly data
    const { data: monthlySales } = await supabase
      .from('event_sales')
      .select('total_price, created_at')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    const monthlyRevenue = monthlySales?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;

    const { data: monthlyExp } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('expense_date', format(monthEnd, 'yyyy-MM-dd'));

    const monthlyExpenses = monthlyExp?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

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
