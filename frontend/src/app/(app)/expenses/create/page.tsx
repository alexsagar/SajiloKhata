import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { CreateExpenseForm } from "@/components/expenses/create-expense-form"

export default function CreateExpensePage() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
        <div className="shrink-0 hidden lg:block h-screen sticky top-0">
          <AppSidebar />
        </div>
        <SidebarInset className="flex-1 flex flex-col w-full min-w-0 max-w-full overflow-x-hidden">
          <Header title="Create Expense" />
          <div className="mt-3 sm:mt-4 flex flex-1 flex-col gap-4 w-full max-w-full overflow-x-hidden px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4">
            <CreateExpenseForm />
          </div>
        </SidebarInset>
      </div>
    </ProtectedRoute>
  )
}
