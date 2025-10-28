import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { TestDeleteGroup } from "@/components/groups/test-delete-group"

export default function TestGroupDeletePage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Test Group Delete" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <TestDeleteGroup />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}