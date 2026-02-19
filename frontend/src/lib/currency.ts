export interface Currency {
  code: string
  name: string
  symbol: string
  decimals: number
  flag?: string
  popular?: boolean
  region?: string
}

// Always show our mapped symbol (e.g., NPR -> रू) regardless of locale behavior
export function formatCurrencyWithSymbol(amount: number, currencyCode = 'USD', locale = 'en-US'): string {
  // Handle invalid amounts
  if (isNaN(amount) || !isFinite(amount)) {
    amount = 0
  }

  const currency = getCurrency(currencyCode)
  const decimals = currency?.decimals ?? 2
  const symbol = getCurrencySymbol(currencyCode)

  try {
    const number = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
    return `${symbol}${number}`
  } catch {
    return `${symbol}${amount.toFixed(decimals)}`
  }
}

export const CURRENCIES: Currency[] = [
  // Popular currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, flag: '🇺🇸', popular: true, region: 'North America' },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, flag: '🇪🇺', popular: true, region: 'Europe' },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, flag: '🇬🇧', popular: true, region: 'Europe' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, flag: '🇯🇵', popular: true, region: 'Asia' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, flag: '🇨🇦', popular: true, region: 'North America' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, flag: '🇦🇺', popular: true, region: 'Oceania' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, flag: '🇨🇭', popular: true, region: 'Europe' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, flag: '🇨🇳', popular: true, region: 'Asia' },

  // Other major currencies
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, flag: '🇮🇳', region: 'Asia' },
  { code: 'NPR', name: 'Nepali Rupee', symbol: 'रू', decimals: 2, flag: '🇳🇵', region: 'Asia' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0, flag: '🇰🇷', region: 'Asia' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, flag: '🇸🇬', region: 'Asia' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, flag: '🇭🇰', region: 'Asia' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2, flag: '🇸🇪', region: 'Europe' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2, flag: '🇳🇴', region: 'Europe' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2, flag: '🇩🇰', region: 'Europe' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimals: 2, flag: '🇵🇱', region: 'Europe' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimals: 2, flag: '🇨🇿', region: 'Europe' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimals: 0, flag: '🇭🇺', region: 'Europe' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimals: 2, flag: '🇷🇺', region: 'Europe' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2, flag: '🇧🇷', region: 'South America' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimals: 2, flag: '🇲🇽', region: 'North America' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', decimals: 2, flag: '🇦🇷', region: 'South America' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', decimals: 0, flag: '🇨🇱', region: 'South America' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2, flag: '🇿🇦', region: 'Africa' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimals: 2, flag: '🇹🇷', region: 'Asia' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', decimals: 2, flag: '🇮🇱', region: 'Asia' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, flag: '🇦🇪', region: 'Asia' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimals: 2, flag: '🇸🇦', region: 'Asia' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2, flag: '🇹🇭', region: 'Asia' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, flag: '🇲🇾', region: 'Asia' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0, flag: '🇮🇩', region: 'Asia' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimals: 2, flag: '🇵🇭', region: 'Asia' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimals: 0, flag: '🇻🇳', region: 'Asia' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, flag: '🇳🇿', region: 'Oceania' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', decimals: 0, flag: '🇹🇼', region: 'Asia' }
]

export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find(currency => currency.code === code)
}

export function formatCurrency(amount: number, currencyCode = 'USD', locale = 'en-US'): string {
  // Handle NaN and invalid amounts
  if (isNaN(amount) || !isFinite(amount)) {
    amount = 0
  }

  const currency = getCurrency(currencyCode)
  if (!currency) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(amount)
  } catch (error) {

    // Fallback to basic formatting if Intl.NumberFormat fails
    return `${getCurrencySymbol(currencyCode)}${amount.toFixed(currency.decimals)}`
  }
}

export function formatCurrencyCompact(amount: number, currencyCode = 'USD', locale = 'en-US'): string {
  const currency = getCurrency(currencyCode)
  if (!currency) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
    }).format(amount)
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      notation: 'compact',
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(amount)
  } catch (error) {
    // Fallback to basic formatting
    const symbol = getCurrencySymbol(currencyCode)
    if (amount >= 1000000) {
      return `${symbol}${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `${symbol}${(amount / 1000).toFixed(1)}K`
    }
    return `${symbol}${amount.toFixed(currency.decimals)}`
  }
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const fromRate = exchangeRates[fromCurrency] || 1
  const toRate = exchangeRates[toCurrency] || 1

  // Convert to base currency (USD) then to target currency
  const baseAmount = amount / fromRate
  return baseAmount * toRate
}

export function getCurrencySymbol(currencyCode: string): string {
  const currency = getCurrency(currencyCode)
  return currency?.symbol || currencyCode
}

export function getCurrencyName(currencyCode: string): string {
  const currency = getCurrency(currencyCode)
  return currency?.name || currencyCode
}

export function getCurrencyFlag(currencyCode: string): string {
  const currency = getCurrency(currencyCode)
  return currency?.flag || '🌐'
}

export function isPopularCurrency(currencyCode: string): boolean {
  const currency = getCurrency(currencyCode)
  return currency?.popular || false
}

export function getCurrenciesByRegion(region?: string): Currency[] {
  if (!region) return CURRENCIES
  return CURRENCIES.filter(currency => currency.region === region)
}

export function getPopularCurrencies(): Currency[] {
  return CURRENCIES.filter(currency => currency.popular)
}

export function parseCurrencyAmount(value: string): number {
  const cleanValue = value.replace(/[^\d.-]/g, '')
  return Number.parseFloat(cleanValue) || 0
}

export function validateCurrencyAmount(value: string): boolean {
  const amount = parseCurrencyAmount(value)
  return !isNaN(amount) && amount >= 0
}

// Fallback exchange rates — used ONLY when the live API is unreachable.
// These are approximate and should never be treated as accurate for financial calculations.
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  CAD: 1.25,
  AUD: 1.35,
  JPY: 110.0,
  CHF: 0.92,
  CNY: 6.45,
  INR: 74.5,
  NPR: 132.5,
  BRL: 5.2,
  KRW: 1100.0,
  SGD: 1.35,
  HKD: 7.8,
  SEK: 8.5,
  NOK: 8.8,
  DKK: 6.3,
  PLN: 3.8,
  CZK: 21.5,
  HUF: 300.0,
  RUB: 75.0,
  MXN: 20.0,
  ARS: 95.0,
  CLP: 800.0,
  ZAR: 15.0,
  TRY: 8.5,
  ILS: 3.2,
  AED: 3.67,
  SAR: 3.75,
  THB: 33.0,
  MYR: 4.2,
  IDR: 14000.0,
  PHP: 50.0,
  VND: 23000.0,
  NZD: 1.45,
  TWD: 28.0,
}

// Re-export for backward compatibility (consumers should prefer fetchExchangeRates)
export const MOCK_EXCHANGE_RATES = FALLBACK_RATES

// --- In-memory cache ---
let cachedRates: Record<string, number> | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Fetch live exchange rates from the Frankfurter API (ECB data, free, no key).
 * Falls back to FALLBACK_RATES on network/parsing errors.
 * Results are cached in-memory for 1 hour to avoid rate limits.
 */
export async function fetchExchangeRates(baseCurrency = "USD"): Promise<Record<string, number>> {
  const now = Date.now()

  // Return cached rates if still fresh
  if (cachedRates && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRates
  }

  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(baseCurrency)}`
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`)
    }

    const json = await response.json()
    const rates: Record<string, number> = { [baseCurrency]: 1.0, ...json.rates }

    // Merge fallback currencies that the API may not cover (e.g., NPR, VND)
    for (const [code, fallbackRate] of Object.entries(FALLBACK_RATES)) {
      if (!(code in rates)) {
        rates[code] = fallbackRate
      }
    }

    cachedRates = rates
    cacheTimestamp = now
    return rates
  } catch {
    console.warn("[Currency] Failed to fetch live exchange rates, using fallback values")
    // Return fallback rates so the app continues to function
    return FALLBACK_RATES
  }
}

export function formatAmountWithCurrency(amount: number, currencyCode: string, options?: {
  showSymbol?: boolean
  showCode?: boolean
  compact?: boolean
  locale?: string
}): string {
  const {
    showSymbol = true,
    showCode = false,
    compact = false,
    locale = 'en-US'
  } = options || {}

  const currency = getCurrency(currencyCode)
  if (!currency) {
    return `${amount.toFixed(2)} ${currencyCode}`
  }

  const formattedAmount = compact
    ? formatCurrencyCompact(amount, currencyCode, locale)
    : formatCurrency(amount, currencyCode, locale)

  if (showSymbol && showCode) {
    return `${formattedAmount} (${currencyCode})`
  } else if (showCode) {
    return `${amount.toFixed(currency.decimals)} ${currencyCode}`
  }

  return formattedAmount
}