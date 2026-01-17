"use client"

import React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut as nextAuthSignOut } from "next-auth/react"
import { authAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import type { User } from "@/types/user"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<{ email: string }>
  registerVerifyOtp: (email: string, otp: string) => Promise<void>
  registerResendOtp: (email: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  refreshAuth: () => Promise<void>
  loading: boolean
  isAuthenticated: boolean
  isOAuthUser: boolean
}

interface RegisterData {
  email: string
  password: string
  username: string
  firstName: string
  lastName: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  // Check if user is authenticated via OAuth
  const isOAuthUser = !!session?.user
  const [oauthSynced, setOauthSynced] = useState(false)
  const [oauthSyncFailed, setOauthSyncFailed] = useState(false)
  
  // Sync OAuth user with backend when session is available
  useEffect(() => {
    const syncOAuthUser = async () => {
      if (session?.user && !user && !oauthSynced && !oauthSyncFailed) {
        try {
          // Use NextAuth session data to sync with backend via /auth/oauth.
          const provider = (session.user as any).provider || "oauth"
          const rawEmail = session.user.email || ""
          const providerAccountId = (session.user as any).providerAccountId as string | undefined
          const fallbackId = (session.user as any).id as string | undefined

          const providerId = providerAccountId || fallbackId || rawEmail

          // Some Facebook accounts won't return an email even with the email permission.
          // Our backend requires a non-empty email, so in that case we synthesize one
          // from the providerId so the user can still log in.
          const email = rawEmail || (providerId ? `${providerId}@${provider}.oauth.local` : "")

          if (!providerId || !email) {
            console.error("OAuth session missing required fields for backend sync", {
              provider,
              providerId,
              hasEmail: !!email,
            })

            setOauthSyncFailed(true)
            setOauthSynced(true)

            await nextAuthSignOut({ redirect: false })
            router.push("/login")
            return
          }

          const response = await authAPI.oauthLogin({
            provider,
            providerId,
            email,
            name: session.user.name || "",
            firstName: session.user.name?.split(" ")[0] || "",
            lastName: session.user.name?.split(" ").slice(1).join(" ") || "",
            avatar: session.user.image || "",
          })

          // Response should include backend user and set cookies for access/refresh tokens
          let backendUser: any = null
          if (response.data?.data?.user) {
            backendUser = response.data.data.user
          } else if (response.data?.user) {
            backendUser = response.data.user
          }

          backendUser = normalizeUser(backendUser)

          if (backendUser) {
            setUser(backendUser)
            setOauthSynced(true)
            setOauthSyncFailed(false)
          } else {
            console.error("Backend OAuth sync returned no user")
            setOauthSyncFailed(true)
            setOauthSynced(true)

            await nextAuthSignOut({ redirect: false })
            router.push("/login")
          }
        } catch (error) {
          console.error("Failed to sync OAuth user with backend:", error)
          // Mark sync as failed - user should not be considered authenticated
          setOauthSyncFailed(true)
          setOauthSynced(true)
          
          // Sign out from NextAuth since backend sync failed
          await nextAuthSignOut({ redirect: false })
          router.push("/login")
        }
      }
    }
    
    if (sessionStatus === "authenticated" && !loading) {
      syncOAuthUser()
    }
  }, [session, sessionStatus, user, oauthSynced, oauthSyncFailed, loading, router])
  
  // Create user object from OAuth session if no backend user
  const oauthUser: User | null = session?.user ? {
    id: (session.user as any).backendUserId || session.user.id || "",
    email: session.user.email || "",
    firstName: session.user.name?.split(" ")[0] || "",
    lastName: session.user.name?.split(" ").slice(1).join(" ") || "",
    username: session.user.email?.split("@")[0] || "",
    avatar: session.user.image || undefined,
    role: "user",
    isActive: true,
    isPremium: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    preferences: {
      currency: "USD",
      baseCurrency: "USD",
      language: "en",
      theme: "system",
      timezone: "America/New_York",
      dateFormat: "MM/DD/YYYY",
      autoSplit: true,
      defaultSplitType: "equal",
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      privacy: {
        profileVisibility: "friends",
      },
    },
  } as User : null
  
  // Use backend user if available, otherwise use OAuth user (only if sync succeeded)
  const currentUser = user || (oauthSynced && !oauthSyncFailed ? oauthUser : null)
  
  // Combined authentication check - only authenticated if we have a backend user
  // OAuth-only users without backend sync are NOT considered authenticated
  const isAuthenticated = !!user || (oauthSynced && !oauthSyncFailed && !!oauthUser)

  // Utility function to normalize user object
  const normalizeUser = (userData: any) => {
    if (!userData) return null
    
    // Ensure user object has the correct id field
    if (userData._id && !userData.id) {
      userData.id = userData._id
      
    }
    
    // Ensure preferences exist
    if (!userData.preferences) {
      userData.preferences = {
        currency: "USD",
        baseCurrency: "USD",
        language: "en",
        theme: "system",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        autoSplit: true,
        defaultSplitType: "equal",
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        privacy: {
          profileVisibility: "friends",
        },
      }
      
    }
    
    return userData
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    let retryCount = 0
    const suppress = typeof window !== 'undefined' && sessionStorage.getItem('suppressAuthCheck') === '1'
    const maxRetries = suppress ? 0 : 1
    const retryDelayMs = 250
    if (suppress) {
      try { sessionStorage.removeItem('suppressAuthCheck') } catch {}
    }
    
    const attemptAuth = async (): Promise<any> => {
      try {
        const response = await authAPI.me()
        
        // Try different possible data structures
        let user = null
        if (response.data?.user) {
          user = response.data.user
          
        } else if (response.data?.data?.user) {
          user = response.data.data.user
          
        } else if (response.data?.id) {
          // If the response itself is the user object
          user = response.data
          
        }
        
        // Ensure user object has the correct id field
        if (user && user._id && !user.id) {
          user.id = user._id
          
        }
        
        // Normalize the user object
        user = normalizeUser(user)
        
        return user
      } catch (error: any) {
        // If it's a 401, don't retry
        if (error?.response?.status === 401) {
          throw error
        }
        
        // If we haven't exceeded max retries, try again
        if (retryCount < maxRetries) {
          retryCount++
          await new Promise(resolve => setTimeout(resolve, retryDelayMs))
          return attemptAuth()
        }
        
        throw error
      }
    }
    
    try {
      const user = await attemptAuth()
      setUser(user)
    } catch (error: any) {
      
      setUser(null)
    } finally {
      setLoading(false)
      
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      let user = response.data?.data?.user || response.data.user
      
      // Ensure user object has the correct id field
      if (user && user._id && !user.id) {
        user.id = user._id
        
      }
      
      // Normalize the user object
      user = normalizeUser(user)
      
      setUser(user)

      toast({
        title: "Welcome back!",
        description: `Hello ${user.firstName}, you're successfully logged in.`,
      })

      try { sessionStorage.setItem('suppressAuthCheck', '1') } catch {}
      router.push("/")
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || "Login failed"
      throw error
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      const response = await authAPI.register(userData)

      const email = response.data?.email || userData.email
      return { email }
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || "Registration failed"
      throw new Error(message)
    }
  }

  const registerVerifyOtp = async (email: string, otp: string) => {
    try {
      await authAPI.registerVerifyOtp(email, otp)
      router.push("/login?signup=success")
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || "OTP verification failed"
      throw new Error(message)
    }
  }

  const registerResendOtp = async (email: string) => {
    try {
      await authAPI.registerResendOtp(email)
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || "Failed to resend OTP"
      throw new Error(message)
    }
  }

  const logout = async () => {
    try {
      // Logout from backend if we have a backend session
      if (user) {
        await authAPI.logout()
      }
      // Logout from NextAuth if we have an OAuth session
      if (isOAuthUser) {
        await nextAuthSignOut({ redirect: false })
      }
    } catch {}
    setUser(null)

    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })

    try { sessionStorage.setItem('suppressAuthCheck', '1') } catch {}
    router.push("/login")
  }

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null
      const updatedUser = { ...prev, ...userData }
      return normalizeUser(updatedUser)
    })
  }

  const refreshAuth = async () => {
    setLoading(true)
    await checkAuth()
    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        login,
        register,
        registerVerifyOtp,
        registerResendOtp,
        logout,
        updateUser,
        refreshAuth,
        loading: loading || sessionStatus === "loading",
        isAuthenticated,
        isOAuthUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
