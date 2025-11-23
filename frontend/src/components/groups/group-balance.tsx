"use client"

import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery } from "@tanstack/react-query"
import { groupAPI, expenseAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { formatCurrency as formatCurrencyUtil, getInitials } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { TrendingUp, TrendingDown, DollarSign, ArrowRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface GroupBalanceProps {
  groupId: string
}

export function GroupBalance({ groupId }: GroupBalanceProps) {
  const { user } = useAuth()
  const userCurrency = user?.preferences?.currency || "USD"
  
  const { data: balance, isLoading } = useQuery({
    queryKey: ["group-balance", groupId],
    queryFn: () => groupAPI.getBalances(groupId),
  })

  // Fetch expenses to compute balances if API doesn't provide them
  const { data: expensesData } = useQuery({
    queryKey: ["group-expenses-for-balance", groupId],
    queryFn: () => expenseAPI.getExpenses(groupId),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <LoadingSpinner />
      </div>
    )
  }

  // Normalize API balances shape (object map or array) and compute fallback from expenses
  const apiBalance = balance?.data || {}
  let balancesMap: Record<string, any> = {}
  if (apiBalance?.balances) {
    if (Array.isArray(apiBalance.balances)) {
      apiBalance.balances.forEach((b: any) => {
        const uid = b?.user?._id || b?.userId || b?._id || "unknown"
        balancesMap[uid] = b
      })
    } else {
      balancesMap = apiBalance.balances as Record<string, any>
    }
  }

  // If no balances from API, compute from expenses
  if (Object.keys(balancesMap).length === 0) {
    const payload = (expensesData?.data && (expensesData?.data as any).data) ? (expensesData?.data as any).data : (expensesData?.data as any)
    const expensesList: any[] = (payload?.expenses as any[]) || []

    const addUser = (user: any) => {
      const uid = user?._id
      if (!uid) return
      if (!balancesMap[uid]) {
        balancesMap[uid] = { user, amount: 0 }
      }
    }

    expensesList.forEach((exp: any) => {
      const total = exp?.amountCents != null ? exp.amountCents / 100 : (exp?.amount ?? 0)
      if (exp?.paidBy) {
        addUser(exp.paidBy)
        const pid = exp.paidBy._id
        balancesMap[pid].amount = (balancesMap[pid].amount || 0) + total
      }
      (exp?.splits || []).forEach((split: any) => {
        addUser(split.user)
        const uid = split.user?._id
        const owe = split?.amount != null ? split.amount : 0
        balancesMap[uid].amount = (balancesMap[uid].amount || 0) - owe
      })
    })
  }

  const balanceEntries = Object.entries(balancesMap)
  const transactions = apiBalance?.minimumTransactions || []

  // Total expenses: prefer API, else compute from expenses
  const expensesPayload = (expensesData?.data && (expensesData?.data as any).data) ? (expensesData?.data as any).data : (expensesData?.data as any)
  const expensesListForTotal: any[] = (expensesPayload?.expenses as any[]) || []
  const computedTotal = expensesListForTotal.reduce((sum, exp) => sum + (exp?.amountCents != null ? exp.amountCents / 100 : (exp?.amount ?? 0)), 0)
  const totalExpenses = apiBalance?.totalExpenses != null ? apiBalance.totalExpenses : computedTotal

  return (
    <div className="space-y-6">
      {/* Summary */}
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Group Balance Summary
          </KanbanCardTitle>
          <KanbanCardDescription>
            Overview of expenses and balances in this group
          </KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses, userCurrency)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Transactions Needed</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="text-2xl font-bold">{balanceEntries.length}</p>
            </div>
          </div>
        </KanbanCardContent>
      </KanbanCard>

      {/* Individual Balances */}
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle>Member Balances</KanbanCardTitle>
          <KanbanCardDescription>
            How much each member owes or is owed
          </KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent>
          {balanceEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No balance data available
            </div>
          ) : (
            <div className="space-y-3">
              {balanceEntries.map(([userId, balance]: [string, any]) => (
                <div key={userId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={balance.user?.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {getInitials(balance.user?.firstName || "U", balance.user?.lastName || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {balance.user?.firstName} {balance.user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {balance.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      balance.amount > 0 ? 'text-green-600' : 
                      balance.amount < 0 ? 'text-red-600' : 
                      'text-muted-foreground'
                    }`}>
                      {balance.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(balance.amount), userCurrency)}
                    </div>
                    <Badge variant={
                      balance.amount === 0 ? "secondary" : 
                      balance.amount > 0 ? "default" : "destructive"
                    }>
                      {balance.amount === 0 ? 'Settled' : 
                       balance.amount > 0 ? 'Is owed' : 'Owes'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </KanbanCardContent>
      </KanbanCard>

      {/* Suggested Transactions */}
      {transactions.length > 0 && (
        <KanbanCard>
          <KanbanCardHeader>
            <KanbanCardTitle>Suggested Settlements</KanbanCardTitle>
            <KanbanCardDescription>
              Minimum transactions needed to settle all balances
            </KanbanCardDescription>
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="space-y-3">
              {transactions.map((transaction: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={transaction.from?.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {getInitials(transaction.from?.firstName || "U", transaction.from?.lastName || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{transaction.from?.firstName}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={transaction.to?.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {getInitials(transaction.to?.firstName || "U", transaction.to?.lastName || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{transaction.to?.firstName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatCurrency(transaction.amount, userCurrency)}</span>
                    <Button size="sm" variant="outline">
                      Mark as Paid
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </KanbanCardContent>
        </KanbanCard>
      )}
    </div>
  )
}