import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { SimpleGroupTest } from "@/components/chat/simple-group-test"

export default function TestDeletePage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Test Delete" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <SimpleGroupTest />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}