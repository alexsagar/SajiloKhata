import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { GroupSettings } from "@/components/groups/group-settings"

interface GroupSettingsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function GroupSettingsPage({ params }: GroupSettingsPageProps) {
  const { id } = await params
  
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Group Settings" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <GroupSettings groupId={id} />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
