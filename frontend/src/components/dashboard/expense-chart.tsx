"use client"

import { useQuery } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { CreditCard, Users, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function ExpenseChart() {
  const { user } = useAuth()

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ["expense-chart-data"],
    queryFn: async () => {
      const response = await expenseAPI.getExpenses({ limit: 100 })
      return response.data
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const expenses = expenseData?.expenses || []

  // Calculate expense breakdowns
  const personalExpenses = expenses.filter((exp: any) => !exp.groupId)
  const groupExpenses = expenses.filter((exp: any) => exp.groupId)

  const personalTotal = personalExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0)
  const groupTotal = groupExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0)
  const totalSpent = personalTotal + groupTotal

  // Calculate category breakdown for personal expenses
  const personalCategoryBreakdown = personalExpenses.reduce((acc: any, exp: any) => {
    const category = exp.category || 'other'
    acc[category] = (acc[category] || 0) + (exp.amountCents || 0)
    return acc
  }, {})

  // Get top 5 personal expense categories
  const topPersonalCategories = Object.entries(personalCategoryBreakdown)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Loading expense data...</p>
        </div>
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No expenses to display</p>
          <p className="text-xs mt-2">Create your first expense to see charts</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Expense Type Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-full">
              <CreditCard className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Personal Expenses</div>
              <div className="text-xl font-bold text-blue-400">
                {formatCurrency(personalTotal / 100)}
              </div>
              <div className="text-xs text-muted-foreground">
                {personalExpenses.length} expense{personalExpenses.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-full">
              <Users className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Group Expenses</div>
              <div className="text-xl font-bold text-green-400">
                {formatCurrency(groupTotal / 100)}
              </div>
              <div className="text-xs text-muted-foreground">
                {groupExpenses.length} expense{groupExpenses.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Total Spending */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Total Spent</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalSpent / 100)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">All Time</div>
            <div className="text-lg font-semibold text-white">
              {expenses.length} total expense{expenses.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Expense Categories */}
      {topPersonalCategories.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-white">Personal Expense Categories</div>
          <div className="space-y-2">
            {topPersonalCategories.map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {category}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-white">
                  {formatCurrency((amount as number) / 100)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Trends */}
      <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-white/10 rounded-lg p-4">
        <div className="text-sm font-medium text-white mb-3">Spending Distribution</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Personal</span>
            <span className="text-blue-400 font-medium">
              {personalTotal > 0 ? Math.round((personalTotal / totalSpent) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Group</span>
            <span className="text-green-400 font-medium">
              {groupTotal > 0 ? Math.round((groupTotal / totalSpent) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
