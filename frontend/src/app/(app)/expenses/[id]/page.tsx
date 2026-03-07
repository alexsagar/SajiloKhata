import { Header } from "@/components/common/header"
import { ExpenseDetails } from "@/components/expenses/expense-details"

interface ExpensePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ExpensePage({ params }: ExpensePageProps) {
  const { id } = await params

  return (
    <>
      <Header title="Expense Details" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ExpenseDetails expenseId={id} />
      </div>
    </>
  )
}
