import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { EditExpenseForm } from "@/components/expenses/edit-expense-form"

interface EditExpensePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = await params
  
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Edit Expense" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <EditExpenseForm expenseId={id} />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
