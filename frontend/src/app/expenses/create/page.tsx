import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { CreateExpenseForm } from "@/components/expenses/create-expense-form"

export default function CreateExpensePage() {
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Create Expense" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <CreateExpenseForm />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
