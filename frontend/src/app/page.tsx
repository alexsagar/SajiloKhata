"use client"

import { AppLayout } from "@/components/common/app-layout"
import { Dashboard } from "@/components/dashboard/dashboard"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function Home() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Header title="Dashboard" />
        <div className="mt-3 sm:mt-4 flex flex-1 flex-col gap-4 w-full max-w-full overflow-x-hidden">
          <Dashboard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
