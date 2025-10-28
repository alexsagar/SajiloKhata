import { AppLayout } from "@/components/common/app-layout"
import { Header } from "@/components/common/header"
import { SystemAnalytics } from "@/components/admin/system-analytics"

export default function AdminAnalyticsPage() {
  return (
    <AppLayout>
      <Header title="System Analytics" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <SystemAnalytics />
      </div>
    </AppLayout>
  )
}
