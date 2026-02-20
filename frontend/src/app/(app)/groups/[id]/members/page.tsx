import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { GroupMembers } from "@/components/groups/group-members"

interface GroupMembersPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function GroupMembersPage({ params }: GroupMembersPageProps) {
  const { id } = await params
  
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Group Members" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <GroupMembers groupId={id} />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
