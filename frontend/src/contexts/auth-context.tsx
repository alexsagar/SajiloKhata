"use client"

import React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import type { User } from "@/types/user"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  refreshAuth: () => Promise<void>
  loading: boolean
  isAuthenticated: boolean
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
  const router = useRouter()

  const isAuthenticated = !!user

  // Utility function to normalize user object
  const normalizeUser = (userData: any) => {
    if (!userData) return null
    
    // Ensure user object has the correct id field
    if (userData._id && !userData.id) {
      userData.id = userData._id
      console.log('AuthContext: Normalized user - Added id field from _id:', userData.id)
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
          whatsapp: false,
        },
        privacy: {
          profileVisibility: "friends",
        },
      }
      console.log('AuthContext: Normalized user - Added default preferences')
    }
    
    return userData
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    let retryCount = 0
    const maxRetries = 3
    
    const attemptAuth = async (): Promise<any> => {
      try {
        console.log(`AuthContext: Attempting authentication (attempt ${retryCount + 1})...`)
        const response = await authAPI.me()
        console.log('AuthContext: API response:', response)
        console.log('AuthContext: Response data structure:', response.data)
        
        // Try different possible data structures
        let user = null
        if (response.data?.user) {
          user = response.data.user
          console.log('AuthContext: Found user in response.data.user')
        } else if (response.data?.data?.user) {
          user = response.data.data.user
          console.log('AuthContext: Found user in response.data.data.user')
        } else if (response.data?.id) {
          // If the response itself is the user object
          user = response.data
          console.log('AuthContext: Response data is the user object')
        } else {
          console.log('AuthContext: No user found in response, data keys:', Object.keys(response.data || {}))
        }
        
        // Ensure user object has the correct id field
        if (user && user._id && !user.id) {
          user.id = user._id
          console.log('AuthContext: Added id field from _id:', user.id)
        }
        
        // Normalize the user object
        user = normalizeUser(user)
        
        console.log('AuthContext: Final extracted user:', user)
        return user
      } catch (error: any) {
        console.log(`AuthContext: Auth check error (attempt ${retryCount + 1}):`, error)
        console.log('AuthContext: Error response:', error.response)
        console.log('AuthContext: Error status:', error.response?.status)
        
        // If it's a 401, don't retry
        if (error?.response?.status === 401) {
          throw error
        }
        
        // If we haven't exceeded max retries, try again
        if (retryCount < maxRetries) {
          retryCount++
          console.log(`AuthContext: Retrying in 1 second... (${retryCount}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return attemptAuth()
        }
        
        throw error
      }
    }
    
    try {
      const user = await attemptAuth()
      setUser(user)
    } catch (error: any) {
      console.log('AuthContext: All auth attempts failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
      console.log('AuthContext: Auth check completed, loading set to false')
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      let user = response.data?.data?.user || response.data.user
      
      // Ensure user object has the correct id field
      if (user && user._id && !user.id) {
        user.id = user._id
        console.log('AuthContext: Login - Added id field from _id:', user.id)
      }
      
      // Normalize the user object
      user = normalizeUser(user)
      
      setUser(user)

      toast({
        title: "Welcome back!",
        description: `Hello ${user.firstName}, you're successfully logged in.`,
      })

      router.push("/")
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || "Login failed"
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      })
      throw new Error(message)
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      const response = await authAPI.register(userData)
      
      toast({
        title: "Account Created Successfully!",
        description: "Please log in with your new account.",
      })

      router.push("/login")
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || "Registration failed"
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      })
      throw new Error(message)
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch {}
    setUser(null)

    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })

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
        user,
        login,
        register,
        logout,
        updateUser,
        refreshAuth,
        loading,
        isAuthenticated,
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
