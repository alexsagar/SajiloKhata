import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ContentModeration } from "@/components/admin/content-moderation"
import { Header } from "@/components/common/header"

export default function AdminModerationPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppSidebar />
      <SidebarInset>
        <Header title="Content Moderation" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <ContentModeration />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}