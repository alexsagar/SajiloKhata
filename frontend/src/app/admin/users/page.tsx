import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserManagement } from "@/components/admin/user-management"
import { Header } from "@/components/common/header"

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppSidebar />
      <SidebarInset>
        <Header title="User Management" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <UserManagement />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
