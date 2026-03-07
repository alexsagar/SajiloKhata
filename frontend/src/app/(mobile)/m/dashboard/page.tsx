"use client"

import { Dashboard } from "@/components/dashboard/dashboard"
import { MobileHeader } from "@/components/mobile/mobile-header"

export default function MobileDashboardPage() {
    return (
        <>
            <MobileHeader title="Dashboard" />
            <div className="flex flex-col gap-3 px-3 py-3 w-full overflow-x-hidden">
                <Dashboard />
            </div>
        </>
    )
}
