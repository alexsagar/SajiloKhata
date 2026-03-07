"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
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
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Layers
} from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"
import { formatCurrency } from "@/lib/utils"
import { ComponentLoading } from "@/components/ui/loading"

// Dynamically import Charts to reduce bundle size and avoid SSR issues with Recharts
const SpendingOverTimeChart = dynamic(() => import('./charts').then(m => m.SpendingOverTimeChart), { ssr: false })
const MonthlyTrendsChart = dynamic(() => import('./charts').then(m => m.MonthlyTrendsChart), { ssr: false })
const CategoryTrendsChart = dynamic(() => import('./charts').then(m => m.CategoryTrendsChart), { ssr: false })
const CategoryBreakdownChart = dynamic(() => import('./charts').then(m => m.CategoryBreakdownChart), { ssr: false })

// Filter types
interface AnalyticsFilters {
  mode: 'personal' | 'group' | 'all'
  time: {
    range: 'ALL_TIME' | 'THIS_MONTH' | 'LAST_3M' | 'YTD' | 'CUSTOM'
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

interface AnalyticsKpiPayload {
  totalSpendBaseCents?: number | { personal?: number; group?: number }
  personalSpendBaseCents?: number
  groupSpendBaseCents?: number
  netBalanceBaseCents?: number
  expensesCount?: { personal?: number; group?: number }
  avgExpenseSizeBaseCents?: number
  activeGroups?: number
  activeMembers?: number
  avgSettlementDays?: number
}

// Default filters
const defaultFilters: AnalyticsFilters = {
  mode: 'all',
  time: { range: 'ALL_TIME' },
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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('analytics-activeTab') || 'overview'
    }
    return 'overview'
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false)

  // Responsive state for mobile
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('analytics-viewMode') as 'simple' | 'advanced') || 'simple'
    }
    return 'simple'
  })

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('analytics-viewMode', viewMode)
  }, [viewMode])

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('analytics-activeTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Build effective filters for API: when ALL_TIME, omit time to fetch across all expenses
  const effectiveFilters = useMemo(() => {
    const f: Record<string, unknown> = { ...filters, baseCurrency: userCurrency }
    const time = f.time as { range?: string; from?: string; to?: string } | undefined
    if (time?.range === 'ALL_TIME') {
      delete time.from
      delete time.to
      delete f.time
    }
    return f
  }, [filters, userCurrency])

  // Fetch KPIs data
  const { data: kpisData, isError: kpisError } = useQuery({
    queryKey: ['analytics-kpis', effectiveFilters],
    queryFn: () => analyticsAPI.getKPIs(effectiveFilters),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Fetch spend over time data
  const { data: spendOverTimeData, isLoading: spendOverTimeLoading, isError: spendError } = useQuery({
    queryKey: ['analytics-spend-over-time', effectiveFilters],
    queryFn: () => analyticsAPI.getSpendOverTime(effectiveFilters),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Fetch category breakdown data
  const { data: categoryData, isLoading: categoryLoading, isError: catError } = useQuery({
    queryKey: ['analytics-category-breakdown', effectiveFilters],
    queryFn: () => analyticsAPI.getCategoryBreakdown(effectiveFilters),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Fetch top partners data
  const { data: partnersData, isLoading: partnersLoading, isError: partnersError } = useQuery({
    queryKey: ['analytics-top-partners', effectiveFilters],
    queryFn: () => analyticsAPI.getTopPartners(effectiveFilters),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Fetch aging data
  const { data: agingData, isLoading: agingLoading, isError: agingError } = useQuery({
    queryKey: ['analytics-aging', effectiveFilters],
    queryFn: () => analyticsAPI.getAgingBuckets(effectiveFilters),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Fetch ledger data
  const { data: ledgerData, isLoading: ledgerLoading, isError: ledgerError } = useQuery({
    queryKey: ['analytics-ledger', effectiveFilters],
    queryFn: () => analyticsAPI.getLedger(effectiveFilters),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Unwrap axios + API envelope: axiosResponse.data.data
  const unwrapApiData = (response: unknown) => {
    if (!response || typeof response !== "object") return undefined
    const axiosData = (response as { data?: unknown }).data
    if (!axiosData || typeof axiosData !== "object") return undefined
    return (axiosData as { data?: unknown }).data
  }

  // KPI payload from analytics API (no extra fallback query)
  const kpis = useMemo(() => {
    const kpisApi = (unwrapApiData(kpisData) as AnalyticsKpiPayload | undefined) || {}
    return {
      totalSpendBaseCents: typeof kpisApi?.totalSpendBaseCents === "number" ? kpisApi.totalSpendBaseCents : 0,
      netBalanceBaseCents: kpisApi?.netBalanceBaseCents || 0,
      expensesCount: kpisApi?.expensesCount || { personal: 0, group: 0 },
      avgExpenseSizeBaseCents: kpisApi?.avgExpenseSizeBaseCents || 0,
      activeGroups: kpisApi?.activeGroups || 0,
      activeMembers: kpisApi?.activeMembers || 0,
      avgSettlementDays: kpisApi?.avgSettlementDays || 0,
    }
  }, [kpisData])
  const baseCurrency = userCurrency



  // Ensure data is properly structured for chart components (memoized)
  const safeSpendOverTimeData = useMemo(() => {
    const api = (unwrapApiData(spendOverTimeData) as { data?: unknown } | undefined)?.data
    const rows = Array.isArray(api) ? api : []
    return rows
  }, [spendOverTimeData])
  const safeCategoryData = useMemo(() => {
    const api = (unwrapApiData(categoryData) as { data?: unknown } | undefined)?.data
    const rows = Array.isArray(api) ? api : []
    return rows
  }, [categoryData])
  const safePartnersData = useMemo(
    () => {
      const api = (unwrapApiData(partnersData) as { topUsers?: unknown; topGroups?: unknown } | undefined) || {}
      return {
        topUsers: Array.isArray(api.topUsers) ? api.topUsers : [],
        topGroups: Array.isArray(api.topGroups) ? api.topGroups : []
      }
    },
    [partnersData]
  )
  const safeAgingData = useMemo<Record<string, { count?: number; amountCents?: number }>>(
    () => {
      const api = (unwrapApiData(agingData) as { data?: unknown } | undefined)?.data
      if (!api || typeof api !== 'object') {
        return {
          '0-7': { count: 0, amountCents: 0 },
          '8-30': { count: 0, amountCents: 0 },
          '31-60': { count: 0, amountCents: 0 },
          '60+': { count: 0, amountCents: 0 },
        }
      }

      const buckets = api as Record<string, { count?: number; amountCents?: number }>

      // Support both legacy and current bucket keys.
      return {
        '0-7': buckets['0-7'] || buckets['0-30'] || { count: 0, amountCents: 0 },
        '8-30': buckets['8-30'] || { count: 0, amountCents: 0 },
        '31-60': buckets['31-60'] || { count: 0, amountCents: 0 },
        '60+': buckets['60+'] || buckets['61-90'] || buckets['90+'] || { count: 0, amountCents: 0 },
      }
    },
    [agingData]
  )
  const safeLedgerData = useMemo(
    () => {
      const api = (unwrapApiData(ledgerData) as { data?: unknown } | undefined)?.data
      return Array.isArray(api) ? api : []
    },
    [ledgerData]
  )

  const spendSplit = useMemo(() => {
    const kpisApi = (unwrapApiData(kpisData) as AnalyticsKpiPayload | undefined) || {}
    if (
      typeof kpisApi.personalSpendBaseCents === "number" ||
      typeof kpisApi.groupSpendBaseCents === "number"
    ) {
      return {
        personal: Number(kpisApi.personalSpendBaseCents || 0),
        group: Number(kpisApi.groupSpendBaseCents || 0),
      }
    }
    if (kpisApi.totalSpendBaseCents && typeof kpisApi.totalSpendBaseCents === "object") {
      return {
        personal: Number(kpisApi.totalSpendBaseCents.personal || 0),
        group: Number(kpisApi.totalSpendBaseCents.group || 0),
      }
    }

    const personal = safeSpendOverTimeData.reduce(
      (sum, row) => sum + Number(row?.personal?.baseCents || 0),
      0,
    )
    const group = safeSpendOverTimeData.reduce(
      (sum, row) => sum + Number(row?.group?.baseCents || 0),
      0,
    )

    return { personal, group }
  }, [kpisData, safeSpendOverTimeData])

  // Handle filter changes with debounce to reduce refetches
  const filterTimer = useRef<NodeJS.Timeout | null>(null)
  const updateFilter = useCallback((key: keyof AnalyticsFilters, value: any) => {
    if (filterTimer.current) clearTimeout(filterTimer.current)
    filterTimer.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, [key]: value }))
    }, 250)
  }, [])

  // Handle CSV export — uses the shared serializer from api.ts
  const handleCSVExport = () => {
    const url = analyticsAPI.buildCSVExportURL(effectiveFilters)
    window.open(url, '_blank')
  }

  // --- Data status indicator ---
  const dataStatus = useMemo(() => {
    const errors = [kpisError, spendError, catError, partnersError, agingError, ledgerError]
    const errorCount = errors.filter(Boolean).length
    if (errorCount === errors.length) return 'error' as const
    if (errorCount > 0) return 'partial' as const
    return 'live' as const
  }, [kpisError, spendError, catError, partnersError, agingError, ledgerError])

  const DataStatusBadge = () => {
    if (dataStatus === 'live') {
      return <Badge variant="outline" className="text-green-500 border-green-500/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Live</Badge>
    }
    if (dataStatus === 'partial') {
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>
    }
    return <Badge variant="outline" className="text-red-500 border-red-500/30 text-[10px]"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
  }
  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* Filter Bar */}
      <Card>
        <CardHeader className="px-2 md:px-3 py-1 md:py-1 pb-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle className="text-responsive-lg">Filters</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <DataStatusBadge />
              {/* Mobile filter toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFiltersOnMobile(v => !v)}
                className="h-8 px-2 sm:hidden"
              >
                <Filter className="h-3 w-3 mr-1" />
                {showFiltersOnMobile ? 'Hide' : 'Filters'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(v => v === 'simple' ? 'advanced' : 'simple')}
                className="h-8 px-2"
              >
                {viewMode === 'simple' ? <><Layers className="h-3 w-3 mr-1" />Advanced</> : <><Eye className="h-3 w-3 mr-1" />Simple</>}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAdvancedFilters(v => !v)} className="h-8 px-2 hidden sm:inline-flex">
                {showAdvancedFilters ? 'Hide filters' : 'More filters'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCSVExport} className="touch-friendly">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        {/* Filters: always visible on desktop, collapsible on mobile */}
        <CardContent className={`px-2 md:px-3 pt-0 pb-2 ${!showFiltersOnMobile ? 'hidden sm:block' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-2 items-end">
            {/* Mode Filter */}
            <div className="space-y-0.5">
              <label className="text-xs font-medium">Mode</label>
              <Select
                value={filters.mode}
                onValueChange={(value: 'personal' | 'group' | 'all') => updateFilter('mode', value)}
              >
                <SelectTrigger className="h-8">
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
            <div className="space-y-0.5">
              <label className="text-xs font-medium">Time Range</label>
              <Select
                value={filters.time.range}
                onValueChange={(value: 'ALL_TIME' | 'THIS_MONTH' | 'LAST_3M' | 'YTD' | 'CUSTOM') =>
                  updateFilter('time', { ...filters.time, range: value })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_TIME">All Time</SelectItem>
                  <SelectItem value="THIS_MONTH">This Month</SelectItem>
                  <SelectItem value="LAST_3M">Last 3 Months</SelectItem>
                  <SelectItem value="YTD">Year to Date</SelectItem>
                  <SelectItem value="CUSTOM">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range Inputs */}
              {filters.time.range === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <div>
                    <label className="text-[10px] text-muted-foreground">From</label>
                    <input
                      type="date"
                      value={filters.time.from || ''}
                      onChange={(e) => updateFilter('time', { ...filters.time, from: e.target.value })}
                      className="w-full px-2 py-1 text-xs border rounded-md h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">To</label>
                    <input
                      type="date"
                      value={filters.time.to || ''}
                      onChange={(e) => updateFilter('time', { ...filters.time, to: e.target.value })}
                      className="w-full px-2 py-1 text-xs border rounded-md h-8"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category Filter (advanced) */}
            {showAdvancedFilters && (
              <div className="space-y-0.5">
                <label className="text-xs font-medium">Categories</label>
                <Select
                  value={filters.categories?.join(',') || 'all'}
                  onValueChange={(value) => updateFilter('categories', value === 'all' ? [] : value.split(','))}
                >
                  <SelectTrigger className="h-8">
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
            )}

            {/* Status Filter (advanced) */}
            {showAdvancedFilters && (
              <div className="space-y-0.5">
                <label className="text-xs font-medium">Status</label>
                <Select
                  value={filters.status?.join(',') || 'all'}
                  onValueChange={(value) => updateFilter('status', value === 'all' ? ['active', 'settled'] : value.split(','))}
                >
                  <SelectTrigger className="h-8">
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs Row */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
        <Card className="shrink-0 snap-start w-[84vw] sm:w-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg md:text-2xl font-bold break-all leading-tight">
              {formatCurrency((kpis.totalSpendBaseCents || 0) / 100, baseCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filters.time.range === 'ALL_TIME' && 'All time'}
              {filters.time.range === 'THIS_MONTH' && 'This month'}
              {filters.time.range === 'LAST_3M' && 'Last 3 months'}
              {filters.time.range === 'YTD' && 'Year to date'}
              {filters.time.range === 'CUSTOM' && (filters.time.from && filters.time.to ? `${filters.time.from} to ${filters.time.to}` : 'Custom range')}
            </p>
          </CardContent>
        </Card>

        <Card className="shrink-0 snap-start w-[84vw] sm:w-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className={`text-lg md:text-2xl font-bold break-all leading-tight ${(kpis.netBalanceBaseCents || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(kpis.netBalanceBaseCents || 0) / 100, baseCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(kpis.netBalanceBaseCents || 0) >= 0 ? 'You are owed' : 'You owe'}
            </p>
          </CardContent>
        </Card>

        <Card className="shrink-0 snap-start w-[84vw] sm:w-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg md:text-2xl font-bold">
              {(kpis.expensesCount?.personal || 0) + (kpis.expensesCount?.group || 0)}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>Personal: {kpis.expensesCount?.personal || 0}</span>
              <span>Group: {kpis.expensesCount?.group || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Personal vs Group Expense Breakdown */}
        <Card className="shrink-0 snap-start w-[84vw] sm:w-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Personal Expenses</CardTitle>
            <User className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg md:text-2xl font-bold text-blue-400 break-all leading-tight">
              {formatCurrency((spendSplit.personal || 0) / 100, baseCurrency)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {kpis.expensesCount?.personal || 0} individual expense{(kpis.expensesCount?.personal || 0) !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card className="shrink-0 snap-start w-[84vw] sm:w-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-sm font-medium">Group Expenses</CardTitle>
            <Group className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-400 break-all leading-tight">
              {formatCurrency((spendSplit.group || 0) / 100, baseCurrency)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {kpis.expensesCount?.group || 0} shared expense{(kpis.expensesCount?.group || 0) !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card className="shrink-0 snap-start w-[84vw] sm:w-auto">
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

      {/* Simple view: KPIs + Overview Chart only */}
      {viewMode === 'simple' && (
        <Card>
          <CardHeader className="p-2 md:p-3">
            <CardTitle className="text-responsive-lg">Spending Overview</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Personal vs Group spending trends
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-3 pb-2 isolate">
            {spendOverTimeLoading ? (
              <div className="flex items-center justify-center h-40">
                <ComponentLoading
                  text="Loading Spending Overview"
                  subtitle="Please wait..."
                />
              </div>
            ) : spendError ? (
              <div className="min-h-[240px] flex items-center justify-center text-sm text-red-400">
                <AlertCircle className="h-4 w-4 mr-2" />Failed to load spending data. Try again later.
              </div>
            ) : (
              <div className="relative h-80 md:h-99 overflow-hidden mb-2">
                <SpendingOverTimeChart data={safeSpendOverTimeData} baseCurrency={baseCurrency} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advanced view: Full tabbed analytics */}
      {viewMode === 'advanced' && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="w-full overflow-x-auto no-scrollbar flex items-center gap-1 h-auto p-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <TabsTrigger value="overview" className="text-xs shrink-0 whitespace-nowrap px-2 sm:px-3">Overview</TabsTrigger>
            <TabsTrigger value="spending" className="text-xs shrink-0 whitespace-nowrap px-2 sm:px-3">Spending</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs shrink-0 whitespace-nowrap px-2 sm:px-3">Categories</TabsTrigger>
            <TabsTrigger value="partners" className="text-xs shrink-0 whitespace-nowrap px-2 sm:px-3">Partners</TabsTrigger>
            <TabsTrigger value="aging" className="text-xs shrink-0 whitespace-nowrap px-2 sm:px-3">Aging</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs shrink-0 whitespace-nowrap px-2 sm:px-3">Trends</TabsTrigger>
            <TabsTrigger value="ledger" className="text-xs shrink-0 whitespace-nowrap px-2 sm:px-3">Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              <Card>
                <CardHeader className="p-2 md:p-3">
                  <CardTitle className="text-responsive-lg">Spending Over Time</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Personal vs Group spending trends
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 md:p-3 pb-2 isolate">
                  {spendOverTimeLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <ComponentLoading
                        text="Loading Spending Over Time"
                        subtitle="Please wait while we load your spending trends..."
                      />
                    </div>
                  ) : (
                    <div className="relative h-80 md:h-99 overflow-hidden mb-2">
                      <SpendingOverTimeChart data={safeSpendOverTimeData} baseCurrency={baseCurrency} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution block removed per request */}

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
                          {formatCurrency((spendSplit.personal || 0) / 100, baseCurrency)}
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
                            formatCurrency(((spendSplit.personal || 0) / (kpis.expensesCount?.personal || 1)) / 100, baseCurrency)
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
                          {formatCurrency((spendSplit.group || 0) / 100, baseCurrency)}
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
                            formatCurrency(((spendSplit.group || 0) / (kpis.expensesCount?.group || 1)) / 100, baseCurrency)
                            : formatCurrency(0, baseCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spending Distribution Chart */}
                {((spendSplit.personal || 0) + (spendSplit.group || 0)) > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h5 className="text-sm font-medium text-white mb-3">Spending Distribution</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                          <span className="text-sm text-muted-foreground">Personal</span>
                        </div>
                        <span className="text-sm font-medium text-blue-400">
                          {Math.round(((spendSplit.personal || 0) / ((spendSplit.personal || 0) + (spendSplit.group || 0))) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          <span className="text-sm text-muted-foreground">Group</span>
                        </div>
                        <span className="text-sm font-medium text-green-400">
                          {Math.round(((spendSplit.group || 0) / ((spendSplit.personal || 0) + (spendSplit.group || 0))) * 100)}%
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
                  ) : spendError ? (
                    <div className="min-h-[300px] flex items-center justify-center text-sm text-red-400">
                      <AlertCircle className="h-4 w-4 mr-2" />Failed to load monthly trends.
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
                  ) : catError ? (
                    <div className="min-h-[300px] flex items-center justify-center text-sm text-red-400">
                      <AlertCircle className="h-4 w-4 mr-2" />Failed to load category trends.
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
      )}
    </div>
  )
}

// Chart Components (dynamically imported above)

// Type definitions for chart components
interface ChartDataItem {
  date: string
  personal: { amountCents: number; baseCents: number; count: number }
  group: { amountCents: number; baseCents: number; count: number }
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




// (Interfaces and Components moved to ./charts.tsx)


function SpendingComparisonChart({ personalData, categoryData, baseCurrency }: { personalData: any[]; categoryData: any[]; baseCurrency: string }) {
  const personal = Array.isArray(personalData) ? personalData.reduce((s, i) => s + ((i?.personal?.baseCents || 0) / 100), 0) : 0
  const group = Array.isArray(personalData) ? personalData.reduce((s, i) => s + ((i?.group?.baseCents || 0) / 100), 0) : 0
  return (
    <div className="grid grid-cols-2 gap-4 text-center">
      <div className="p-3 bg-[var(--card)] border border-gray-100/10 rounded-md">
        <div className="text-sm text-muted-foreground">Personal</div>
        <div className="font-semibold">{formatCurrency(personal, baseCurrency)}</div>
      </div>
      <div className="p-3 bg-[var(--card)] border border-gray-100/10 rounded-md">
        <div className="text-sm text-muted-foreground">Group</div>
        <div className="font-semibold">{formatCurrency(group, baseCurrency)}</div>
      </div>
    </div>
  )
}

function TopPartnersList({ data, baseCurrency }: { data: Array<{ _id: string; name: string; totalBaseCents?: number }>; baseCurrency: string }) {
  const safe = Array.isArray(data) ? data : []
  if (safe.length === 0) return <div className="text-sm text-muted-foreground">No partners</div>
  return (
    <div className="space-y-2">
      {safe.slice(0, 10).map((p) => (
        <div key={p._id} className="flex items-center justify-between text-sm">
          <span className="truncate pr-2">{p.name}</span>
          <span className="shrink-0">{formatCurrency((p.totalBaseCents || 0) / 100, baseCurrency)}</span>
        </div>
      ))}
    </div>
  )
}

function TopGroupsList({ data, baseCurrency }: { data: Array<{ _id: string; name: string; totalBaseCents?: number }>; baseCurrency: string }) {
  const safe = Array.isArray(data) ? data : []
  if (safe.length === 0) return <div className="text-sm text-muted-foreground">No groups</div>
  return (
    <div className="space-y-2">
      {safe.slice(0, 10).map((g) => (
        <div key={g._id} className="flex items-center justify-between text-sm">
          <span className="truncate pr-2">{g.name}</span>
          <span className="shrink-0">{formatCurrency((g.totalBaseCents || 0) / 100, baseCurrency)}</span>
        </div>
      ))}
    </div>
  )
}

function AgingBucketsChart({ data, baseCurrency }: { data: Record<string, { count?: number; amountCents?: number }>; baseCurrency: string }) {
  const keys = ["0-7", "8-30", "31-60", "60+"]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {keys.map((k) => (
        <div key={k} className="p-3 bg-[var(--card)] border border-gray-100/10 rounded-md text-center">
          <div className="text-xs text-muted-foreground">{k} days</div>
          <div className="text-sm font-semibold">{data?.[k]?.count || 0} items</div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatCurrency(((data?.[k]?.amountCents || 0) as number) / 100, baseCurrency)}
          </div>
        </div>
      ))}
    </div>
  )
}

function LedgerTable({ data, baseCurrency }: { data: any[]; baseCurrency: string }) {
  const rows = Array.isArray(data) ? data.slice(0, 20) : []
  if (rows.length === 0) return <div className="text-sm text-muted-foreground">No ledger data</div>
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-2">Date</th>
            <th className="text-left p-2">Description</th>
            <th className="text-right p-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t border-white/10">
              <td className="p-2">{new Date(r.date).toLocaleDateString()}</td>
              <td className="p-2">{r.description || r._id || '—'}</td>
              <td className="p-2 text-right">{formatCurrency((r.totalBaseCents || r.amountCents || 0) / 100, baseCurrency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
