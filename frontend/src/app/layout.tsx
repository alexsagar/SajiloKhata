
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
// Removed theme provider - now dark-only
import { QueryProvider } from "@/components/providers/query-provider"
import { ToastProvider } from "@/components/providers/toast-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AuthProvider } from "@/contexts/auth-context"
import { CurrencyProvider } from "@/contexts/currency-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { SocketProvider } from "@/contexts/socket-context"
import { OfflineProvider } from "@/contexts/offline-context"
import { Toaster } from "@/components/ui/toaster"
import { OfflineIndicator } from "@/components/offline/offline-indicator"
import { ErrorBoundary } from "@/components/common/error-boundary"

const inter = Inter({ subsets: ["latin"] })

// ✅ This remains for SEO
export const metadata: Metadata = {
  title: "SplitWise - Smart Expense Sharing",
  description: "Split expenses with friends and family easily with AI-powered features",
  manifest: "/manifest.json",
  keywords: ["expense sharing", "split bills", "group expenses", "money management"],
  authors: [{ name: "SplitWise Team" }],
  openGraph: {
    title: "SplitWise - Smart Expense Sharing",
    description: "Split expenses with friends and family easily",
    type: "website",
    locale: "en_US",
  },
}


// ✅ Move themeColor + viewport here separately
export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en"  suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.className} dark`}>
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <CurrencyProvider>
                <NotificationProvider>
                  <SocketProvider>
                    <OfflineProvider>
                      <SidebarProvider>
                        <ToastProvider>
                          {children}
                          <Toaster />
                          <OfflineIndicator />
                        </ToastProvider>
                      </SidebarProvider>
                    </OfflineProvider>
                  </SocketProvider>
                </NotificationProvider>
              </CurrencyProvider>
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
