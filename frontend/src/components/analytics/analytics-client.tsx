"use client"
import dynamic from "next/dynamic"
import { ComponentLoading } from "@/components/ui/loading"

// Load heavy dashboard only on client (charts etc.)
export const AnalyticsDashboardClient = dynamic(
  () => import("@/components/analytics/analytics-dashboard").then(m => m.AnalyticsDashboard),
  { 
    ssr: false, 
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <ComponentLoading 
          text="Loading Analytics Dashboard" 
          subtitle="Please wait while we prepare your financial insights..."
        />
      </div>
    )
  }
)


