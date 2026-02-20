"use client"

import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppSidebar />
        <SidebarInset>
          <Header title="Category Breakdown" />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Loading category data...
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
          <Header title="Category Breakdown" />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Error loading category data
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
        <Header title="Category Breakdown" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <CategoryBreakdown 
            data={categoryData?.data?.data || []} 
            detailed={true}
          />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
