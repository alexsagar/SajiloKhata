import { AppLayout } from "@/components/common/app-layout"
import { Header } from "@/components/common/header"
import { ExpenseCalendar } from "@/components/calendar/expense-calendar"

export default function CalendarPage() {
  return (
    <AppLayout>
      <Header 
        title="Calendar" 
        description="View your expenses and payments in a calendar format" 
      />
      <div className="mt-3 sm:mt-4 flex flex-1 flex-col gap-4 w-full max-w-full overflow-x-hidden">
        <ExpenseCalendar />
      </div>
    </AppLayout>
  )
}