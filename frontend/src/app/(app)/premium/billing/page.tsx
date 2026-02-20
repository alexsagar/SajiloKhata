import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { BillingHistory } from "@/components/premium/billing-history"

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Billing" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <BillingHistory />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
