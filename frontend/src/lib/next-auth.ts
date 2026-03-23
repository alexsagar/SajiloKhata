import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import type { NextAuthConfig } from "next-auth"
import type { JWT } from "next-auth/jwt"

/**
 * NextAuth.js Configuration for Google and Facebook OAuth
 * 
 * This integrates with your existing auth system by:
 * 1. Handling OAuth flow with Google/Facebook
 * 2. Syncing the OAuth user with your backend
 * 3. Storing user data in JWT session
 */

type ExtendedJWT = JWT & {
  accessToken?: string
  provider?: string
  providerAccountId?: string
  backendUserId?: string
  id?: string
}

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
      const extendedToken = token as ExtendedJWT
      void profile
      // Initial sign in
      if (account && user) {
        extendedToken.accessToken = account.access_token
        extendedToken.provider = account.provider
        extendedToken.id = user.id
        // Store providerAccountId so the client can sync with backend
        // (e.g. Facebook numeric id or Google sub)
        extendedToken.providerAccountId = account.providerAccountId
        extendedToken.email = user.email
        extendedToken.name = user.name
        extendedToken.image = user.image
      }
      
      return extendedToken
    },
    
    // Make user data available in session
    async session({ session, token }) {
      const extendedToken = token as ExtendedJWT
      if (token) {
        session.user.id = extendedToken.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
        session.user.provider = extendedToken.provider
        session.user.providerAccountId = extendedToken.providerAccountId as string | undefined
        session.user.backendUserId = extendedToken.backendUserId
        session.accessToken = extendedToken.accessToken
      }
      return session
    },
    
    // Control which users can sign in
    async signIn({ account, profile, user }) {
      void user
      void profile
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
