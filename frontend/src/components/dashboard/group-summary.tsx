"use client"

import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrencyWithSymbol } from "@/lib/currency"
import { Users, CreditCard, TrendingUp, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useExpensesQuery } from "@/hooks/use-expenses-query"

export function GroupSummary() {
  const { user } = useAuth()
  const userCurrency = user?.preferences?.currency || 'USD'

  const { data: expenseData, isLoading } = useExpensesQuery()

  // Memoize expensive group breakdown computation
  const { expenses, personalExpenses, groupExpenses, groups } = useMemo(() => {
    const payload = (expenseData?.data?.data) ? expenseData.data.data : expenseData?.data || expenseData
    const allExpenses = payload?.expenses || []
    const personal = allExpenses.filter((exp: any) => !exp.groupId)
    const group = allExpenses.filter((exp: any) => exp.groupId)

    const groupBreakdown = group.reduce((acc: any, exp: any) => {
      const groupId = exp.groupId || exp.group?._id
      if (!acc[groupId]) {
        acc[groupId] = {
          id: groupId,
          name: (exp.group && exp.group.name) || (exp.groupId?.name) || 'Unknown Group',
          total: 0,
          count: 0,
          expenses: []
        }
      }
      acc[groupId].total += exp.amountCents || 0
      acc[groupId].count += 1
      acc[groupId].expenses.push(exp)
      return acc
    }, {})

    return {
      expenses: allExpenses,
      personalExpenses: personal,
      groupExpenses: group,
      groups: Object.values(groupBreakdown),
    }
  }, [expenseData])

  if (isLoading) {
    return (
      <div className="bg-[var(--card)] rounded-xl p-6 border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-4">Group Summary</h3>
        <div className="text-center text-muted-foreground py-8">
          <p className="text-sm">Loading group information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--card)] rounded-xl p-3 sm:p-6 border border-white/5">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Expense Summary</h3>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center justify-center w-9 h-9 shrink-0 bg-blue-500/20 rounded-full">
              <CreditCard className="h-5 w-5 shrink-0 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">Personal</div>
              <div className="text-lg sm:text-xl font-bold text-blue-400 break-all">
                {formatCurrencyWithSymbol(personalExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0) / 100, userCurrency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {personalExpenses.length} expense{personalExpenses.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center justify-center w-9 h-9 shrink-0 bg-green-500/20 rounded-full">
              <Users className="h-5 w-5 shrink-0 text-green-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">Group</div>
              <div className="text-lg sm:text-xl font-bold text-green-400 break-all">
                {formatCurrencyWithSymbol(groupExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0) / 100, userCurrency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {groupExpenses.length} expense{groupExpenses.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center justify-center w-9 h-9 shrink-0 bg-purple-500/20 rounded-full">
              <Building2 className="h-5 w-5 shrink-0 text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">Active Groups</div>
              <div className="text-lg sm:text-xl font-bold text-purple-400">
                {groups.length}
              </div>
              <div className="text-xs text-muted-foreground">
                with expenses
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Group Breakdown */}
      {groups.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-white">Group Breakdown</h4>
          <div className="space-y-3">
            {groups.map((group: any) => (
              <div key={group.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 bg-green-500/20 rounded-full">
                    <Users className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white break-words">{group.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.count} expense{group.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm font-semibold text-white break-all">
                    {formatCurrencyWithSymbol(group.total / 100, userCurrency)}
                  </div>
                  <div className="text-xs text-muted-foreground">{userCurrency}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <p className="text-sm">No group expenses yet</p>
          <p className="text-xs mt-2">Create a group and add expenses to see them here</p>
        </div>
      )}

      {/* Personal vs Group Distribution */}
      {expenses.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <h4 className="text-md font-medium text-white mb-3">Expense Distribution</h4>
          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <Badge variant="secondary" className="text-xs">Personal</Badge>
                <span className="text-sm text-muted-foreground break-words">Your individual expenses</span>
              </div>
              <div className="text-sm font-medium text-blue-400">
                {personalExpenses.length > 0 ? Math.round((personalExpenses.length / expenses.length) * 100) : 0}%
              </div>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <Badge variant="default" className="text-xs">Group</Badge>
                <span className="text-sm text-muted-foreground break-words">Shared expenses with others</span>
              </div>
              <div className="text-sm font-medium text-green-400">
                {groupExpenses.length > 0 ? Math.round((groupExpenses.length / expenses.length) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
