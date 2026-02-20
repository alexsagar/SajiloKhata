import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PreferenceSettings } from "@/components/settings/preference-settings"

export default function PreferencesPage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Preferences" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <PreferenceSettings />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
