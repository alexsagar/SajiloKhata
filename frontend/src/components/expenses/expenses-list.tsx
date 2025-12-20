"use client"

import { KanbanCard, KanbanCardContent } from "@/components/ui/kanban-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Receipt, Calendar, Users, MoreHorizontal, Edit, Trash2, CreditCard, Building2 } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { formatDate, getInitials } from "@/lib/utils"
import { formatCurrencyWithSymbol } from "@/lib/currency"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EditExpenseDialog } from "./edit-expense-dialog"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"

interface ExpensesListProps {
  groupId?: string
  filters?: {
    category?: string
    startDate?: string
    endDate?: string
    search?: string
  }
}

export function ExpensesList({ groupId, filters }: ExpensesListProps) {
  const { user } = useAuth()
  const userCurrency = user?.preferences?.currency || "USD"
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", groupId, filters],
    queryFn: () => expenseAPI.getExpenses(groupId),
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      return expenseAPI.deleteExpense(expenseId)
    },
    onSuccess: () => {
      toast({ title: "Expense deleted" })
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] })
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ["group-balance", groupId] })
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to delete expense" })
    },
  })

  const handleDelete = (expenseId: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm("Delete this expense? This action cannot be undone.")
      if (!confirmed) return
    }
    deleteExpenseMutation.mutate(expenseId)
  }

  
  
  

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const expensesPayload = (expenses?.data && (expenses?.data as any).data) ? (expenses?.data as any).data : (expenses?.data as any)
  const expensesList = (expensesPayload?.expenses as any[]) || []

  if (expensesList.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
        <p className="text-muted-foreground mb-4">Start by adding your first expense</p>
      </div>
    )
  }

  // Calculate expense summary
  const personalExpenses = expensesList.filter((exp: any) => !exp.groupId)
  const groupExpenses = expensesList.filter((exp: any) => exp.groupId)
  const personalTotal = personalExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0)
  const groupTotal = groupExpenses.reduce((sum: number, exp: any) => sum + (exp.amountCents || 0), 0)

  const getCategoryColor = (category: string) => {
    const colors = {
      food: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      transportation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      accommodation: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      entertainment: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      utilities: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      shopping: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      healthcare: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  return (
    <>
      {/* Expense Summary Header */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Expense Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">Personal</span>
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1">
              {formatCurrencyWithSymbol(personalTotal / 100, userCurrency)}
            </div>
            <div className="text-xs text-muted-foreground">
              {personalExpenses.length} expense{personalExpenses.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Group</span>
            </div>
            <div className="text-xl font-bold text-green-400 mt-1">
              {formatCurrencyWithSymbol(groupTotal / 100, userCurrency)}
            </div>
            <div className="text-xs text-muted-foreground">
              {groupExpenses.length} expense{groupExpenses.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <div className="text-xl font-bold text-purple-400 mt-1">
              {formatCurrencyWithSymbol((personalTotal + groupTotal) / 100, userCurrency)}
            </div>
            <div className="text-xs text-muted-foreground">
              {expensesList.length} total expense{expensesList.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {expensesList.map((expense: any) => {
          const isPersonal = !expense.groupId
          
          return (
            <KanbanCard key={expense._id} className="hover:-translate-y-0.5 hover:bg-white/[0.06] cursor-pointer">
              <KanbanCardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Expense Type Indicator */}
                    <div className={`p-2 rounded-full ${
                      isPersonal 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {isPersonal ? (
                        <CreditCard className="h-5 w-5" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={expense.paidBy?.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {getInitials(expense.paidBy?.firstName || "", expense.paidBy?.lastName || "")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{expense.description}</h3>
                        <Badge className={getCategoryColor(expense.category)}>
                          {expense.category}
                        </Badge>
                        <Badge variant={isPersonal ? "secondary" : "default"} className="text-xs">
                          {isPersonal ? "Personal" : "Group"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(expense.date)}</span>
                        </div>
                        {expense.group && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{expense.group.name}</span>
                          </div>
                        )}
                        {expense.receipt && (
                          <div className="flex items-center gap-1">
                            <Receipt className="h-4 w-4" />
                            <span>Receipt attached</span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Paid by {expense.paidBy?.firstName} {expense.paidBy?.lastName}
                      </p>

                      {expense.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{expense.notes}"
                        </p>
                      )}

                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1">Split between:</div>
                        <div className="flex flex-wrap gap-2">
                          {expense.splits?.map((split: any) => (
                            <div key={split.user._id} className="flex items-center gap-1 text-xs">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={split.user.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(split.user.firstName, split.user.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{split.user.firstName}</span>
                              <span className="font-medium">{formatCurrencyWithSymbol(split.amount, userCurrency)}</span>
                              {split.settled && (
                                <Badge variant="secondary" className="text-xs">Settled</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{
                        formatCurrencyWithSymbol(
                          ((expense.amountCents != null ? expense.amountCents : (expense.amount != null ? Math.round(expense.amount * 100) : 0)) / 100),
                          userCurrency
                        )
                      }</div>
                      <div className="text-sm text-muted-foreground">{expense.currencyCode || expense.currency || userCurrency}</div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/expenses/${expense._id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {expense.receipt && (
                          <DropdownMenuItem asChild>
                            <Link href={`/expenses/${expense._id}/receipt`}>View Receipt</Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(expense._id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </KanbanCardContent>
            </KanbanCard>
          )
        })}
      </div>

      {editingExpense && (
        <EditExpenseDialog
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
        />
      )}
    </>
  )
}