import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { SecuritySettings } from "@/components/settings/security-settings"

export default function SecuritySettingsPage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Security Settings" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <SecuritySettings />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
