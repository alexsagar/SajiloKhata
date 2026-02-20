"use client"

import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

/**
 * Shared expenses query hook.
 *
 * All dashboard widgets should use this instead of calling
 * `expenseAPI.getExpenses()` directly, so React Query can
 * de-duplicate requests and serve from cache on route transitions.
 *
 * Query key structure:
 * - ["expenses", "all"]    → full expense list (balance-overview, expense-chart, group-summary)
 * - ["expenses", 8]        → recent 8 expenses (recent-transactions)
 *
 * Invalidation: any mutation that creates/updates/deletes an expense
 * should call `queryClient.invalidateQueries({ queryKey: ["expenses"] })`
 * which invalidates both variants.
 */
export function useExpensesQuery(options?: {
    limit?: number
    sort?: string
}) {
    const { user } = useAuth()
    const limitKey = options?.limit ?? "all"

    return useQuery({
        queryKey: ["expenses", limitKey],
        queryFn: async () => {
            const response = await expenseAPI.getExpenses(options)
            return response.data
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 min — dashboard data doesn't need 15s polling
        gcTime: 10 * 60 * 1000,
        // No refetchInterval — rely on invalidation after mutations
    })
}
