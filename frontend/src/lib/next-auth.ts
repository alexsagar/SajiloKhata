import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import type { NextAuthConfig } from "next-auth"

/**
 * NextAuth.js Configuration for Google and Facebook OAuth
 * 
 * This integrates with your existing auth system by:
 * 1. Handling OAuth flow with Google/Facebook
 * 2. Syncing the OAuth user with your backend
 * 3. Storing user data in JWT session
 */

const config: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "public_profile,email",
        },
      },
    }),
  ],
  
  // Use JWT strategy for session handling
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Custom pages
  pages: {
    signIn: "/login",
    error: "/login",
  },
  
  callbacks: {
    // Handle JWT token creation and updates
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token
        token.provider = account.provider
        token.id = user.id
        // Store providerAccountId so the client can sync with backend
        // (e.g. Facebook numeric id or Google sub)
        // @ts-ignore
        token.providerAccountId = account.providerAccountId
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }
      
      return token
    },
    
    // Make user data available in session
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
        // @ts-ignore - Add custom fields
        session.user.provider = token.provider
        // @ts-ignore
        session.user.providerAccountId = token.providerAccountId as string | undefined
        // @ts-ignore
        session.user.backendUserId = token.backendUserId
        // @ts-ignore
        session.accessToken = token.accessToken
      }
      return session
    },
    
    // Control which users can sign in
    async signIn({ user, account, profile }) {
      // Allow all OAuth sign-ins
      if (account?.provider === "google" || account?.provider === "facebook") {
        return true
      }
      return true
    },
    
    // Redirect after sign in
    async redirect({ url, baseUrl }) {
      // Redirect to homepage after successful login
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  
  // Enable debug in development
  debug: process.env.NODE_ENV === "development",
  
  // Trust host for deployment
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)

// Type augmentation for session
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image: string
      provider?: string
      providerAccountId?: string
      backendUserId?: string
    }
    accessToken?: string
  }
}
