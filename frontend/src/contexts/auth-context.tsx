"use client"

import React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut as nextAuthSignOut } from "next-auth/react"
import type { Session } from "next-auth"
import type { AxiosError } from "axios"
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
  updateUser: (userData: UserUpdatePatch) => void
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
type AuthError = AxiosError<{ error?: string; message?: string }>
type OAuthSessionUser = NonNullable<Session["user"]>
type BackendUser = User & { _id?: string }
type UserUpdatePatch = Partial<Omit<User, "preferences">> & {
  preferences?: Partial<User["preferences"]>
}
type AuthMeResponse = {
  user?: BackendUser
  data?: {
    user?: BackendUser
  }
  id?: string
}
const defaultPreferences: User["preferences"] = {
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  // Check if user is authenticated via OAuth
  const isOAuthUser = !!session?.user
  const [oauthSynced, setOauthSynced] = useState(false)
  const [oauthSyncFailed, setOauthSyncFailed] = useState(false)
  const checkAuth = useCallback(async () => {
    let retryCount = 0
    const suppress = typeof window !== "undefined" && sessionStorage.getItem("suppressAuthCheck") === "1"
    const maxRetries = suppress ? 0 : 1
    const retryDelayMs = 250
    if (suppress) {
      try { sessionStorage.removeItem("suppressAuthCheck") } catch {}
    }

    const attemptAuth = async (): Promise<BackendUser | null> => {
      try {
        const response = await authAPI.me()
        const data = response.data as AuthMeResponse
        let nextUser = data?.user || data?.data?.user || (data?.id ? (data as BackendUser) : null)
        nextUser = normalizeUser(nextUser)
        return nextUser
      } catch (error) {
        const authError = error as AuthError
        if (authError?.response?.status === 401) {
          throw authError
        }
        if (retryCount < maxRetries) {
          retryCount++
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
          return attemptAuth()
        }
        throw authError
      }
    }

    try {
      const nextUser = await attemptAuth()
      setUser(nextUser)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Sync OAuth user with backend when session is available
  useEffect(() => {
    const syncOAuthUser = async () => {
      if (session?.user && !user && !oauthSynced && !oauthSyncFailed) {
        try {
          const sessionUser = session.user as OAuthSessionUser
          // Use NextAuth session data to sync with backend via /auth/oauth.
          const provider = sessionUser.provider || "oauth"
          const rawEmail = sessionUser.email || ""
          const providerAccountId = sessionUser.providerAccountId
          const fallbackId = sessionUser.id

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
          let backendUser: BackendUser | null = null
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
  const oauthSessionUser = session?.user as OAuthSessionUser | undefined
  const oauthUser: User | null = oauthSessionUser ? {
    id: oauthSessionUser.backendUserId || oauthSessionUser.id || "",
    email: oauthSessionUser.email || "",
    firstName: oauthSessionUser.name?.split(" ")[0] || "",
    lastName: oauthSessionUser.name?.split(" ").slice(1).join(" ") || "",
    username: oauthSessionUser.email?.split("@")[0] || "",
    avatar: oauthSessionUser.image || undefined,
    role: "user",
    isActive: true,
    isPremium: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    preferences: defaultPreferences,
  } as User : null
  
  // Use backend user if available, otherwise use OAuth user (only if sync succeeded)
  const currentUser = user || (oauthSynced && !oauthSyncFailed ? oauthUser : null)
  
  // Combined authentication check - only authenticated if we have a backend user
  // OAuth-only users without backend sync are NOT considered authenticated
  const isAuthenticated = !!user || (oauthSynced && !oauthSyncFailed && !!oauthUser)

  // Utility function to normalize user object
  const normalizeUser = (userData: BackendUser | null | undefined): BackendUser | null => {
    if (!userData) return null
    
    // Ensure user object has the correct id field
    if (userData._id && !userData.id) {
      userData.id = userData._id
      
    }
    
    // Ensure preferences exist
    if (!userData.preferences) {
      userData.preferences = defaultPreferences
      
    }
    
    return userData
  }

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      let user = (response.data?.data?.user || response.data.user) as BackendUser | null
      
      // Ensure user object has the correct id field
      if (user && user._id && !user.id) {
        user.id = user._id
        
      }
      
      // Normalize the user object
      user = normalizeUser(user)
      
      setUser(user)

      toast({
        title: "Welcome back!",
        description: `Hello ${user?.firstName || "there"}, you're successfully logged in.`,
      })

      try { sessionStorage.setItem('suppressAuthCheck', '1') } catch {}
      router.push("/")
    } catch (error) {
      const authError = error as AuthError
      const message = authError.response?.data?.error || authError.response?.data?.message || "Login failed"
      void message
      throw error
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      const response = await authAPI.register({ ...userData })

      const email = response.data?.email || userData.email
      return { email }
    } catch (error) {
      const authError = error as AuthError
      const message = authError.response?.data?.error || authError.response?.data?.message || "Registration failed"
      throw new Error(message)
    }
  }

  const registerVerifyOtp = async (email: string, otp: string) => {
    try {
      await authAPI.registerVerifyOtp(email, otp)
      router.push("/login?signup=success")
    } catch (error) {
      const authError = error as AuthError
      const message = authError.response?.data?.error || authError.response?.data?.message || "OTP verification failed"
      throw new Error(message)
    }
  }

  const registerResendOtp = async (email: string) => {
    try {
      await authAPI.registerResendOtp(email)
    } catch (error) {
      const authError = error as AuthError
      const message = authError.response?.data?.error || authError.response?.data?.message || "Failed to resend OTP"
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

  const updateUser = (userData: UserUpdatePatch) => {
    setUser((prev) => {
      if (!prev) return null
      const updatedUser = {
        ...prev,
        ...userData,
        preferences: userData.preferences
          ? {
              ...prev.preferences,
              ...userData.preferences,
            }
          : prev.preferences,
      }
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
