import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PrivacyControls } from "@/components/settings/privacy-controls"

export default function PrivacySettingsPage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Privacy Settings" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <PrivacyControls />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
