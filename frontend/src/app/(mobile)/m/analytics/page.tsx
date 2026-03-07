"use client"

import { MobileHeader } from "@/components/mobile/mobile-header"
import { AnalyticsDashboardClient } from "@/components/analytics/analytics-client"

export default function MobileAnalyticsPage() {
    return (
        <>
            <MobileHeader title="Analytics" showBack />
            <div className="flex flex-col gap-3 px-3 py-3 w-full overflow-x-hidden">
                <AnalyticsDashboardClient />
            </div>
        </>
    )
}
