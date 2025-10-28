"use client"

import { useQuery } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { CreditCard, Users, Calendar, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function RecentTransactions() {
  const { user } = useAuth()

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ["recent-expenses"],
    queryFn: async () => {
      const response = await expenseAPI.getExpenses({ limit: 10 })
      return response.data
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const recentExpenses = expenseData?.expenses || []

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
      <div className="space-y-3">
        {recentExpenses.map((expense: any) => {
          const isPersonal = !expense.groupId
          const expenseDate = new Date(expense.date || expense.createdAt)
          
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
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-white truncate">
                      {expense.description}
                    </p>
                    <Badge variant={isPersonal ? "secondary" : "default"} className="text-xs">
                      {isPersonal ? "Personal" : "Group"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
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
                  {formatCurrency((expense.amountCents || 0) / 100)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {expense.currencyCode || 'USD'}
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
              {formatCurrency(
                recentExpenses
                  .filter((exp: any) => !exp.groupId)
                  .reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0) / 100
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Group</div>
            <div className="text-lg font-semibold text-green-400">
              {formatCurrency(
                recentExpenses
                  .filter((exp: any) => exp.groupId)
                  .reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0) / 100
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
