"use client"

import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppSidebar />
        <SidebarInset>
          <Header title="Spending Overview" />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Loading spending data...
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
          <Header title="Spending Overview" />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Error loading spending data
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
        <Header title="Spending Overview" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <SpendingChart 
            data={spendingData?.data?.data || []} 
          />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
