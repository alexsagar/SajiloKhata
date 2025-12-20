import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware to protect private routes
 * 
 * This middleware checks for:
 * 1. NextAuth session cookie (for OAuth users)
 * 2. Custom auth token cookie (for email/password users)
 * 
 * Note: We check cookies directly instead of calling auth() to avoid
 * issues with edge runtime and to keep the middleware fast.
 */

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/expenses",
  "/groups",
  "/friends",
  "/analytics",
  "/calendar",
  "/chat",
  "/settings",
]

// Routes that should redirect to home if already authenticated
const authRoutes = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }
  
  // Check for NextAuth session cookie
  const nextAuthSession = request.cookies.get("authjs.session-token")?.value ||
                          request.cookies.get("__Secure-authjs.session-token")?.value
  
  // Check for custom auth token (your existing auth system)
  const authToken = request.cookies.get("token")?.value
  
  const isAuthenticated = !!nextAuthSession || !!authToken
  
  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(route => pathname === route)
  
  // For the home page, allow access but the page itself will handle auth
  if (pathname === "/") {
    return NextResponse.next()
  }
  
  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Redirect authenticated users from auth routes to home
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  
  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icons|images|manifest.json|sw.js|workbox-*).*)",
  ],
}
