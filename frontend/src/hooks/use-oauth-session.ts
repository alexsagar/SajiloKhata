"use client"

import { useSession, signOut as nextAuthSignOut } from "next-auth/react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

/**
 * Hook to manage OAuth session alongside existing auth
 * 
 * This hook provides a unified interface for:
 * - Checking authentication status (OAuth or email/password)
 * - Getting user data from either auth method
 * - Signing out from both auth systems
 */
export function useOAuthSession() {
  const { data: session, status } = useSession()
  const { user: authUser, logout: authLogout, isAuthenticated: isAuthAuthenticated } = useAuth()
  const router = useRouter()

  // Combined authentication status
  const isAuthenticated = isAuthAuthenticated || !!session?.user
  const isLoading = status === "loading"

  // Get user from either auth system
  const user = authUser || (session?.user ? {
    id: session.user.backendUserId || session.user.id,
    email: session.user.email,
    firstName: session.user.name?.split(" ")[0] || "",
    lastName: session.user.name?.split(" ").slice(1).join(" ") || "",
    avatar: session.user.image,
    provider: session.user.provider,
  } : null)

  // Sign out from both auth systems
  const signOut = async () => {
    try {
      // Sign out from custom auth if logged in
      if (isAuthAuthenticated) {
        await authLogout()
      }
      
      // Sign out from NextAuth if logged in
      if (session) {
        await nextAuthSignOut({ redirect: false })
      }
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })
      
      router.push("/login")
    } catch (error) {
      console.error("Sign out error:", error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    signOut,
    isOAuthUser: !!session?.user,
    isEmailUser: isAuthAuthenticated && !session?.user,
  }
}
