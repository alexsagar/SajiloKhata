import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { FeatureFlags } from "@/components/admin/feature-flags"
import { Header } from "@/components/common/header"

export default function AdminSettingsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppSidebar />
      <SidebarInset>
        <Header title="Admin Settings" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <FeatureFlags />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
