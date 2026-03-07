"use client"

import { Header } from "@/components/common/header"
import { CategoryBreakdown } from "@/components/analytics/category-breakdown"
import { useQuery } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api"
import { useCurrency } from "@/contexts/currency-context"

export default function CategoriesAnalyticsPage() {
  const { userCurrency } = useCurrency()

  const { data: categoryData, isLoading, error } = useQuery({
    queryKey: ["category-breakdown", userCurrency],
    queryFn: () => analyticsAPI.getCategoryBreakdown({ baseCurrency: userCurrency }),
  })

  return (
    <>
      <Header title="Category Breakdown" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Loading category data...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
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
