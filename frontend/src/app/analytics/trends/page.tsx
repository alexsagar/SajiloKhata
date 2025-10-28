"use client"

import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppSidebar />
        <SidebarInset>
          <Header title="Expense Trends" />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Loading trends data...
            </div>
          </div>
        </SidebarInset>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <AppSidebar />
        <SidebarInset>
          <Header title="Expense Trends" />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Error loading trends data
            </div>
          </div>
        </SidebarInset>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Expense Trends" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <ExpenseTrends 
            data={trendsData?.data?.data || []}
            period="6months"
          />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
