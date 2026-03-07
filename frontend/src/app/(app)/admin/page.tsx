import { Header } from "@/components/common/header"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default function AdminPage() {
  return (
    <>
      <Header title="Admin Dashboard" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <AdminDashboard />
      </div>
    </>
  )
}
