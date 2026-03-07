import { Header } from "@/components/common/header"
import { GroupManagement } from "@/components/admin/group-management"

export default function AdminGroupsPage() {
  return (
    <>
      <Header title="Group Management" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <GroupManagement />
      </div>
    </>
  )
}
