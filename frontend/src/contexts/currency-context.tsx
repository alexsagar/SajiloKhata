"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./auth-context"

interface CurrencyContextType {
  currency: string
  userCurrency: string
  setCurrency: (currency: string) => void
  setUserCurrency: (currency: string) => void
  isUserCurrency: boolean // indicates if current currency matches user preference
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currency, setCurrencyState] = useState<string>("USD")
  const [overrideUserCurrency, setOverrideUserCurrency] = useState<string | null>(null)

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem("user_currency")
    if (savedCurrency) {
      setCurrencyState(savedCurrency)
      setOverrideUserCurrency(savedCurrency)
    }
  }, [])

  // Automatically set currency from user preferences
  useEffect(() => {
    if (user?.preferences?.currency) {
      setCurrencyState(user.preferences.currency)
    }
  }, [user?.preferences?.currency])

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency)
  }

  // Set user currency (used during onboarding)
  const setUserCurrency = (newCurrency: string) => {
    setOverrideUserCurrency(newCurrency)
    setCurrencyState(newCurrency)
  }

  const userCurrency = overrideUserCurrency || user?.preferences?.currency || "USD"
  const isUserCurrency = currency === userCurrency

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        userCurrency,
        setCurrency,
        setUserCurrency,
        isUserCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider")
  }
  return context
}
