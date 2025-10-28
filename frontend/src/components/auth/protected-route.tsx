"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { PageLoading } from "@/components/ui/loading"
import { PageError } from "@/components/ui/error-display"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requiredRole, requireAdmin }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return <PageLoading text="Verifying authentication..." />
  }

  if (!isAuthenticated) {
    return null
  }

  // Check for admin requirement
  if (requireAdmin && user?.role !== 'admin') {
    return (
      <PageError
        title="Access Denied"
        message="You don't have permission to access this page. Admin access required."
        onRetry={undefined}
        onHome={() => router.push("/")}
      />
    )
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <PageError
        title="Access Denied"
        message="You don't have permission to access this page."
        onRetry={undefined}
        onHome={() => router.push("/")}
      />
    )
  }

  return <>{children}</>
}
