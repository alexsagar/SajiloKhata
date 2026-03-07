"use client"

import { MobileHeader } from "@/components/mobile/mobile-header"
import { CalendarClient } from "@/components/calendar/calendar-client"

export default function MobileCalendarPage() {
    return (
        <>
            <MobileHeader title="Calendar" showBack />
            <div className="flex flex-col gap-3 px-3 py-3 w-full overflow-x-hidden">
                <CalendarClient />
            </div>
        </>
    )
}
