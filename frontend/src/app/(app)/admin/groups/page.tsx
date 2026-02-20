import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { GroupManagement } from "@/components/admin/group-management"
import { Header } from "@/components/common/header"

export default function AdminGroupsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppSidebar />
      <SidebarInset>
        <Header title="Group Management" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <GroupManagement />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
