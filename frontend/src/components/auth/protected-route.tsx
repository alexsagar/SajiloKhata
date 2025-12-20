"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { useSession } from "next-auth/react"
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
  const { user, loading: authLoading, isAuthenticated: isAuthAuthenticated } = useAuth()
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  // Combined loading state
  const loading = authLoading || sessionStatus === "loading"
  
  // User is authenticated if either auth system has a valid session
  const isAuthenticated = isAuthAuthenticated || !!session?.user
  
  // Get user from either auth system
  const currentUser = user || (session?.user ? {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.name?.split(" ")[0] || "",
    lastName: session.user.name?.split(" ").slice(1).join(" ") || "",
    avatar: session.user.image,
    role: "user", // Default role for OAuth users
  } : null)

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
  if (requireAdmin && currentUser?.role !== 'admin') {
    return (
      <PageError
        title="Access Denied"
        message="You don't have permission to access this page. Admin access required."
        onRetry={undefined}
        onHome={() => router.push("/")}
      />
    )
  }

  if (requiredRole && currentUser?.role !== requiredRole) {
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
