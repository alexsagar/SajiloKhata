"use client"

import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { DollarSign, TrendingUp, TrendingDown, Users, CreditCard, PiggyBank } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { ComponentLoading } from "@/components/ui/loading"

export function BalanceOverview() {
  const { user } = useAuth()

  // Fetch expense summary data
  const { data: expenseSummary, isLoading, error } = useQuery({
    queryKey: ["expense-summary"],
    queryFn: async () => {
      const response = await expenseAPI.getExpenses()
      return response.data
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <KanbanCard key={i}>
            <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-4 bg-slate-700 rounded animate-pulse" />
            </KanbanCardHeader>
            <KanbanCardContent>
              <div className="h-8 w-24 bg-slate-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-32 bg-slate-700 rounded animate-pulse" />
            </KanbanCardContent>
          </KanbanCard>
        ))}
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <KanbanCard key={i} className="border-red-500/20">
            <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <KanbanCardTitle className="text-sm font-medium text-slate-400">Error Loading Data</KanbanCardTitle>
              <div className="h-4 w-4 bg-red-500/20 rounded" />
            </KanbanCardHeader>
            <KanbanCardContent>
              <div className="text-sm text-red-400">Failed to load</div>
            </KanbanCardContent>
          </KanbanCard>
        ))}
      </div>
    )
  }

  // Calculate personal vs group expense breakdown
  const personalExpenses = expenseSummary?.expenses?.filter((exp: any) => !exp.groupId) || []
  const groupExpenses = expenseSummary?.expenses?.filter((exp: any) => exp.groupId) || []

  const personalTotal = personalExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0)
  const groupTotal = groupExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0)

  // Calculate balances (simplified - in real app you'd calculate from splits)
  const totalBalance = 0 // This would be calculated from all group balances
  const youOwe = 0 // This would be calculated from group splits where you owe money
  const youreOwed = 0 // This would be calculated from group splits where others owe you

  return (
    <>
      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">Total Balance</KanbanCardTitle>
          <DollarSign className="h-4 w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-slate-100">
            {formatCurrency(totalBalance / 100)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Your overall balance</p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">You're Owed</KanbanCardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCurrency(youreOwed / 100)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Money coming to you</p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">You Owe</KanbanCardTitle>
          <TrendingDown className="h-4 w-4 text-rose-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-rose-400">
            {formatCurrency(youOwe / 100)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Money you need to pay</p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">Personal Expenses</KanbanCardTitle>
          <CreditCard className="h-4 w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-slate-100">
            {formatCurrency(personalTotal / 100)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {personalExpenses.length} personal expense{personalExpenses.length !== 1 ? 's' : ''}
          </p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">Group Expenses</KanbanCardTitle>
          <Users className="h-4 w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-slate-100">
            {formatCurrency(groupTotal / 100)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {groupExpenses.length} group expense{groupExpenses.length !== 1 ? 's' : ''}
          </p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">Total Expenses</KanbanCardTitle>
          <PiggyBank className="h-4 w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-slate-100">
            {formatCurrency((personalTotal + groupTotal) / 100)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {personalExpenses.length + groupExpenses.length} total expenses
          </p>
        </KanbanCardContent>
      </KanbanCard>
    </>
  )
}
