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
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ExpenseCalendar />
      </div>
    </AppLayout>
  )
}