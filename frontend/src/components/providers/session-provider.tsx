"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

interface SessionProviderProps {
  children: React.ReactNode
  session?: Session | null
}

/**
 * SessionProvider wrapper for NextAuth
 * Enables useSession() hook throughout the app
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  )
}
