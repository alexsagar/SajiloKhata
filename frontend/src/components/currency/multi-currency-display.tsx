"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Info,
  Calculator,
  Eye,
  EyeOff,
  Settings
} from "lucide-react"

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
}

interface MultiCurrencyAmount {
  baseCurrency: string
  baseAmount: number
  conversions: {
    currency: string
    amount: number
    rate: number
  }[]
}

// Currency data
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
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' }
]

// Mock exchange rates
const mockExchangeRates: Record<string, number> = {
  'USD-EUR': 0.8534,
  'USD-GBP': 0.7342,
  'USD-JPY': 110.25,
  'USD-CAD': 1.2534,
  'USD-AUD': 1.3456,
  'USD-CHF': 0.9123,
  'USD-CNY': 6.8945,
  'USD-INR': 74.5623,
  'USD-KRW': 1189.45,
  'USD-SGD': 1.3421,
  'USD-HKD': 7.8234
}

interface MultiCurrencyDisplayProps {
  amount: number
  baseCurrency: string
  displayCurrencies?: string[]
  showRates?: boolean
  compact?: boolean
  onCurrencyChange?: (currency: string) => void
  className?: string
}

export function MultiCurrencyDisplay({
  amount,
  baseCurrency,
  displayCurrencies = ['USD', 'EUR', 'GBP', 'JPY'],
  showRates = true,
  compact = false,
  onCurrencyChange,
  className
}: MultiCurrencyDisplayProps) {
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(displayCurrencies)
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const getExchangeRate = (from: string, to: string): number => {
    if (from === to) return 1
    
    const directRate = mockExchangeRates[`${from}-${to}`]
    if (directRate) return directRate
    
    const reverseRate = mockExchangeRates[`${to}-${from}`]
    if (reverseRate) return 1 / reverseRate
    
    // Convert through USD if direct rate not available
    const fromUSD = from === 'USD' ? 1 : mockExchangeRates[`USD-${from}`] || 1
    const toUSD = to === 'USD' ? 1 : mockExchangeRates[`USD-${to}`] || 1
    
    return toUSD / fromUSD
  }

  const convertAmount = (amount: number, from: string, to: string): number => {
    const rate = getExchangeRate(from, to)
    return amount * rate
  }

  const formatCurrency = (amount: number, currencyCode: string): string => {
    const currency = currencies.find(c => c.code === currencyCode)
    if (!currency) return `${amount.toFixed(2)} ${currencyCode}`

    // Special formatting for different currencies
    let decimals = 2
    if (currencyCode === 'JPY' || currencyCode === 'KRW') decimals = 0
    if (amount < 0.01 && amount > 0) decimals = 6

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(amount)
    } catch (error) {
      // Fallback for unsupported currencies
      return `${currency.symbol}${amount.toFixed(decimals)}`
    }
  }

  const getCurrencyInfo = (code: string) => {
    return currencies.find(c => c.code === code)
  }

  const addCurrency = (currencyCode: string) => {
    if (!selectedCurrencies.includes(currencyCode)) {
      setSelectedCurrencies(prev => [...prev, currencyCode])
    }
  }

  const removeCurrency = (currencyCode: string) => {
    setSelectedCurrencies(prev => prev.filter(c => c !== currencyCode))
  }

  const conversions = selectedCurrencies.map(currency => {
    const convertedAmount = convertAmount(amount, baseCurrency, currency)
    const rate = getExchangeRate(baseCurrency, currency)
    
    return {
      currency,
      amount: convertedAmount,
      rate,
      info: getCurrencyInfo(currency)
    }
  })

  if (compact && !isExpanded) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">
            {formatCurrency(amount, baseCurrency)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        
        {selectedCurrencies.slice(0, 2).map(currency => {
          if (currency === baseCurrency) return null
          const convertedAmount = convertAmount(amount, baseCurrency, currency)
          const currencyInfo = getCurrencyInfo(currency)
          
          return (
            <div key={currency} className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>{currencyInfo?.flag}</span>
                <span>{currency}</span>
              </div>
              <span>{formatCurrency(convertedAmount, currency)}</span>
            </div>
          )
        })}
        
        {selectedCurrencies.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +{selectedCurrencies.length - 3} more currencies
          </div>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Multi-Currency Display
            </CardTitle>
            <div className="flex items-center gap-2">
              {compact && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exchange rates updated: {lastUpdated.toLocaleTimeString()}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <CardDescription>
            Amount converted to multiple currencies
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Base Amount */}
          <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCurrencyInfo(baseCurrency)?.flag}</span>
                <div>
                  <div className="font-medium">{baseCurrency}</div>
                  <div className="text-sm text-muted-foreground">
                    {getCurrencyInfo(baseCurrency)?.name}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">
                  {formatCurrency(amount, baseCurrency)}
                </div>
                <Badge variant="outline" className="text-xs">
                  Base Currency
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Converted Amounts */}
          <div className="space-y-3">
            {conversions
              .filter(conversion => conversion.currency !== baseCurrency)
              .map((conversion) => (
                <div key={conversion.currency} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{conversion.info?.flag}</span>
                    <div>
                      <div className="font-medium">{conversion.currency}</div>
                      <div className="text-sm text-muted-foreground">
                        {conversion.info?.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(conversion.amount, conversion.currency)}
                    </div>
                    {showRates && (
                      <div className="text-xs text-muted-foreground">
                        1 {baseCurrency} = {conversion.rate.toFixed(4)} {conversion.currency}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCurrency(conversion.currency)}
                    className="ml-2"
                  >
                    ×
                  </Button>
                </div>
              ))}
          </div>

          {/* Add Currency */}
          <div className="flex items-center gap-2">
            <Select onValueChange={addCurrency}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add another currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies
                  .filter(currency => !selectedCurrencies.includes(currency.code))
                  .map((currency) => (
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

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCurrencies(['USD', 'EUR', 'GBP', 'JPY'])}
            >
              Popular
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCurrencies(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])}
            >
              Western
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCurrencies(['USD', 'CNY', 'JPY', 'KRW', 'SGD', 'HKD'])}
            >
              Asian
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLastUpdated(new Date())}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>

          {/* Summary */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Currencies:</span>
                <span className="ml-2 font-medium">{selectedCurrencies.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="ml-2 font-medium">{lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

// Utility component for inline currency display
export function InlineCurrencyDisplay({ 
  amount, 
  baseCurrency, 
  targetCurrency,
  showRate = false 
}: {
  amount: number
  baseCurrency: string
  targetCurrency: string
  showRate?: boolean
}) {
  const getExchangeRate = (from: string, to: string): number => {
    if (from === to) return 1
    const rate = mockExchangeRates[`${from}-${to}`] || mockExchangeRates[`${to}-${from}`] ? 1 / mockExchangeRates[`${to}-${from}`] : 1
    return rate
  }

  const rate = getExchangeRate(baseCurrency, targetCurrency)
  const convertedAmount = amount * rate
  const baseCurrencyInfo = currencies.find(c => c.code === baseCurrency)
  const targetCurrencyInfo = currencies.find(c => c.code === targetCurrency)

  const formatCurrency = (amount: number, currencyCode: string): string => {
    const currency = currencies.find(c => c.code === currencyCode)
    if (!currency) return `${amount.toFixed(2)} ${currencyCode}`

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    } catch (error) {
      return `${currency.symbol}${amount.toFixed(2)}`
    }
  }

  if (baseCurrency === targetCurrency) {
    return (
      <span className="inline-flex items-center gap-1">
        <span>{baseCurrencyInfo?.flag}</span>
        <span>{formatCurrency(amount, baseCurrency)}</span>
      </span>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            <span>{targetCurrencyInfo?.flag}</span>
            <span>{formatCurrency(convertedAmount, targetCurrency)}</span>
            {showRate && (
              <span className="text-xs text-muted-foreground">
                (1:{rate.toFixed(4)})
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div>Original: {formatCurrency(amount, baseCurrency)}</div>
            <div>Rate: 1 {baseCurrency} = {rate.toFixed(4)} {targetCurrency}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}