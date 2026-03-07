"use client"

import dynamic from "next/dynamic"
import { ComponentLoading } from "@/components/ui/loading"

export const CalendarClient = dynamic(
  () => import("@/components/calendar/expense-calendar").then((m) => m.ExpenseCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[420px] flex items-center justify-center">
        <ComponentLoading
          text="Loading Calendar"
          subtitle="Preparing your calendar view..."
        />
      </div>
    ),
  }
)

