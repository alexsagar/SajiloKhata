import { Header } from "@/components/common/header"
import { CreateExpenseForm } from "@/components/expenses/create-expense-form"

export default function CreateExpensePage() {
  return (
    <>
      <Header title="Create Expense" />
      <div className="mt-3 sm:mt-4 flex flex-1 flex-col gap-4 w-full max-w-full overflow-x-hidden px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4">
        <CreateExpenseForm />
      </div>
    </>
  )
}
