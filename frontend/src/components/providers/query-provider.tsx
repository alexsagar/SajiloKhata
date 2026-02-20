"use client"

import type React from "react"

import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Enterprise-safe defaults: prefer cache, opt-in to refetch per query
            staleTime: 5 * 60 * 1000, // 5 minutes — queries stay fresh longer
            gcTime: 10 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: false, // opt-in per query where freshness matters
            refetchOnMount: true, // refetch only when stale (respects staleTime)
            refetchOnReconnect: false, // avoid reconnect storms
            placeholderData: keepPreviousData,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
