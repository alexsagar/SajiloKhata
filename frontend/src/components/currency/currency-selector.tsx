"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, Search, Star, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
  popular?: boolean
  region?: string
}

// Comprehensive currency list
const currencies: Currency[] = [
  // Popular currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', popular: true, region: 'North America' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', popular: true, region: 'Europe' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', popular: true, region: 'Europe' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', popular: true, region: 'Asia' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', popular: true, region: 'North America' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', popular: true, region: 'Oceania' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', popular: true, region: 'Europe' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', popular: true, region: 'Asia' },
  
  // Other major currencies
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', region: 'Asia' },
  { code: 'NPR', name: 'Nepali Rupee', symbol: 'रू', flag: '🇳🇵', region: 'Asia' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', region: 'Asia' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', region: 'Asia' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', region: 'Asia' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', region: 'Europe' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', region: 'Europe' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', region: 'Europe' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', flag: '🇵🇱', region: 'Europe' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿', region: 'Europe' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺', region: 'Europe' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', region: 'Europe' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', region: 'South America' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', region: 'North America' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷', region: 'South America' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱', region: 'South America' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', region: 'Africa' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', region: 'Asia' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱', region: 'Asia' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', region: 'Asia' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', region: 'Asia' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', region: 'Asia' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', region: 'Asia' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', region: 'Asia' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', region: 'Asia' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', region: 'Asia' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', region: 'Oceania' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼', region: 'Asia' }
]

interface CurrencySelectorProps {
  value?: string
  onValueChange?: (currency: string) => void
  placeholder?: string
  disabled?: boolean
  showSymbol?: boolean
  showFlag?: boolean
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

export function CurrencySelector({
  value,
  onValueChange,
  placeholder = "Select currency",
  disabled = false,
  showSymbol = true,
  showFlag = true,
  variant = 'default',
  className
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const selectedCurrency = currencies.find(currency => currency.code === value)
  
  const filteredCurrencies = currencies.filter(currency =>
    currency.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchValue.toLowerCase())
  )

  const popularCurrencies = currencies.filter(currency => currency.popular)
  const otherCurrencies = filteredCurrencies.filter(currency => !currency.popular)

  const groupedCurrencies = otherCurrencies.reduce((acc, currency) => {
    const region = currency.region || 'Other'
    if (!acc[region]) {
      acc[region] = []
    }
    acc[region].push(currency)
    return acc
  }, {} as Record<string, Currency[]>)

  const renderCurrencyOption = (currency: Currency, showRegion = false) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {showFlag && <span className="text-lg">{currency.flag}</span>}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{currency.code}</span>
            {showSymbol && currency.symbol !== currency.code && (
              <span className="text-muted-foreground">({currency.symbol})</span>
            )}
          </div>
          {variant === 'detailed' && (
            <span className="text-xs text-muted-foreground">{currency.name}</span>
          )}
        </div>
      </div>
      {showRegion && currency.region && (
        <Badge variant="outline" className="text-xs">
          {currency.region}
        </Badge>
      )}
    </div>
  )

  const renderSelectedValue = () => {
    if (!selectedCurrency) return placeholder

    switch (variant) {
      case 'compact':
        return (
          <div className="flex items-center gap-1">
            {showFlag && <span>{selectedCurrency.flag}</span>}
            <span>{selectedCurrency.code}</span>
          </div>
        )
      case 'detailed':
        return (
          <div className="flex items-center gap-2">
            {showFlag && <span>{selectedCurrency.flag}</span>}
            <div className="flex flex-col">
              <span className="font-medium">{selectedCurrency.code}</span>
              <span className="text-xs text-muted-foreground">{selectedCurrency.name}</span>
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2">
            {showFlag && <span>{selectedCurrency.flag}</span>}
            <span>{selectedCurrency.code}</span>
            {showSymbol && selectedCurrency.symbol !== selectedCurrency.code && (
              <span className="text-muted-foreground">({selectedCurrency.symbol})</span>
            )}
          </div>
        )
    }
  }

  if (variant === 'compact') {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn("w-auto min-w-[100px]", className)}>
          <SelectValue placeholder={placeholder}>
            {renderSelectedValue()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {popularCurrencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {renderCurrencyOption(currency)}
            </SelectItem>
          ))}
          {popularCurrencies.length > 0 && otherCurrencies.length > 0 && (
            <div className="px-2 py-1">
              <div className="h-px bg-border" />
            </div>
          )}
          {Object.entries(groupedCurrencies).map(([region, regionCurrencies]) => (
            <div key={region}>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {region}
              </div>
              {regionCurrencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {renderCurrencyOption(currency)}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          {renderSelectedValue()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search currencies..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No currency found.</CommandEmpty>
            
            {/* Popular Currencies */}
            {popularCurrencies.length > 0 && (
              <CommandGroup>
                <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <Star className="h-3 w-3" />
                  Popular
                </div>
                {popularCurrencies
                  .filter(currency =>
                    currency.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                    currency.code.toLowerCase().includes(searchValue.toLowerCase())
                  )
                  .map((currency) => (
                    <CommandItem
                      key={currency.code}
                      value={currency.code}
                      onSelect={(currentValue) => {
                        const v = String(currentValue)
                        onValueChange?.(v === value ? "" : v)
                        setOpen(false)
                      }}
                      className="flex items-center justify-between"
                    >
                      {renderCurrencyOption(currency)}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === currency.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {/* Other Currencies by Region */}
            {Object.entries(groupedCurrencies).map(([region, regionCurrencies]) => (
              <CommandGroup key={region}>
                <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  {region}
                </div>
                {regionCurrencies.map((currency) => (
                  <CommandItem
                    key={currency.code}
                    value={currency.code}
                    onSelect={(currentValue) => {
                      const v = String(currentValue)
                      onValueChange?.(v === value ? "" : v)
                      setOpen(false)
                    }}
                    className="flex items-center justify-between"
                  >
                    {renderCurrencyOption(currency)}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === currency.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Utility function to get currency info
export function getCurrencyInfo(code: string): Currency | undefined {
  return currencies.find(currency => currency.code === code)
}

// Utility function to format currency
export function formatCurrency(amount: number, currencyCode: string, locale = 'en-US'): string {
  const currency = getCurrencyInfo(currencyCode)
  if (!currency) return `${amount} ${currencyCode}`

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency.symbol}${amount.toFixed(2)}`
  }
}

// Utility function to get popular currencies
export function getPopularCurrencies(): Currency[] {
  return currencies.filter(currency => currency.popular)
}

// Utility function to get currencies by region
export function getCurrenciesByRegion(region: string): Currency[] {
  return currencies.filter(currency => currency.region === region)
}