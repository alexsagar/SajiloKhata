"use client"

import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { BalanceOverview } from "./balance-overview"
import { RecentTransactions } from "./recent-transactions"
import { ExpenseChart } from "./expense-chart"
import { QuickActions } from "./quick-actions"
import { GroupSummary } from "./group-summary"

export function Dashboard() {
  return (
    <div className="dashboard-container-full space-y-4 sm:space-y-6 w-full">
      {/* Balance Overview Cards - Mobile horizontal, desktop grid */}
      <div className="dashboard-grid-full flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 md:grid md:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:overflow-visible">
        <BalanceOverview />
      </div>

      {/* Quick Actions - Full Width */}
      <div className="dashboard-content-full w-full">
        <QuickActions />
      </div>

      {/* Chart Section - Responsive Grid */}
      <div className="dashboard-grid-full grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-7 w-full">
        <KanbanCard className="col-span-1 md:col-span-1 lg:col-span-4">
          <KanbanCardHeader className="pb-2 sm:pb-4">
            <KanbanCardTitle className="text-sm sm:text-base">Expense Overview</KanbanCardTitle>
            <KanbanCardDescription className="text-xs sm:text-sm">Your spending patterns over the last 6 months</KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent className="pl-2">
            <ExpenseChart />
          </KanbanCardContent>
        </KanbanCard>

        <KanbanCard className="col-span-1 md:col-span-1 lg:col-span-3 w-full overflow-hidden">
          <KanbanCardHeader className="pb-2 sm:pb-4">
            <KanbanCardTitle className="text-sm sm:text-base">Recent Transactions</KanbanCardTitle>
            <KanbanCardDescription className="text-xs sm:text-sm">Your latest expense activities</KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent>
            <RecentTransactions />
          </KanbanCardContent>
        </KanbanCard>
      </div>

      {/* Group Summary - Full Width */}
      <div className="dashboard-content-full w-full">
        <GroupSummary />
      </div>
    </div>
  )
}
