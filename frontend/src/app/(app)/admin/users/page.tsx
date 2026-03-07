import { Header } from "@/components/common/header"
import { UserManagement } from "@/components/admin/user-management"

export default function AdminUsersPage() {
  return (
    <>
      <Header title="User Management" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <UserManagement />
      </div>
    </>
  )
}
