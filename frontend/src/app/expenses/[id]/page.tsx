import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ExpenseDetails } from "@/components/expenses/expense-details"

interface ExpensePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ExpensePage({ params }: ExpensePageProps) {
  const { id } = await params
  
  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <Header title="Expense Details" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <ExpenseDetails expenseId={id} />
        </div>
      </SidebarInset>
    </ProtectedRoute>
  )
}
