"use client"

import { useQuery } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrencyWithSymbol } from "@/lib/currency"
import { formatDistanceToNow } from "date-fns"
import { CreditCard, Users } from "lucide-react"

export function RecentTransactions() {
  const { user } = useAuth()
  const userCurrency = user?.preferences?.currency || 'USD'

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ["recent-expenses"],
    queryFn: async () => {
      const response = await expenseAPI.getExpenses({ limit: 8, sort: '-createdAt' })
      return response.data
    },
    enabled: !!user,
    refetchInterval: 15000, // Refresh every 15 seconds
    refetchOnWindowFocus: true,
  })

  // Support both shapes and enforce newest-first ordering with safe date parsing
  const rawExpenses = expenseData?.data?.expenses || expenseData?.expenses || []
  const getSafeTime = (exp: any): number => {
    const val = exp?.createdAt || exp?.updatedAt || exp?.date
    const t = val ? Date.parse(val) : NaN
    return Number.isFinite(t) ? t : Date.now()
  }
  const recentExpenses = [...rawExpenses].sort((a: any, b: any) => getSafeTime(b) - getSafeTime(a))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center text-muted-foreground py-8">
          <p className="text-sm">Loading recent transactions...</p>
        </div>
      </div>
    )
  }

  if (recentExpenses.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center text-muted-foreground py-8">
          <p className="text-sm">No recent transactions to display</p>
          <p className="text-xs mt-2">Create your first expense to see it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2 max-h-[400px] overflow-y-auto w-full">
        {recentExpenses.map((expense: any) => {
          const isPersonal = !expense.groupId
          const dateStr = expense?.createdAt || expense?.updatedAt || expense?.date
          const parsed = dateStr ? new Date(dateStr) : new Date()
          const expenseDate = isNaN(parsed.getTime()) ? new Date() : parsed
          
          return (
            <div
              key={expense._id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              {/* Left: Icon + Info */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`p-1.5 rounded-full shrink-0 ${
                  isPersonal 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {isPersonal ? <CreditCard className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{expense.description}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {expense.category || 'other'} · {formatDistanceToNow(expenseDate, { addSuffix: true })}
                  </p>
                </div>
              </div>
              {/* Right: Amount */}
              <div className="text-right shrink-0 ml-2">
                <div className="text-sm font-semibold text-white whitespace-nowrap">
                  {formatCurrencyWithSymbol((expense.amountCents || 0) / 100, expense.currencyCode || userCurrency)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-sm text-muted-foreground">Personal</div>
            <div className="text-lg font-semibold text-blue-400">
              {formatCurrencyWithSymbol(
                recentExpenses
                  .filter((exp: any) => !exp.groupId)
                  .reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0) / 100,
                userCurrency
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Group</div>
            <div className="text-lg font-semibold text-green-400">
              {formatCurrencyWithSymbol(
                recentExpenses
                  .filter((exp: any) => exp.groupId)
                  .reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0) / 100,
                userCurrency
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
