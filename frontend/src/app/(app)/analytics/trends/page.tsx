"use client"

import { Header } from "@/components/common/header"
import { ExpenseTrends } from "@/components/analytics/expense-trends"
import { useQuery } from "@tanstack/react-query"
import { analyticsAPI } from "@/lib/api"
import { useCurrency } from "@/contexts/currency-context"

export default function TrendsAnalyticsPage() {
  const { userCurrency } = useCurrency()

  const { data: trendsData, isLoading, error } = useQuery({
    queryKey: ["expense-trends", userCurrency],
    queryFn: () => analyticsAPI.getExpenseTrends({ baseCurrency: userCurrency }),
  })

  return (
    <>
      <Header title="Expense Trends" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Loading trends data...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Error loading trends data
          </div>
        ) : (
          <ExpenseTrends
            data={trendsData?.data?.data || []}
            period="6months"
          />
        )}
      </div>
    </>
  )
}
