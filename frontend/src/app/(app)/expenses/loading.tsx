import { PageLoading } from "@/components/ui/loading"

export default function ExpensesLoading() {
  return (
    <PageLoading 
      text="Loading Expenses" 
      subtitle="Please wait while we load your expense data..."
    />
  )
}
