"use client"

import { useState, useEffect } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Calculator,
  Clock,
  Globe,
  AlertCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
}

interface ExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdated: string
  change24h: number
}

// Mock currency data
const currencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' }
]

// Mock exchange rates
const mockExchangeRates: Record<string, ExchangeRate> = {
  'USD-EUR': { from: 'USD', to: 'EUR', rate: 0.85, lastUpdated: '2025-01-26T10:30:00Z', change24h: -0.12 },
  'USD-GBP': { from: 'USD', to: 'GBP', rate: 0.73, lastUpdated: '2025-01-26T10:30:00Z', change24h: 0.08 },
  'USD-JPY': { from: 'USD', to: 'JPY', rate: 110.25, lastUpdated: '2025-01-26T10:30:00Z', change24h: 0.45 },
  'USD-CAD': { from: 'USD', to: 'CAD', rate: 1.25, lastUpdated: '2025-01-26T10:30:00Z', change24h: -0.03 },
  'USD-AUD': { from: 'USD', to: 'AUD', rate: 1.35, lastUpdated: '2025-01-26T10:30:00Z', change24h: 0.15 },
  'EUR-GBP': { from: 'EUR', to: 'GBP', rate: 0.86, lastUpdated: '2025-01-26T10:30:00Z', change24h: 0.02 },
  'EUR-JPY': { from: 'EUR', to: 'JPY', rate: 129.70, lastUpdated: '2025-01-26T10:30:00Z', change24h: 0.67 }
}

interface CurrencyConverterProps {
  defaultFromCurrency?: string
  defaultToCurrency?: string
  defaultAmount?: number
  onConvert?: (result: { amount: number; from: string; to: string; rate: number }) => void
}

export function CurrencyConverter({ 
  defaultFromCurrency = 'USD',
  defaultToCurrency = 'EUR',
  defaultAmount = 100,
  onConvert
}: CurrencyConverterProps) {
  const [amount, setAmount] = useState<string>(defaultAmount.toString())
  const [fromCurrency, setFromCurrency] = useState(defaultFromCurrency)
  const [toCurrency, setToCurrency] = useState(defaultToCurrency)
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const { toast } = useToast()

  const getExchangeRate = async (from: string, to: string): Promise<ExchangeRate | null> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const key = `${from}-${to}`
    const reverseKey = `${to}-${from}`
    
    if (mockExchangeRates[key]) {
      return mockExchangeRates[key]
    } else if (mockExchangeRates[reverseKey]) {
      const reverseRate = mockExchangeRates[reverseKey]
      return {
        from,
        to,
        rate: 1 / reverseRate.rate,
        lastUpdated: reverseRate.lastUpdated,
        change24h: -reverseRate.change24h
      }
    }
    
    // Generate mock rate for demonstration
    return {
      from,
      to,
      rate: Math.random() * 2 + 0.5,
      lastUpdated: new Date().toISOString(),
      change24h: (Math.random() - 0.5) * 2
    }
  }

  const convertCurrency = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid number",
        variant: "destructive"
      })
      return
    }

    if (fromCurrency === toCurrency) {
      setConvertedAmount(parseFloat(amount))
      setExchangeRate(null)
      return
    }

    setIsLoading(true)
    try {
      const rate = await getExchangeRate(fromCurrency, toCurrency)
      if (rate) {
        const converted = parseFloat(amount) * rate.rate
        setConvertedAmount(converted)
        setExchangeRate(rate)
        setLastUpdated(new Date())
        
        onConvert?.({
          amount: converted,
          from: fromCurrency,
          to: toCurrency,
          rate: rate.rate
        })
      }
    } catch (error) {
      toast({
        title: "Conversion failed",
        description: "Unable to fetch exchange rates. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    if (convertedAmount !== null) {
      setAmount(convertedAmount.toString())
      setConvertedAmount(parseFloat(amount))
    }
  }

  const refreshRates = () => {
    if (amount && fromCurrency && toCurrency) {
      convertCurrency()
    }
  }

  useEffect(() => {
    if (amount && fromCurrency && toCurrency) {
      const timeoutId = setTimeout(() => {
        convertCurrency()
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [amount, fromCurrency, toCurrency])

  const getCurrencyDisplay = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode)
    return currency ? `${currency.flag} ${currency.code}` : currencyCode
  }

  const formatCurrency = (value: number, currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value)
  }

  return (
    <KanbanCard className="w-full max-w-2xl">
      <KanbanCardHeader>
        <KanbanCardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Currency Converter
        </KanbanCardTitle>
        <KanbanCardDescription>
          Convert between different currencies with real-time exchange rates
        </KanbanCardDescription>
      </KanbanCardHeader>
      <KanbanCardContent className="space-y-6">
        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg"
          />
        </div>

        {/* Currency Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="fromCurrency">From</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
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
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={swapCurrencies}
              className="rounded-full"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toCurrency">To</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
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
          </div>
        </div>

        {/* Convert Button */}
        <Button 
          onClick={convertCurrency} 
          disabled={isLoading || !amount}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Convert
            </>
          )}
        </Button>

        {/* Result */}
        {convertedAmount !== null && (
          <div className="space-y-4">
            <Separator />
            
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                {formatCurrency(parseFloat(amount), fromCurrency)} =
              </div>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(convertedAmount, toCurrency)}
              </div>
            </div>

            {exchangeRate && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <div className="flex items-center gap-2">
                    <span>1 {fromCurrency} = {exchangeRate.rate.toFixed(6)} {toCurrency}</span>
                    {exchangeRate.change24h !== 0 && (
                      <Badge 
                        variant={exchangeRate.change24h > 0 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {exchangeRate.change24h > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(exchangeRate.change24h).toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshRates}
                    className="h-auto p-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Conversion Buttons */}
        <div className="space-y-2">
          <Label className="text-sm">Quick amounts</Label>
          <div className="flex gap-2 flex-wrap">
            {[1, 10, 100, 1000, 10000].map((quickAmount) => (
              <Button
                key={quickAmount}
                variant="outline"
                size="sm"
                onClick={() => setAmount(quickAmount.toString())}
              >
                {quickAmount.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Exchange Rate Disclaimer</p>
            <p>
              Rates are for informational purposes only and may not reflect real-time market rates. 
              For actual transactions, please check with your financial institution.
            </p>
          </div>
        </div>
      </KanbanCardContent>
    </KanbanCard>
  )
}