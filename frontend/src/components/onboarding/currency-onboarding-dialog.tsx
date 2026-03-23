"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useCurrency } from "@/contexts/currency-context"
import { userAPI } from "@/lib/api"
import { CURRENCIES } from "@/lib/currency"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { Globe, Search, Check, Loader2 } from "lucide-react"

// Countries with their default currencies
const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP" },
  { code: "EU", name: "European Union", flag: "🇪🇺", currency: "EUR" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY" },
  { code: "CN", name: "China", flag: "🇨🇳", currency: "CNY" },
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR" },
  { code: "NP", name: "Nepal", flag: "🇳🇵", currency: "NPR" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", currency: "KRW" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", currency: "SGD" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", currency: "HKD" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", currency: "CHF" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", currency: "SEK" },
  { code: "NO", name: "Norway", flag: "🇳🇴", currency: "NOK" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", currency: "DKK" },
  { code: "PL", name: "Poland", flag: "🇵🇱", currency: "PLN" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿", currency: "CZK" },
  { code: "HU", name: "Hungary", flag: "🇭🇺", currency: "HUF" },
  { code: "RU", name: "Russia", flag: "🇷🇺", currency: "RUB" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", currency: "BRL" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", currency: "MXN" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", currency: "ARS" },
  { code: "CL", name: "Chile", flag: "🇨🇱", currency: "CLP" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", currency: "ZAR" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", currency: "TRY" },
  { code: "IL", name: "Israel", flag: "🇮🇱", currency: "ILS" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currency: "SAR" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", currency: "THB" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", currency: "MYR" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", currency: "IDR" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", currency: "PHP" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", currency: "VND" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", currency: "NZD" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", currency: "TWD" },
]

interface CurrencyOnboardingDialogProps {
  open: boolean
  onComplete: () => void
}

interface UserPreferenceUpdate {
  preferences: {
    currency: string
    baseCurrency: string
    country?: string | null
  }
}

export function CurrencyOnboardingDialog({ open, onComplete }: CurrencyOnboardingDialogProps) {
  const { user, updateUser } = useAuth()
  const { setUserCurrency } = useCurrency()
  const [step, setStep] = useState<"country" | "currency">("country")
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter countries based on search
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter currencies based on search
  const filteredCurrencies = CURRENCIES.filter(currency =>
    currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // When country is selected, pre-select its default currency
  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode)
    const country = COUNTRIES.find(c => c.code === countryCode)
    if (country) {
      setSelectedCurrency(country.currency)
    }
    setSearchTerm("")
    setStep("currency")
  }

  // Handle currency selection
  const handleCurrencySelect = (currencyCode: string) => {
    setSelectedCurrency(currencyCode)
  }

  // Save preferences
  const handleComplete = async () => {
    if (!selectedCurrency) return

    setIsSubmitting(true)
    try {
      // Try to update user preferences in backend
      try {
        await userAPI.updatePreferences({
          currency: selectedCurrency,
          baseCurrency: selectedCurrency,
          country: selectedCountry,
        })
      } catch (apiError) {
        // If API fails (e.g., OAuth user without backend sync), just continue
        console.warn("Could not save to backend, saving locally:", apiError)
      }

      // Update local state
      updateUser({
        preferences: {
          ...user?.preferences,
          currency: selectedCurrency,
          baseCurrency: selectedCurrency,
        },
      } as UserPreferenceUpdate)

      // Update currency context
      setUserCurrency(selectedCurrency)

      // Save to localStorage as fallback
      localStorage.setItem("user_currency", selectedCurrency)
      localStorage.setItem("user_country", selectedCountry || "")

      toast({
        title: "Welcome aboard! 🎉",
        description: `Your currency has been set to ${selectedCurrency}. You can change this anytime in Settings.`,
      })

      onComplete()
    } catch (error) {
      console.error("Failed to save preferences:", error)
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-500" />
            {step === "country" ? "Where are you from?" : "Choose your currency"}
          </DialogTitle>
          <DialogDescription>
            {step === "country" 
              ? "Select your country to set up your account with the right currency."
              : "This currency will be used for all your expenses and transactions."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={step === "country" ? "Search countries..." : "Search currencies..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Country Selection */}
          {step === "country" && (
            <ScrollArea className="h-[300px] pr-4">
              <div className="grid grid-cols-1 gap-2">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleCountrySelect(country.code)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover:bg-white/5 ${
                      selectedCountry === country.code
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-white/10"
                    }`}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{country.name}</p>
                      <p className="text-xs text-muted-foreground">Default: {country.currency}</p>
                    </div>
                    {selectedCountry === country.code && (
                      <Check className="h-4 w-4 text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Currency Selection */}
          {step === "currency" && (
            <>
              <ScrollArea className="h-[250px] pr-4">
                <div className="grid grid-cols-1 gap-2">
                  {/* Show popular currencies first */}
                  {filteredCurrencies
                    .sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))
                    .map((currency) => (
                      <button
                        key={currency.code}
                        onClick={() => handleCurrencySelect(currency.code)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover:bg-white/5 ${
                          selectedCurrency === currency.code
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-white/10"
                        }`}
                      >
                        <span className="text-2xl">{currency.flag}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {currency.code} - {currency.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Symbol: {currency.symbol}
                          </p>
                        </div>
                        {selectedCurrency === currency.code && (
                          <Check className="h-4 w-4 text-emerald-500" />
                        )}
                      </button>
                    ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("country")
                    setSearchTerm("")
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!selectedCurrency || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
