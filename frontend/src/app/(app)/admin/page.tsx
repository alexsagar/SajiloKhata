import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { Header } from "@/components/common/header"

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppSidebar />
      <SidebarInset>
        <Header title="Admin Dashboard" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <AdminDashboard />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
