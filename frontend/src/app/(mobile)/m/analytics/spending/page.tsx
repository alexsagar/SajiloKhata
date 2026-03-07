"use client"

import { MobileHeader } from "@/components/mobile/mobile-header"
import { SpendingChart } from "@/components/analytics/spending-chart"
import { useQuery } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api"
import { useCurrency } from "@/contexts/currency-context"
import { MobileListSkeleton } from "@/components/mobile/mobile-skeleton"

export default function MobileSpendingPage() {
    const { userCurrency } = useCurrency()

    const { data: spendingData, isLoading, error } = useQuery({
        queryKey: ["spending-overview", userCurrency],
        queryFn: () => analyticsAPI.getSpendingOverview({ baseCurrency: userCurrency }),
    })

    return (
        <>
            <MobileHeader title="Spending Overview" showBack />
            <div className="flex flex-col gap-3 px-3 py-3">
                {isLoading ? (
                    <MobileListSkeleton count={3} />
                ) : error ? (
                    <div className="flex items-center justify-center h-[300px] text-[hsl(var(--muted-foreground))]">
                        Error loading spending data
                    </div>
                ) : (
                    <SpendingChart data={spendingData?.data?.data || []} />
                )}
            </div>
        </>
    )
}
