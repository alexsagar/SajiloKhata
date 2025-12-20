"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { CurrencyOnboardingDialog } from "./currency-onboarding-dialog"

/**
 * OnboardingProvider
 * 
 * Shows onboarding dialogs for new users:
 * - Currency selection dialog for users who haven't set their currency
 */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth()
  const [showCurrencyOnboarding, setShowCurrencyOnboarding] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Wait for auth to load
    if (loading || hasChecked) return

    // Check if user needs onboarding
    if (isAuthenticated && user) {
      // Check if this is a new user or user hasn't set currency preferences
      const needsOnboarding = checkNeedsOnboarding(user)
      
      if (needsOnboarding) {
        // Small delay to let the page render first
        setTimeout(() => {
          setShowCurrencyOnboarding(true)
        }, 500)
      }
      
      setHasChecked(true)
    }
  }, [user, loading, isAuthenticated, hasChecked])

  // Reset check when user changes (e.g., logout/login)
  useEffect(() => {
    if (!isAuthenticated) {
      setHasChecked(false)
      setShowCurrencyOnboarding(false)
    }
  }, [isAuthenticated])

  const handleOnboardingComplete = () => {
    setShowCurrencyOnboarding(false)
    // Mark onboarding as complete in localStorage to prevent showing again
    if (user?.id) {
      localStorage.setItem(`onboarding_complete_${user.id}`, "true")
    }
  }

  return (
    <>
      {children}
      <CurrencyOnboardingDialog
        open={showCurrencyOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </>
  )
}

/**
 * Check if user needs onboarding
 */
function checkNeedsOnboarding(user: any): boolean {
  // User must have a valid ID (from backend)
  if (!user?.id || user.id === "" || user.id.startsWith("local-")) {
    return false
  }

  // Check localStorage first
  const onboardingComplete = localStorage.getItem(`onboarding_complete_${user.id}`)
  if (onboardingComplete === "true") {
    return false
  }

  // Check if user was created recently (within last 5 minutes)
  const createdAt = user.createdAt ? new Date(user.createdAt) : null
  const isNewUser = createdAt && (Date.now() - createdAt.getTime()) < 5 * 60 * 1000

  // Check if user has default currency (USD) - might need to set their preferred currency
  const hasDefaultCurrency = !user.preferences?.currency || user.preferences.currency === "USD"

  // Show onboarding only for new users with default currency
  return !!(isNewUser && hasDefaultCurrency)
}
