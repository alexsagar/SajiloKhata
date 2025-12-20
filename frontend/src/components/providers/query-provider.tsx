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
            // Cache data for reasonable time but allow fresh data when needed
            staleTime: 2 * 60 * 1000, // 2 minutes
            gcTime: 10 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
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
