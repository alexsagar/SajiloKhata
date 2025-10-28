"use client"

import { formatAmountWithCurrency, getCurrencySymbol, getCurrencyName } from "@/lib/currency"
import { cn } from "@/lib/utils"

interface CurrencyDisplayProps {
  amount: number
  currencyCode: string
  showSymbol?: boolean
  showCode?: boolean
  compact?: boolean
  locale?: string
  className?: string
  variant?: 'default' | 'large' | 'small' | 'mono'
  showTooltip?: boolean
}

export function CurrencyDisplay({
  amount,
  currencyCode,
  showSymbol = true,
  showCode = false,
  compact = false,
  locale = 'en-US',
  className,
  variant = 'default',
  showTooltip = false
}: CurrencyDisplayProps) {
  const formattedAmount = formatAmountWithCurrency(amount, currencyCode, {
    showSymbol,
    showCode,
    compact,
    locale
  })

  const currencySymbol = getCurrencySymbol(currencyCode)
  const currencyName = getCurrencyName(currencyCode)

  const getVariantClasses = () => {
    switch (variant) {
      case 'large':
        return 'text-2xl font-bold'
      case 'small':
        return 'text-sm'
      case 'mono':
        return 'font-mono'
      default:
        return 'text-base'
    }
  }

  const content = (
    <span className={cn(getVariantClasses(), className)}>
      {formattedAmount}
    </span>
  )

  if (showTooltip) {
    return (
      <span
        className="cursor-help"
        title={`${currencyName} (${currencyCode})`}
      >
        {content}
      </span>
    )
  }

  return content
}

interface CurrencyBadgeProps {
  currencyCode: string
  showSymbol?: boolean
  showCode?: boolean
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CurrencyBadge({
  currencyCode,
  showSymbol = true,
  showCode = true,
  variant = 'default',
  size = 'md',
  className
}: CurrencyBadgeProps) {
  const currencySymbol = getCurrencySymbol(currencyCode)
  const currencyName = getCurrencyName(currencyCode)

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-3 py-1.5 text-sm'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
      case 'secondary':
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90'
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors',
        getSizeClasses(),
        getVariantClasses(),
        className
      )}
      title={currencyName}
    >
      {showSymbol && <span>{currencySymbol}</span>}
      {showCode && <span>{currencyCode}</span>}
    </span>
  )
}

interface CurrencyComparisonProps {
  amount: number
  fromCurrency: string
  toCurrency: string
  exchangeRate?: number
  className?: string
}

export function CurrencyComparison({
  amount,
  fromCurrency,
  toCurrency,
  exchangeRate,
  className
}: CurrencyComparisonProps) {
  if (fromCurrency === toCurrency || !exchangeRate) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <CurrencyDisplay amount={amount} currencyCode={fromCurrency} />
      </div>
    )
  }

  const convertedAmount = amount * exchangeRate

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CurrencyDisplay amount={amount} currencyCode={fromCurrency} />
      <span className="text-muted-foreground">≈</span>
      <CurrencyDisplay amount={convertedAmount} currencyCode={toCurrency} />
      <span className="text-xs text-muted-foreground">
        (1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency})
      </span>
    </div>
  )
}
