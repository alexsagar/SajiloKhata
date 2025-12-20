"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Clock,
  Globe,
  BarChart3,
  AlertCircle,
  Star,
  Minus
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface ExchangeRate {
  from: string
  to: string
  rate: number
  change24h: number
  change7d: number
  lastUpdated: string
  high24h: number
  low24h: number
}

interface HistoricalRate {
  date: string
  rate: number
}

// Mock exchange rates data
const mockExchangeRates: ExchangeRate[] = [
  {
    from: 'USD',
    to: 'EUR',
    rate: 0.8534,
    change24h: -0.12,
    change7d: 0.45,
    lastUpdated: '2025-01-26T10:30:00Z',
    high24h: 0.8567,
    low24h: 0.8512
  },
  {
    from: 'USD',
    to: 'GBP',
    rate: 0.7342,
    change24h: 0.08,
    change7d: -0.23,
    lastUpdated: '2025-01-26T10:30:00Z',
    high24h: 0.7356,
    low24h: 0.7328
  },
  {
    from: 'USD',
    to: 'JPY',
    rate: 110.25,
    change24h: 0.45,
    change7d: 1.23,
    lastUpdated: '2025-01-26T10:30:00Z',
    high24h: 110.78,
    low24h: 109.89
  },
  {
    from: 'USD',
    to: 'CAD',
    rate: 1.2534,
    change24h: -0.03,
    change7d: 0.12,
    lastUpdated: '2025-01-26T10:30:00Z',
    high24h: 1.2567,
    low24h: 1.2501
  },
  {
    from: 'USD',
    to: 'AUD',
    rate: 1.3456,
    change24h: 0.15,
    change7d: -0.67,
    lastUpdated: '2025-01-26T10:30:00Z',
    high24h: 1.3489,
    low24h: 1.3423
  },
  {
    from: 'USD',
    to: 'CHF',
    rate: 0.9123,
    change24h: -0.05,
    change7d: 0.34,
    lastUpdated: '2025-01-26T10:30:00Z',
    high24h: 0.9145,
    low24h: 0.9098
  },
  {
    from: 'USD',
    to: 'CNY',
    rate: 6.8945,
    change24h: 0.23,
    change7d: 0.89,
    lastUpdated: '2025-01-26T10:30:00Z',
    high24h: 6.9012,
    low24h: 6.8876
  },
  {
    from: 'USD',
    to: 'INR',
    rate: 74.5623,
    change24h: -0.18,
    change7d: 0.56,
    lastUpdated: '2025-01-26T10:30:00Z',
    high24h: 74.7890,
    low24h: 74.3456
  }
]

// Mock historical data
const generateHistoricalData = (baseRate: number, days: number): HistoricalRate[] => {
  const data: HistoricalRate[] = []
  const today = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // Generate realistic fluctuation
    const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
    const rate = baseRate * (1 + variation * (i / days))
    
    data.push({
      date: date.toISOString().split('T')[0],
      rate: parseFloat(rate.toFixed(6))
    })
  }
  
  return data
}

const currencies = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' }
]

export function ExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>(mockExchangeRates)
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [selectedPair, setSelectedPair] = useState<ExchangeRate | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalRate[]>([])
  const [timeframe, setTimeframe] = useState('7d')
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [watchlist, setWatchlist] = useState<string[]>(['EUR', 'GBP', 'JPY'])

  useEffect(() => {
    if (selectedPair) {
      const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
      setHistoricalData(generateHistoricalData(selectedPair.rate, days))
    }
  }, [selectedPair, timeframe])

  const refreshRates = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update rates with small random changes
      setRates(prev => prev.map(rate => ({
        ...rate,
        rate: rate.rate * (1 + (Math.random() - 0.5) * 0.001),
        change24h: (Math.random() - 0.5) * 2,
        lastUpdated: new Date().toISOString()
      })))
      
      setLastRefresh(new Date())
    } catch (error) {
      
    } finally {
      setIsLoading(false)
    }
  }

  const toggleWatchlist = (currency: string) => {
    setWatchlist(prev => 
      prev.includes(currency) 
        ? prev.filter(c => c !== currency)
        : [...prev, currency]
    )
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-600" />
    if (change < 0) return <TrendingDown className="h-3 w-3 text-red-600" />
    return <Minus className="h-3 w-3 text-gray-400" />
  }

  const getChangeBadge = (change: number) => {
    const isPositive = change > 0
    const isNegative = change < 0
    
    return (
      <Badge 
        variant={isPositive ? "default" : isNegative ? "destructive" : "outline"}
        className="text-xs"
      >
        {getChangeIcon(change)}
        {Math.abs(change).toFixed(2)}%
      </Badge>
    )
  }

  const formatRate = (rate: number, precision = 4) => {
    if (rate >= 100) return rate.toFixed(2)
    if (rate >= 10) return rate.toFixed(3)
    return rate.toFixed(precision)
  }

  const getCurrencyFlag = (code: string) => {
    return currencies.find(c => c.code === code)?.flag || '🏳️'
  }

  const filteredRates = rates.filter(rate => rate.from === baseCurrency)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Exchange Rates</h2>
          <p className="text-muted-foreground">
            Real-time currency exchange rates and trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            Updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshRates}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Base Currency Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Base Currency
          </CardTitle>
          <CardDescription>
            Select the base currency to view exchange rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={baseCurrency} onValueChange={setBaseCurrency}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  <div className="flex items-center gap-2">
                    <span>{currency.flag}</span>
                    <span>{currency.code}</span>
                    <span className="text-muted-foreground">- {currency.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="rates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rates">Current Rates</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="chart">Chart Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRates.map((rate) => (
              <Card 
                key={`${rate.from}-${rate.to}`}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPair(rate)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCurrencyFlag(rate.from)}</span>
                      <span className="text-lg">{getCurrencyFlag(rate.to)}</span>
                      <span className="font-medium">{rate.from}/{rate.to}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleWatchlist(rate.to)
                      }}
                    >
                      <Star 
                        className={`h-4 w-4 ${
                          watchlist.includes(rate.to) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-2xl font-bold">
                      {formatRate(rate.rate)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">24h:</span>
                          {getChangeBadge(rate.change24h)}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">7d:</span>
                          {getChangeBadge(rate.change7d)}
                        </div>
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground">
                        <div>H: {formatRate(rate.high24h)}</div>
                        <div>L: {formatRate(rate.low24h)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="watchlist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Your Watchlist
              </CardTitle>
              <CardDescription>
                Track your favorite currency pairs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {watchlist.length > 0 ? (
                <div className="space-y-3">
                  {filteredRates
                    .filter(rate => watchlist.includes(rate.to))
                    .map((rate) => (
                      <div 
                        key={`${rate.from}-${rate.to}`}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span>{getCurrencyFlag(rate.from)}</span>
                            <span>{getCurrencyFlag(rate.to)}</span>
                          </div>
                          <div>
                            <div className="font-medium">{rate.from}/{rate.to}</div>
                            <div className="text-sm text-muted-foreground">
                              {currencies.find(c => c.code === rate.to)?.name}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium">{formatRate(rate.rate)}</div>
                          <div className="flex items-center gap-1">
                            {getChangeBadge(rate.change24h)}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleWatchlist(rate.to)}
                        >
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No currencies in watchlist</h3>
                  <p className="text-muted-foreground mb-4">
                    Add currencies to your watchlist to track them easily
                  </p>
                  <Button variant="outline" onClick={() => setWatchlist(['EUR', 'GBP', 'JPY'])}>
                    Add Popular Currencies
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Select Currency Pair</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredRates.map((rate) => (
                    <Button
                      key={`${rate.from}-${rate.to}`}
                      variant={selectedPair?.to === rate.to ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedPair(rate)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{getCurrencyFlag(rate.from)}</span>
                        <span>{getCurrencyFlag(rate.to)}</span>
                        <span>{rate.from}/{rate.to}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedPair ? (
                      <div className="flex items-center gap-2">
                        <span>{getCurrencyFlag(selectedPair.from)}</span>
                        <span>{getCurrencyFlag(selectedPair.to)}</span>
                        {selectedPair.from}/{selectedPair.to} Chart
                      </div>
                    ) : (
                      'Select a currency pair'
                    )}
                  </CardTitle>
                  {selectedPair && (
                    <Select value={timeframe} onValueChange={setTimeframe}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1d">1D</SelectItem>
                        <SelectItem value="7d">7D</SelectItem>
                        <SelectItem value="30d">30D</SelectItem>
                        <SelectItem value="90d">90D</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedPair && historicalData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{formatRate(selectedPair.rate)}</div>
                        <div className="text-sm text-muted-foreground">Current Rate</div>
                      </div>
                      <div>
                        <div className="text-lg font-medium text-green-600">
                          {formatRate(selectedPair.high24h)}
                        </div>
                        <div className="text-sm text-muted-foreground">24h High</div>
                      </div>
                      <div>
                        <div className="text-lg font-medium text-red-600">
                          {formatRate(selectedPair.low24h)}
                        </div>
                        <div className="text-sm text-muted-foreground">24h Low</div>
                      </div>
                    </div>
                    
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis 
                          domain={['dataMin - 0.001', 'dataMax + 0.001']}
                          tickFormatter={(value) => formatRate(value)}
                        />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value: any) => [formatRate(value), 'Rate']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                      <p>Select a currency pair to view the chart</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rate Alert */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Rate Alerts
          </CardTitle>
          <CardDescription>
            Set up alerts for when exchange rates reach your target levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="alertPair">Currency Pair</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select pair" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRates.map((rate) => (
                    <SelectItem key={`${rate.from}-${rate.to}`} value={`${rate.from}-${rate.to}`}>
                      {rate.from}/{rate.to}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alertRate">Target Rate</Label>
              <Input id="alertRate" type="number" step="0.0001" placeholder="0.0000" />
            </div>
            <div className="flex items-end">
              <Button className="w-full">Set Alert</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}