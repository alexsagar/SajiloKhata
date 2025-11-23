"use client"

import { useQuery } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrencyWithSymbol } from "@/lib/currency"
import { formatDistanceToNow } from "date-fns"
import { CreditCard, Users, Calendar, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
    <div className="space-y-4">
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {recentExpenses.map((expense: any) => {
          const isPersonal = !expense.groupId
          // For relative "recent" display, prefer createdAt; fallback to updatedAt/date; if invalid, use now
          const dateStr = expense?.createdAt || expense?.updatedAt || expense?.date
          const parsed = dateStr ? new Date(dateStr) : new Date()
          const expenseDate = isNaN(parsed.getTime()) ? new Date() : parsed
          
          return (
            <div key={expense._id} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Expense Type Icon */}
                <div className={`p-2 rounded-full ${
                  isPersonal 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {isPersonal ? (
                    <CreditCard className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </div>

                {/* Expense Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium text-white truncate leading-tight">
                      {expense.description}
                    </p>
                    <Badge variant={isPersonal ? "secondary" : "default"} className="text-xs leading-none py-0.5">
                      {isPersonal ? "Personal" : "Group"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Tag className="h-3 w-3" />
                      <span className="capitalize">{expense.category || 'other'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(expenseDate, { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right ml-4">
                <div className="text-sm font-semibold text-white">
                  {formatCurrencyWithSymbol(
                    (expense.amountCents || 0) / 100,
                    expense.currencyCode || userCurrency
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {expense.currencyCode || userCurrency}
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
