"use client"

import { MobileHeader } from "@/components/mobile/mobile-header"
import { CategoryBreakdown } from "@/components/analytics/category-breakdown"
import { useQuery } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api"
import { useCurrency } from "@/contexts/currency-context"
import { MobileListSkeleton } from "@/components/mobile/mobile-skeleton"

export default function MobileCategoriesPage() {
    const { userCurrency } = useCurrency()

    const { data: categoryData, isLoading, error } = useQuery({
        queryKey: ["category-breakdown", userCurrency],
        queryFn: () => analyticsAPI.getCategoryBreakdown({ baseCurrency: userCurrency }),
    })

    return (
        <>
            <MobileHeader title="Category Breakdown" showBack />
            <div className="flex flex-col gap-3 px-3 py-3">
                {isLoading ? (
                    <MobileListSkeleton count={3} />
                ) : error ? (
                    <div className="flex items-center justify-center h-[300px] text-[hsl(var(--muted-foreground))]">
                        Error loading category data
                    </div>
                ) : (
                    <CategoryBreakdown
                        data={categoryData?.data?.data || []}
                        detailed={true}
                    />
                )}
            </div>
        </>
    )
}
