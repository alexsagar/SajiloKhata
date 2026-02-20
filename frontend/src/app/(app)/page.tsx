"use client"

import { Dashboard } from "@/components/dashboard/dashboard"
import { Header } from "@/components/common/header"

export default function Home() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="mt-3 sm:mt-4 flex flex-1 flex-col gap-4 w-full max-w-full overflow-x-hidden">
        <Dashboard />
      </div>
    </>
  )
}
