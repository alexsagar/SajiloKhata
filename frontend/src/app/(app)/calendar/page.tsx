import { Header } from "@/components/common/header"
import { CalendarClient } from "@/components/calendar/calendar-client"

export default function CalendarPage() {
  return (
    <>
      <Header
        title="Calendar"
        description="View your expenses and payments in a calendar format"
      />
      <div className="mt-3 sm:mt-4 flex flex-1 flex-col gap-4 w-full max-w-full overflow-x-hidden">
        <CalendarClient />
      </div>
    </>
  )
}
