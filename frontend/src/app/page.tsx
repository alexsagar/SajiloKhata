"use client"

import { AppLayout } from "@/components/common/app-layout"
import { Dashboard } from "@/components/dashboard/dashboard"
import { Header } from "@/components/common/header"

export default function Home() {
  return (
    <AppLayout>
      <Header title="Dashboard" />
      <div className="flex flex-1 flex-col gap-4 p-4 w-full overflow-x-hidden" style={{ width: '100%', maxWidth: '100%' }}>
        <Dashboard />
      </div>
    </AppLayout>
  )
}
