import { AppLayout } from "@/components/common/app-layout"
import { Header } from "@/components/common/header"
import { AnalyticsDashboardClient } from "@/components/analytics/analytics-client"

export const revalidate = 60

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <Header title="Analytics" description="Insights into your spending patterns" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <AnalyticsDashboardClient />
      </div>
    </AppLayout>
  )
}
