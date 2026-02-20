import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { NotificationSettings } from "@/components/notifications/notification-settings"

export default function NotificationSettingsPage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Notification Settings" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <NotificationSettings />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
