"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Users, 
  Clock,
  Download,
  Filter,
  Calendar,
  Group,
  User,
  BarChart3,
  Activity,
  Target,
  AlertCircle
} from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"
import { formatCurrency } from "@/lib/utils"
import { ComponentLoading } from "@/components/ui/loading"

// Filter types
interface AnalyticsFilters {
  mode: 'personal' | 'group' | 'all'
  time: {
    range: 'THIS_MONTH' | 'LAST_3M' | 'YTD' | 'CUSTOM'
    from?: string
    to?: string
  }
  groupIds?: string[]
  categories?: string[]
  paymentMethods?: string[]
  currencies?: string[]
  status?: string[]
  createdBy?: string[]
  paidBy?: string[]
}

// Default filters
const defaultFilters: AnalyticsFilters = {
  mode: 'all',
  time: { range: 'THIS_MONTH' },
  categories: [],
  paymentMethods: [],
  currencies: [],
  status: ['active', 'settled'],
  createdBy: [],
  paidBy: []
}

export function AnalyticsDashboard() {
  const { currency: userCurrency } = useCurrency()
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Responsive state for mobile
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch KPIs data
  const { data: kpisData, isLoading: kpisLoading } = useQuery({
    queryKey: ['analytics-kpis', filters, userCurrency],
    queryFn: () => analyticsAPI.getKPIs({ ...filters, baseCurrency: userCurrency }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch spend over time data
  const { data: spendOverTimeData, isLoading: spendOverTimeLoading } = useQuery({
    queryKey: ['analytics-spend-over-time', filters, userCurrency],
    queryFn: () => analyticsAPI.getSpendOverTime({ ...filters, baseCurrency: userCurrency }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch category breakdown data
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['analytics-category-breakdown', filters, userCurrency],
    queryFn: () => analyticsAPI.getCategoryBreakdown({ ...filters, baseCurrency: userCurrency }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch top partners data
  const { data: partnersData, isLoading: partnersLoading } = useQuery({
    queryKey: ['analytics-top-partners', filters, userCurrency],
    queryFn: () => analyticsAPI.getTopPartners({ ...filters, baseCurrency: userCurrency }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch aging data
  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ['analytics-aging', filters, userCurrency],
    queryFn: () => analyticsAPI.getAgingBuckets({ ...filters, baseCurrency: userCurrency }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch ledger data
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['analytics-ledger', filters, userCurrency],
    queryFn: () => analyticsAPI.getLedger({ ...filters, baseCurrency: userCurrency }),
    staleTime: 5 * 60 * 1000,
  })

  const kpis = kpisData?.data || {}
  const baseCurrency = userCurrency
  

  
  // Ensure data is properly structured for chart components
  const safeSpendOverTimeData = Array.isArray(spendOverTimeData?.data) ? spendOverTimeData.data : []
  const safeCategoryData = Array.isArray(categoryData?.data) ? categoryData.data : []
  const safePartnersData = {
    topUsers: Array.isArray(partnersData?.data?.topUsers) ? partnersData.data.topUsers : [],
    topGroups: Array.isArray(partnersData?.data?.topGroups) ? partnersData.data.topGroups : []
  }
  const safeAgingData = agingData?.data && typeof agingData.data === 'object' ? agingData.data : {}
  const safeLedgerData = Array.isArray(ledgerData?.data) ? ledgerData.data : []

  // Handle filter changes
  const updateFilter = (key: keyof AnalyticsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Handle CSV export
  const handleCSVExport = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/analytics/export/csv?${new URLSearchParams(filters as any)}`
    window.open(url, '_blank')
  }
  


  if (kpisLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ComponentLoading 
          text="Loading Analytics" 
          subtitle="Please wait while we load your financial insights..."
        />
      </div>
    )
  }
  


  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* Filter Bar */}
      <Card>
        <CardHeader className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle className="text-responsive-lg">Filters</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={handleCSVExport} className="touch-friendly">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {/* Mode Filter */}
            <div className="space-y-2">
              <label className="text-responsive-sm font-medium">Mode</label>
              <Select 
                value={filters.mode} 
                onValueChange={(value: 'personal' | 'group' | 'all') => updateFilter('mode', value)}
              >
                <SelectTrigger className="touch-friendly">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Only</SelectItem>
                  <SelectItem value="group">Group Only</SelectItem>
                  <SelectItem value="all">All Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range Filter */}
            <div className="space-y-2">
              <label className="text-responsive-sm font-medium">Time Range</label>
              <Select 
                value={filters.time.range} 
                onValueChange={(value: 'THIS_MONTH' | 'LAST_3M' | 'YTD' | 'CUSTOM') => 
                  updateFilter('time', { ...filters.time, range: value })
                }
              >
                <SelectTrigger className="touch-friendly">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THIS_MONTH">This Month</SelectItem>
                  <SelectItem value="LAST_3M">Last 3 Months</SelectItem>
                  <SelectItem value="YTD">Year to Date</SelectItem>
                  <SelectItem value="CUSTOM">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom Date Range Inputs */}
              {filters.time.range === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-responsive-xs text-muted-foreground">From</label>
                    <input
                      type="date"
                      value={filters.time.from || ''}
                      onChange={(e) => updateFilter('time', { ...filters.time, from: e.target.value })}
                      className="w-full px-2 py-1 text-responsive-xs border rounded-md touch-friendly"
                    />
                  </div>
                  <div>
                    <label className="text-responsive-xs text-muted-foreground">To</label>
                    <input
                      type="date"
                      value={filters.time.to || ''}
                      onChange={(e) => updateFilter('time', { ...filters.time, to: e.target.value })}
                      className="w-full px-2 py-1 text-responsive-xs border rounded-md touch-friendly"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categories</label>
              <Select 
                value={filters.categories?.join(',') || 'all'} 
                onValueChange={(value) => updateFilter('categories', value === 'all' ? [] : value.split(','))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={filters.status?.join(',') || 'all'} 
                onValueChange={(value) => updateFilter('status', value === 'all' ? ['active', 'settled'] : value.split(','))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {formatCurrency((kpis.totalSpendBaseCents || 0) / 100, baseCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filters.time.range === 'THIS_MONTH' ? 'This month' : `This ${filters.time.range.toLowerCase()}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className={`text-xl md:text-2xl font-bold ${(kpis.netBalanceBaseCents || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(kpis.netBalanceBaseCents || 0) / 100, baseCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(kpis.netBalanceBaseCents || 0) >= 0 ? 'You are owed' : 'You owe'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {(kpis.expensesCount?.personal || 0) + (kpis.expensesCount?.group || 0)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>Personal: {kpis.expensesCount?.personal || 0}</span>
              <span>Group: {kpis.expensesCount?.group || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Personal vs Group Expense Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Personal Expenses</CardTitle>
            <User className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-400">
              {formatCurrency((kpis.totalSpendBaseCents?.personal || 0) / 100, baseCurrency)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {kpis.expensesCount?.personal || 0} individual expense{(kpis.expensesCount?.personal || 0) !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Group Expenses</CardTitle>
            <Group className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-400">
              {formatCurrency((kpis.totalSpendBaseCents?.group || 0) / 100, baseCurrency)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {kpis.expensesCount?.group || 0} shared expense{(kpis.expensesCount?.group || 0) !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Avg Settlement</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {kpis.avgSettlementDays || 0} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average time to settle
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="spending" className="text-xs">Spending</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs">Categories</TabsTrigger>
          <TabsTrigger value="partners" className="text-xs">Partners</TabsTrigger>
          <TabsTrigger value="aging" className="text-xs">Aging</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <Card>
              <CardHeader className="p-3 md:p-4">
                <CardTitle className="text-base md:text-lg">Spending Over Time</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Personal vs Group spending trends
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-4">
                {spendOverTimeLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <ComponentLoading 
                      text="Loading Spending Over Time" 
                      subtitle="Please wait while we load your spending trends..."
                    />
                  </div>
                ) : (
                  <div className="chart-responsive chart-mobile">
                    <SpendingOverTimeChart data={safeSpendOverTimeData} baseCurrency={baseCurrency} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>
                  Breakdown by expense category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryLoading ? (
                  <div className="min-h-[240px] flex items-center justify-center">
                    <ComponentLoading 
                      text="Loading Category Breakdown" 
                      subtitle="Please wait while we load your category breakdown..."
                    />
                  </div>
                ) : (
                  <CategoryBreakdownChart data={safeCategoryData} baseCurrency={baseCurrency} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spending Comparison</CardTitle>
                <CardDescription>
                  Personal vs Group spending breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryLoading ? (
                  <div className="min-h-[240px] flex items-center justify-center">
                    <ComponentLoading 
                      text="Loading Spending Comparison" 
                      subtitle="Please wait while we load your spending comparison..."
                    />
                  </div>
                ) : (
                  <SpendingComparisonChart 
                    personalData={safeSpendOverTimeData} 
                    categoryData={safeCategoryData} 
                    baseCurrency={baseCurrency} 
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Personal Expense Tracking Section */}
          <Card>
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-base md:text-lg">Personal Expense Tracking</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Detailed breakdown of your individual expenses vs group expenses
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Expenses Summary */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-400" />
                    <h4 className="font-medium text-white">Personal Expenses</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Spent:</span>
                      <span className="font-semibold text-blue-400">
                        {formatCurrency((kpis.totalSpendBaseCents?.personal || 0) / 100, baseCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Count:</span>
                      <span className="font-semibold text-white">
                        {kpis.expensesCount?.personal || 0} expense{(kpis.expensesCount?.personal || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Average:</span>
                      <span className="font-semibold text-white">
                        {kpis.expensesCount?.personal ? 
                          formatCurrency(((kpis.totalSpendBaseCents?.personal || 0) / (kpis.expensesCount?.personal || 1)) / 100, baseCurrency) 
                          : formatCurrency(0, baseCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group Expenses Summary */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Group className="h-5 w-5 text-green-400" />
                    <h4 className="font-medium text-white">Group Expenses</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Spent:</span>
                      <span className="font-semibold text-green-400">
                        {formatCurrency((kpis.totalSpendBaseCents?.group || 0) / 100, baseCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Count:</span>
                      <span className="font-semibold text-white">
                        {kpis.expensesCount?.group || 0} expense{(kpis.expensesCount?.group || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Average:</span>
                      <span className="font-semibold text-white">
                        {kpis.expensesCount?.group ? 
                          formatCurrency(((kpis.totalSpendBaseCents?.group || 0) / (kpis.expensesCount?.group || 1)) / 100, baseCurrency) 
                          : formatCurrency(0, baseCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spending Distribution Chart */}
              {((kpis.totalSpendBaseCents?.personal || 0) + (kpis.totalSpendBaseCents?.group || 0)) > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h5 className="text-sm font-medium text-white mb-3">Spending Distribution</h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">Personal</span>
                      </div>
                      <span className="text-sm font-medium text-blue-400">
                        {Math.round(((kpis.totalSpendBaseCents?.personal || 0) / ((kpis.totalSpendBaseCents?.personal || 0) + (kpis.totalSpendBaseCents?.group || 0))) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">Group</span>
                      </div>
                      <span className="text-sm font-medium text-green-400">
                        {Math.round(((kpis.totalSpendBaseCents?.group || 0) / ((kpis.totalSpendBaseCents?.personal || 0) + (kpis.totalSpendBaseCents?.group || 0))) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending Trends</CardTitle>
              <CardDescription>
                Detailed spending analysis over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {spendOverTimeLoading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <ComponentLoading 
                    text="Loading Spending Trends" 
                    subtitle="Please wait while we load your spending trends..."
                  />
                </div>
              ) : (
                                  <SpendingOverTimeChart data={safeSpendOverTimeData} baseCurrency={baseCurrency} detailed />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of spending by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryLoading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <ComponentLoading 
                    text="Loading Category Analysis" 
                    subtitle="Please wait while we load your category analysis..."
                  />
                </div>
              ) : (
                                  <CategoryBreakdownChart data={safeCategoryData} baseCurrency={baseCurrency} detailed />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Users</CardTitle>
                <CardDescription>
                  Users you spend most with
                </CardDescription>
              </CardHeader>
              <CardContent>
                {partnersLoading ? (
                  <div className="min-h-[240px] flex items-center justify-center">
                    <ComponentLoading 
                      text="Loading Top Users" 
                      subtitle="Please wait while we load your top users..."
                    />
                  </div>
                ) : (
                  <TopPartnersList data={safePartnersData.topUsers} baseCurrency={baseCurrency} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Groups</CardTitle>
                <CardDescription>
                  Groups with highest expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {partnersLoading ? (
                  <div className="min-h-[240px] flex items-center justify-center">
                    <ComponentLoading 
                      text="Loading Top Groups" 
                      subtitle="Please wait while we load your top groups..."
                    />
                  </div>
                ) : (
                  <TopGroupsList data={safePartnersData.topGroups} baseCurrency={baseCurrency} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

                <TabsContent value="aging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unsettled Balances Aging</CardTitle>
              <CardDescription>
                Breakdown of unsettled expenses by age
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agingLoading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <ComponentLoading 
                    text="Loading Aging Buckets" 
                    subtitle="Please wait while we load your aging buckets..."
                  />
                </div>
              ) : (
                <AgingBucketsChart data={safeAgingData} baseCurrency={baseCurrency} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>
                  Compare spending patterns month over month
                </CardDescription>
              </CardHeader>
              <CardContent>
                {spendOverTimeLoading ? (
                  <div className="min-h-[300px] flex items-center justify-center">
                    <ComponentLoading 
                      text="Loading Monthly Trends" 
                      subtitle="Please wait while we load your monthly trends..."
                    />
                  </div>
                ) : (
                  <MonthlyTrendsChart data={safeSpendOverTimeData} baseCurrency={baseCurrency} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Trends</CardTitle>
                <CardDescription>
                  See how category spending changes over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryLoading ? (
                  <div className="min-h-[300px] flex items-center justify-center">
                    <ComponentLoading 
                      text="Loading Category Trends" 
                      subtitle="Please wait while we load your category trends..."
                    />
                  </div>
                ) : (
                  <CategoryTrendsChart data={safeCategoryData} baseCurrency={baseCurrency} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expense Ledger</CardTitle>
                  <CardDescription>
                    Detailed list of all expenses matching your filters
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleCSVExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ledgerLoading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <ComponentLoading 
                    text="Loading Ledger" 
                    subtitle="Please wait while we load your expense ledger..."
                  />
                </div>
              ) : (
                <LedgerTable data={safeLedgerData} baseCurrency={baseCurrency} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Chart Components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

// Type definitions for chart components
interface ChartDataItem {
  date: string
  personal: { amountCents: number; baseCents: number; count: number }
  group: { amountCents: number; baseCents: number; count: number }
}

interface CategoryDataItem {
  _id: string
  totalCents: number
  totalBaseCents: number
  count: number
  personal: number
  group: number
}

interface PartnerDataItem {
  _id: string
  totalCents: number
  totalBaseCents: number
  count: number
  name: string
  avatar?: string
}

interface GroupDataItem {
  _id: string
  totalCents: number
  totalBaseCents: number
  count: number
  name: string
  memberCount: number
}

interface TooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

interface ChartComponentProps {
  data: any[] | undefined | null
  baseCurrency: string
  detailed?: boolean
}

function SpendingOverTimeChart({ data, baseCurrency, detailed = false }: { 
  data: ChartDataItem[] | undefined | null
  baseCurrency: string
  detailed?: boolean 
}) {
  // Ensure data is an array and has the expected structure
  const safeData = Array.isArray(data) ? data : []
  
  if (safeData.length === 0) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground bg-gray-50/5 rounded-md border border-gray-100/10">
        <div className="text-center p-4">
          <p>No spending data available for the selected filters</p>
          <p className="text-xs mt-1">Try adjusting your filters or time range</p>
        </div>
      </div>
    )
  }

  // Calculate totals safely
  const personalTotal = safeData.reduce((sum, item) => {
    const personalAmount = item?.personal?.baseCents || 0
    return sum + (typeof personalAmount === 'number' ? personalAmount : 0)
  }, 0)
  
  const groupTotal = safeData.reduce((sum, item) => {
    const groupAmount = item?.group?.baseCents || 0
    return sum + (typeof groupAmount === 'number' ? groupAmount : 0)
  }, 0)

  // Prepare chart data
  const chartData = safeData.map(item => ({
    date: item.date,
    personal: (item.personal?.baseCents || 0) / 100,
    group: (item.group?.baseCents || 0) / 100,
    total: ((item.personal?.baseCents || 0) + (item.group?.baseCents || 0)) / 100
  }))

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--card)] p-3 border border-gray-100/10 rounded-lg shadow-lg text-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, baseCurrency)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-[var(--card)] border border-gray-100/10 rounded-lg">
          <div className="text-lg md:text-xl font-bold text-green-600">
            {formatCurrency(personalTotal / 100, baseCurrency)}
          </div>
          <div className="text-xs md:text-sm text-muted-foreground mt-1">Personal</div>
        </div>
        <div className="p-3 bg-[var(--card)] border border-gray-100/10 rounded-lg">
          <div className="text-lg md:text-xl font-bold text-blue-600">
            {formatCurrency(groupTotal / 100, baseCurrency)}
          </div>
          <div className="text-xs md:text-sm text-muted-foreground mt-1">Group</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px] bg-[var(--card)] p-2 rounded-lg border border-gray-100/10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="personal" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Personal"
            />
            <Line 
              type="monotone" 
              dataKey="group" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Group"
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#8b5cf6" 
              strokeWidth={3}
              name="Total"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CategoryBreakdownChart({ data, baseCurrency, detailed = false }: { 
  data: CategoryDataItem[] | undefined | null
  baseCurrency: string
  detailed?: boolean 
}) {
  // Ensure data is an array and has the expected structure
  const safeData = Array.isArray(data) ? data : []
  
  if (safeData.length === 0) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground bg-gray-50/5 rounded-md border border-gray-100/10">
        <div className="text-center p-4">
          <p>No category data available for the selected filters</p>
          <p className="text-xs mt-1">Try adjusting your filters or time range</p>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const chartData = safeData.slice(0, 8).map((category, index) => ({
    name: category._id,
    value: (category.totalBaseCents || 0) / 100,
    count: category.count || 0,
    color: [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ][index % 8]
  }))

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-[var(--card)] p-3 border border-gray-100/10 rounded-lg shadow-lg text-sm">
          <p className="font-medium capitalize">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value, baseCurrency)}</p>
          <p className="text-xs text-muted-foreground">{data.count} expenses</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-[300px] bg-[var(--card)] p-2 rounded-lg border border-gray-100/10">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed breakdown */}
      {detailed && (
        <div className="space-y-2">
          {safeData.slice(0, 10).map((category, index) => (
            <div key={category._id} className="flex items-center justify-between p-2 bg-[var(--card)] border border-gray-100/10 rounded-md">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: chartData[index]?.color || '#6b7280' }}
                />
                <span className="capitalize">{category._id}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency((category.totalBaseCents || 0) / 100, baseCurrency)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {category.count || 0} expenses
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TopPartnersList({ data, baseCurrency }: ChartComponentProps) {
  // Ensure data is an array and has the expected structure
  const safeData = Array.isArray(data) ? data : []
  
  if (safeData.length === 0) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground bg-gray-50/5 rounded-md border border-gray-100/10">
        <div className="text-center p-4">
          <p>No partner data available</p>
          <p className="text-xs mt-1">Try adjusting your filters or time range</p>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const chartData = safeData.slice(0, 8).map((partner, index) => ({
    name: partner.name || 'Unknown',
    amount: (partner.totalBaseCents || 0) / 100,
    count: partner.count || 0,
    color: [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ][index % 8]
  }))

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-[var(--card)] p-3 border border-gray-100/10 rounded-lg shadow-lg text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-sm">{formatCurrency(data.amount, baseCurrency)}</p>
          <p className="text-xs text-muted-foreground">{data.count} expenses</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-[300px] bg-[var(--card)] p-2 rounded-lg border border-gray-100/10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="amount" 
              fill="#8884d8"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed list */}
      <div className="space-y-3">
        {safeData.map((partner, index) => (
          <div key={partner._id} className="flex items-center justify-between p-3 bg-[var(--card)] border border-gray-100/10 rounded-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{partner.name || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground">{partner.count || 0} expenses</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                {formatCurrency((partner.totalBaseCents || 0) / 100, baseCurrency)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopGroupsList({ data, baseCurrency }: ChartComponentProps) {
  // Ensure data is an array and has the expected structure
  const safeData = Array.isArray(data) ? data : []
  
  if (safeData.length === 0) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground bg-gray-50/5 rounded-md border border-gray-100/10">
        <div className="text-center p-4">
          <p>No group data available</p>
          <p className="text-xs mt-1">Try adjusting your filters or time range</p>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const chartData = safeData.slice(0, 8).map((group, index) => ({
    name: group.name || 'Unknown Group',
    amount: (group.totalBaseCents || 0) / 100,
    count: group.count || 0,
    members: group.memberCount || 0,
    color: [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ][index % 8]
  }))

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-[var(--card)] p-3 border border-gray-100/10 rounded-lg shadow-lg text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-sm">{formatCurrency(data.amount, baseCurrency)}</p>
          <p className="text-xs text-muted-foreground">{data.count} expenses</p>
          <p className="text-xs text-muted-foreground">{data.members} members</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-[300px] bg-[var(--card)] p-2 rounded-lg border border-gray-100/10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="amount" 
              fill="#8884d8"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed list */}
      <div className="space-y-3">
        {safeData.map((group, index) => (
          <div key={group._id} className="flex items-center justify-between p-3 bg-[var(--card)] border border-gray-100/10 rounded-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{group.name || 'Unknown Group'}</div>
                <div className="text-xs text-muted-foreground">{group.memberCount || 0} members</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                {formatCurrency((group.totalBaseCents || 0) / 100, baseCurrency)}
              </div>
              <div className="text-xs text-muted-foreground">{group.count || 0} expenses</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AgingBucketsChart({ data, baseCurrency }: { data: any; baseCurrency: string }) {
  // Ensure data is an object and has the expected structure
  const safeData = data && typeof data === 'object' ? data : {}
  
  if (Object.keys(safeData).length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-sm text-muted-foreground bg-gray-50/5 rounded-md border border-gray-100/10">
        <div className="text-center p-4">
          <p>No aging data available</p>
          <p className="text-xs mt-1">Try adjusting your filters or time range</p>
        </div>
      </div>
    )
  }

  const buckets = [
    { key: '0-7', label: '0-7 days', color: '#10b981' },
    { key: '8-30', label: '8-30 days', color: '#f59e0b' },
    { key: '31-60', label: '31-60 days', color: '#f97316' },
    { key: '60+', label: '60+ days', color: '#ef4444' }
  ]

  // Prepare chart data
  const chartData = buckets.map(bucket => {
    const bucketData = safeData[bucket.key] || { count: 0, amountCents: 0 }
    return {
      name: bucket.label,
      amount: (bucketData.amountCents || 0) / 100,
      count: bucketData.count || 0,
      color: bucket.color
    }
  })

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-[var(--card)] p-3 border border-gray-100/10 rounded-lg shadow-lg text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-sm">{formatCurrency(data.amount, baseCurrency)}</p>
          <p className="text-xs text-muted-foreground">{data.count} expenses</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="h-[300px] bg-[var(--card)] p-2 rounded-lg border border-gray-100/10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="amount" 
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {buckets.map(bucket => {
          const bucketData = safeData[bucket.key] || { count: 0, amountCents: 0 }
          return (
            <div key={bucket.key} className="text-center p-3 bg-[var(--card)] border border-gray-100/10 rounded-md">
              <div 
                className="w-4 h-4 rounded-full mx-auto mb-2" 
                style={{ backgroundColor: bucket.color }}
              />
              <div className="text-lg md:text-xl font-bold">
                {formatCurrency((bucketData.amountCents || 0) / 100, baseCurrency)}
              </div>
              <div className="text-sm text-muted-foreground">{bucket.label}</div>
              <div className="text-xs text-muted-foreground">{bucketData.count || 0} expenses</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LedgerTable({ data, baseCurrency }) {
  // Ensure data is an array and has the expected structure
  const safeData = Array.isArray(data) ? data : []
  
  if (safeData.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-sm text-muted-foreground bg-gray-50/5 rounded-md border border-gray-100/10">
        <div className="text-center p-4">
          <p>No ledger data available for the selected filters</p>
          <p className="text-xs mt-1">Try adjusting your filters or time range</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground">
        Table component will be implemented here
      </div>
      <div className="space-y-2">
        {safeData.slice(0, 10).map((expense, index) => (
          <div key={expense.id} className="flex items-center justify-between p-3 bg-[var(--card)] border border-gray-100/10 rounded-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{expense.description || 'No description'}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(expense.date || Date.now()).toLocaleDateString()} • {expense.category || 'Uncategorized'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                {formatCurrency((expense.amountBaseCents || 0) / 100, baseCurrency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {expense.type || 'Unknown'} • {expense.paidBy || 'Unknown'}
              </div>
            </div>
          </div>
        ))}
      </div>
      {safeData.length > 10 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing first 10 of {safeData.length} expenses. Use CSV export for full data.
        </div>
      )}
    </div>
  )
}

// Spending Comparison Chart
function SpendingComparisonChart({ personalData, categoryData, baseCurrency }) {
  const safePersonalData = Array.isArray(personalData) ? personalData : []
  const safeCategoryData = Array.isArray(categoryData) ? categoryData : []
  
  if (safePersonalData.length === 0 && safeCategoryData.length === 0) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground">
        No data available for comparison
      </div>
    )
  }

  // Calculate totals
  const personalTotal = safePersonalData.reduce((sum, item) => 
    sum + ((item.personal?.baseCents || 0) / 100), 0
  )
  const groupTotal = safePersonalData.reduce((sum, item) => 
    sum + ((item.group?.baseCents || 0) / 100), 0
  )

  // Prepare chart data
  const chartData = [
    { name: 'Personal', value: personalTotal, color: '#10b981' },
    { name: 'Group', value: groupTotal, color: '#3b82f6' }
  ]

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value, baseCurrency)}</p>
          <p className="text-xs text-muted-foreground">
            {((data.value / (personalTotal + groupTotal)) * 100).toFixed(1)}% of total
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(personalTotal, baseCurrency)}
          </div>
          <div className="text-sm text-muted-foreground">Personal</div>
          <div className="text-xs text-muted-foreground">
            {personalTotal + groupTotal > 0 ? ((personalTotal / (personalTotal + groupTotal)) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(groupTotal, baseCurrency)}
          </div>
          <div className="text-sm text-muted-foreground">Group</div>
          <div className="text-xs text-muted-foreground">
            {personalTotal + groupTotal > 0 ? ((groupTotal / (personalTotal + groupTotal)) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Monthly Trends Chart
function MonthlyTrendsChart({ data, baseCurrency }) {
  const safeData = Array.isArray(data) ? data : []
  
  if (safeData.length === 0) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-sm text-muted-foreground">
        No trend data available
      </div>
    )
  }

  // Group data by month
  const monthlyData = safeData.reduce((acc, item) => {
    const date = new Date(item.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        personal: 0,
        group: 0,
        total: 0
      }
    }
    
    acc[monthKey].personal += (item.personal?.baseCents || 0) / 100
    acc[monthKey].group += (item.group?.baseCents || 0) / 100
    acc[monthKey].total += ((item.personal?.baseCents || 0) + (item.group?.baseCents || 0)) / 100
    
    return acc
  }, {})

  const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, baseCurrency)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const [year, month] = value.split('-')
              return `${month}/${year.slice(2)}`
            }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value, baseCurrency)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="personal" fill="#10b981" name="Personal" stackId="a" />
          <Bar dataKey="group" fill="#3b82f6" name="Group" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Category Trends Chart
function CategoryTrendsChart({ data, baseCurrency }) {
  const safeData = Array.isArray(data) ? data : []
  
  if (safeData.length === 0) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-sm text-muted-foreground">
        No category trend data available
      </div>
    )
  }

  // Get top 5 categories
  const topCategories = safeData
    .sort((a, b) => (b.totalBaseCents || 0) - (a.totalBaseCents || 0))
    .slice(0, 5)
    .map(cat => cat._id)

  // Create a simple bar chart for top categories
  const chartData = topCategories.map(category => {
    const categoryData = safeData.find(cat => cat._id === category)
    return {
      name: category,
      amount: (categoryData?.totalBaseCents || 0) / 100,
      count: categoryData?.count || 0
    }
  })

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium capitalize">{label}</p>
          <p className="text-sm">{formatCurrency(data.amount, baseCurrency)}</p>
          <p className="text-xs text-muted-foreground">{data.count} expenses</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value, baseCurrency)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="amount" 
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}