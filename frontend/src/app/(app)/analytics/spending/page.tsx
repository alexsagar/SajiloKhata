"use client"

import { Header } from "@/components/common/header"
import { SpendingChart } from "@/components/analytics/spending-chart"
import { useQuery } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api"
import { useCurrency } from "@/contexts/currency-context"

export default function SpendingAnalyticsPage() {
  const { userCurrency } = useCurrency()

  const { data: spendingData, isLoading, error } = useQuery({
    queryKey: ["spending-overview", userCurrency],
    queryFn: () => analyticsAPI.getSpendingOverview({ baseCurrency: userCurrency }),
  })

  return (
    <>
      <Header title="Spending Overview" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Loading spending data...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Error loading spending data
          </div>
        ) : (
          <SpendingChart
            data={spendingData?.data?.data || []}
          />
        )}
      </div>
    </>
  )
}
