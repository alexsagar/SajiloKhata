"use client"

import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { DollarSign, TrendingUp, TrendingDown, Users, CreditCard, PiggyBank } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrencyWithSymbol } from "@/lib/currency"
import { ComponentLoading } from "@/components/ui/loading"

export function BalanceOverview() {
  const { user } = useAuth()
  const userCurrency = user?.preferences?.currency || 'USD'

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
  const payload = expenseSummary?.data?.data ? expenseSummary.data.data : expenseSummary?.data
  const expensesData = payload?.expenses || expenseSummary?.expenses || []
  const personalExpenses = expensesData.filter((exp: any) => !exp.groupId)
  const groupExpenses = expensesData.filter((exp: any) => exp.groupId)

  const personalTotal = personalExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0)
  const groupTotal = groupExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0)

  // Calculate balances from splits
  const currentUserId = user?.id || (user as any)?._id
  let youOwe = 0
  let youreOwed = 0
  for (const exp of groupExpenses) {
    const payerId = exp?.paidBy?._id || exp?.paidBy?.id || exp?.paidBy
    const splits = Array.isArray(exp?.splits) ? exp.splits : []
    for (const s of splits) {
      const sid = s?.user?._id || s?.user?.id || s?.user
      const shareCents = (s?.amountCents != null)
        ? s.amountCents
        : Math.round(((s?.amount ?? 0) as number) * 100)
      if (!Number.isFinite(shareCents)) continue
      if (payerId === currentUserId && sid !== currentUserId) {
        youreOwed += shareCents
      } else if (sid === currentUserId && payerId !== currentUserId) {
        youOwe += shareCents
      }
    }
  }
  const totalBalance = youreOwed - youOwe

  return (
    <>
      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">Total Balance</KanbanCardTitle>
          <DollarSign className="h-5 w-5 sm:h-4 sm:w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-slate-100">
            {formatCurrencyWithSymbol(totalBalance / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Your overall balance</p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">You're Owed</KanbanCardTitle>
          <TrendingUp className="h-5 w-5 sm:h-4 sm:w-4 text-emerald-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCurrencyWithSymbol(youreOwed / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Money coming to you</p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">You Owe</KanbanCardTitle>
          <TrendingDown className="h-5 w-5 sm:h-4 sm:w-4 text-rose-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-rose-400">
            {formatCurrencyWithSymbol(youOwe / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Money you need to pay</p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">Personal Expenses</KanbanCardTitle>
          <CreditCard className="h-5 w-5 sm:h-4 sm:w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-slate-100">
            {formatCurrencyWithSymbol(personalTotal / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {personalExpenses.length} personal expense{personalExpenses.length !== 1 ? 's' : ''}
          </p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">Group Expenses</KanbanCardTitle>
          <Users className="h-5 w-5 sm:h-4 sm:w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-slate-100">
            {formatCurrencyWithSymbol(groupTotal / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {groupExpenses.length} group expense{groupExpenses.length !== 1 ? 's' : ''}
          </p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard>
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-sm font-medium text-slate-400">Total Expenses</KanbanCardTitle>
          <PiggyBank className="h-5 w-5 sm:h-4 sm:w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-2xl font-bold text-slate-100">
            {formatCurrencyWithSymbol((personalTotal + groupTotal) / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {personalExpenses.length + groupExpenses.length} total expenses
          </p>
        </KanbanCardContent>
      </KanbanCard>
    </>
  )
}
