"use client"

import { MobileHeader } from "@/components/mobile/mobile-header"
import { ExpenseTrends } from "@/components/analytics/expense-trends"
import { useQuery } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api"
import { useCurrency } from "@/contexts/currency-context"
import { MobileListSkeleton } from "@/components/mobile/mobile-skeleton"

export default function MobileTrendsPage() {
    const { userCurrency } = useCurrency()

    const { data: trendsData, isLoading, error } = useQuery({
        queryKey: ["expense-trends", userCurrency],
        queryFn: () => analyticsAPI.getExpenseTrends({ baseCurrency: userCurrency }),
    })

    return (
        <>
            <MobileHeader title="Expense Trends" showBack />
            <div className="flex flex-col gap-3 px-3 py-3">
                {isLoading ? (
                    <MobileListSkeleton count={3} />
                ) : error ? (
                    <div className="flex items-center justify-center h-[300px] text-[hsl(var(--muted-foreground))]">
                        Error loading trends data
                    </div>
                ) : (
                    <ExpenseTrends data={trendsData?.data?.data || []} period="6months" />
                )}
            </div>
        </>
    )
}
