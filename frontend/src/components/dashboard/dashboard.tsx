"use client"

import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { BalanceOverview } from "./balance-overview"
import { RecentTransactions } from "./recent-transactions"
import { ExpenseChart } from "./expense-chart"
import { QuickActions } from "./quick-actions"
import { GroupSummary } from "./group-summary"

export function Dashboard() {
  return (
    <div className="dashboard-container-full space-y-6 w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden', minWidth: '100%' }}>
      {/* Balance Overview Cards - Full Width Grid */}
      <div className="dashboard-grid-full grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        <BalanceOverview />
      </div>

      {/* Quick Actions - Full Width */}
      <div className="dashboard-content-full w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        <QuickActions />
      </div>

      {/* Chart Section - Responsive Grid */}
      <div className="dashboard-grid-full grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-7 w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        <KanbanCard className="col-span-4">
          <KanbanCardHeader>
            <KanbanCardTitle>Expense Overview</KanbanCardTitle>
            <KanbanCardDescription>Your spending patterns over the last 6 months</KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent className="pl-2">
            <ExpenseChart />
          </KanbanCardContent>
        </KanbanCard>

        <KanbanCard className="col-span-3">
          <KanbanCardHeader>
            <KanbanCardTitle>Recent Transactions</KanbanCardTitle>
            <KanbanCardDescription>Your latest expense activities</KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent>
            <RecentTransactions />
          </KanbanCardContent>
        </KanbanCard>
      </div>

      {/* Group Summary - Full Width */}
      <div className="dashboard-content-full w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        <GroupSummary />
      </div>
    </div>
  )
}
