"use client"

import { useQuery } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { Users, CreditCard, TrendingUp, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function GroupSummary() {
  const { user } = useAuth()

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ["group-summary"],
    queryFn: async () => {
      const response = await expenseAPI.getExpenses()
      return response.data
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const expenses = expenseData?.expenses || []

  // Calculate group breakdown
  const groupExpenses = expenses.filter((exp: any) => exp.groupId)
  const personalExpenses = expenses.filter((exp: any) => !exp.groupId)

  // Group expenses by group
  const groupBreakdown = groupExpenses.reduce((acc: any, exp: any) => {
    const groupId = exp.groupId
    if (!acc[groupId]) {
      acc[groupId] = {
        id: groupId,
        name: exp.groupId?.name || 'Unknown Group',
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

  const groups = Object.values(groupBreakdown)

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
    <div className="bg-[var(--card)] rounded-xl p-6 border border-white/5">
      <h3 className="text-lg font-semibold text-white mb-4">Expense Summary</h3>
      
      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-full">
              <CreditCard className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Personal</div>
              <div className="text-xl font-bold text-blue-400">
                {formatCurrency(personalExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0) / 100)}
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
              <div className="text-sm text-muted-foreground">Group</div>
              <div className="text-xl font-bold text-green-400">
                {formatCurrency(groupExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0) / 100)}
              </div>
              <div className="text-xs text-muted-foreground">
                {groupExpenses.length} expense{groupExpenses.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-full">
              <Building2 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Active Groups</div>
              <div className="text-xl font-bold text-purple-400">
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
              <div key={group.id} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-full">
                    <Users className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{group.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.count} expense{group.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {formatCurrency(group.total / 100)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {group.expenses[0]?.currencyCode || 'USD'}
                  </div>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">Personal</Badge>
                <span className="text-sm text-muted-foreground">Your individual expenses</span>
              </div>
              <div className="text-sm font-medium text-blue-400">
                {personalExpenses.length > 0 ? Math.round((personalExpenses.length / expenses.length) * 100) : 0}%
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="text-xs">Group</Badge>
                <span className="text-sm text-muted-foreground">Shared expenses with others</span>
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
