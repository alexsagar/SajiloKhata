import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ProfileSettings } from "@/components/settings/profile-settings"

export default function ProfileSettingsPage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Profile Settings" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <ProfileSettings />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
