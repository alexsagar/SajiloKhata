"use client"

import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { DollarSign, TrendingUp, TrendingDown, Users, CreditCard, PiggyBank } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrencyWithSymbol } from "@/lib/currency"
import { useExpensesQuery } from "@/hooks/use-expenses-query"
import { useQuery } from "@tanstack/react-query"
import { userAPI } from "@/lib/api"
import type { User } from "@/types/user"

type ExpenseSummaryItem = {
  groupId?: string | null
  amountCents?: number
  splits?: Array<{
    user?: string | { _id?: string }
    amountCents?: number
    amount?: number
  }>
}

type ExpenseSummaryPayload = {
  expenses?: ExpenseSummaryItem[]
}

type UserBalanceSummaryPayload = {
  youOweCents?: number
  youAreOwedCents?: number
  totalBalanceCents?: number
}

function getCurrentUserShareCents(expense: ExpenseSummaryItem, currentUserId: string) {
  if (!expense?.groupId) {
    return Number(expense?.amountCents || 0)
  }

  const mySplit = (expense?.splits || []).find(
    (split) => String((typeof split?.user === "object" ? split?.user?._id : split?.user) || "") === currentUserId,
  )

  if (!mySplit) return 0
  return Number(mySplit.amountCents ?? (mySplit.amount != null ? Math.round(mySplit.amount * 100) : 0))
}

export function BalanceOverview() {
  const { user } = useAuth()
  const userCurrency = user?.preferences?.currency || 'USD'
  const currentUserId = String((user as User | null)?._id || user?.id || "")

  const { data: expenseSummary, isLoading, error } = useExpensesQuery()

  // Fetch splitwise-style debt summary from backend
  const { data: balanceResp } = useQuery({
    queryKey: ["user-balance-summary"],
    queryFn: () => userAPI.getBalanceSummary(),
    enabled: !!user,
    staleTime: 60 * 1000,
  })

  // Show loading state
  if (isLoading) {
    return (
      <div className="contents">
        {Array.from({ length: 6 }).map((_, i) => (
          <KanbanCard key={i} className="shrink-0 snap-start w-[84vw] sm:w-[68vw] md:w-auto">
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
      <div className="contents">
        {Array.from({ length: 6 }).map((_, i) => (
          <KanbanCard key={i} className="border-red-500/20 shrink-0 snap-start w-[84vw] sm:w-[68vw] md:w-auto">
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
  const payload = (expenseSummary?.data?.data ? expenseSummary.data.data : expenseSummary?.data) as ExpenseSummaryPayload | undefined
  const expensesData: ExpenseSummaryItem[] = payload?.expenses || expenseSummary?.expenses || []
  const personalExpenses = expensesData.filter((exp) => !exp.groupId)
  const groupExpenses = expensesData.filter((exp) => exp.groupId)

  const personalTotal = personalExpenses.reduce((sum, exp) => sum + (exp.amountCents || 0), 0)
  const groupTotal = groupExpenses.reduce((sum, exp) => sum + (exp.amountCents || 0), 0)
  const userTotal = expensesData.reduce(
    (sum, exp) => sum + getCurrentUserShareCents(exp, currentUserId),
    0,
  )

  // Use backend-computed summary (all in cents for precision)
  const balanceData = (balanceResp?.data?.data || balanceResp?.data || {}) as UserBalanceSummaryPayload
  const youOwe = Number(balanceData.youOweCents ?? 0)
  const youreOwed = Number(balanceData.youAreOwedCents ?? 0)
  const totalBalance = Number(balanceData.totalBalanceCents ?? (youreOwed - youOwe))

  return (
    <>
      <KanbanCard className="shrink-0 snap-start w-[84vw] sm:w-[68vw] md:w-auto">
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-xs sm:text-sm font-medium text-slate-400">Total Balance</KanbanCardTitle>
          <DollarSign className="hidden sm:block h-4 w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-lg sm:text-2xl font-bold text-slate-100 leading-tight">
            {formatCurrencyWithSymbol(totalBalance / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Your overall balance</p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard className="shrink-0 snap-start w-[84vw] sm:w-[68vw] md:w-auto">
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-xs sm:text-sm font-medium text-slate-400">You&apos;re Owed</KanbanCardTitle>
          <TrendingUp className="hidden sm:block h-4 w-4 text-emerald-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 leading-tight">
            {formatCurrencyWithSymbol(youreOwed / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Money coming to you</p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard className="shrink-0 snap-start w-[84vw] sm:w-[68vw] md:w-auto">
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-xs sm:text-sm font-medium text-slate-400">You Owe</KanbanCardTitle>
          <TrendingDown className="hidden sm:block h-4 w-4 text-rose-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-lg sm:text-2xl font-bold text-rose-400 leading-tight">
            {formatCurrencyWithSymbol(youOwe / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Money you need to pay</p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard className="shrink-0 snap-start w-[84vw] sm:w-[68vw] md:w-auto">
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-xs sm:text-sm font-medium text-slate-400">Personal Expenses</KanbanCardTitle>
          <CreditCard className="hidden sm:block h-4 w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-lg sm:text-2xl font-bold text-slate-100 leading-tight">
            {formatCurrencyWithSymbol(personalTotal / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {personalExpenses.length} personal expense{personalExpenses.length !== 1 ? 's' : ''}
          </p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard className="shrink-0 snap-start w-[84vw] sm:w-[68vw] md:w-auto">
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-xs sm:text-sm font-medium text-slate-400">Group Expenses</KanbanCardTitle>
          <Users className="hidden sm:block h-4 w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-lg sm:text-2xl font-bold text-slate-100 leading-tight">
            {formatCurrencyWithSymbol(groupTotal / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {groupExpenses.length} group expense{groupExpenses.length !== 1 ? 's' : ''}
          </p>
        </KanbanCardContent>
      </KanbanCard>

      <KanbanCard className="shrink-0 snap-start w-[84vw] sm:w-[68vw] md:w-auto">
        <KanbanCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <KanbanCardTitle className="text-xs sm:text-sm font-medium text-slate-400">Your Total Expenses</KanbanCardTitle>
          <PiggyBank className="hidden sm:block h-4 w-4 text-slate-400" />
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="text-lg sm:text-2xl font-bold text-slate-100 leading-tight">
            {formatCurrencyWithSymbol(userTotal / 100, userCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personal expenses plus your share of group expenses
          </p>
        </KanbanCardContent>
      </KanbanCard>

    </>
  )
}
