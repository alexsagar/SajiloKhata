"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { formatCurrencyWithSymbol } from "@/lib/currency"
import { useCurrency } from "@/contexts/currency-context"
import { getInitials, formatDate } from "@/lib/utils"

interface ExpenseDetailsProps {
  expenseId: string
}

export function ExpenseDetails({ expenseId }: ExpenseDetailsProps) {
  const { currency: displayCurrency } = useCurrency()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => expenseAPI.getExpense(expenseId),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
          <CardDescription>Unable to load expense {expenseId}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Something went wrong loading this expense.</p>
        </CardContent>
      </Card>
    )
  }

  const payload = (data.data && (data.data as any).data) ? (data.data as any).data : (data.data as any)
  const expense = payload?.expense || payload

  const amount = (expense?.amountCents != null ? expense.amountCents / 100 : expense?.amount) || 0
  const currency = displayCurrency || expense?.currencyCode || expense?.currency || "USD"
  const splits = Array.isArray(expense?.splits) ? expense.splits : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense?.description || "Expense Details"}</CardTitle>
        <CardDescription>
          {formatDate(expense?.date)} • {expense?.group?.name ? `Group: ${expense.group.name}` : "Personal"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Paid by</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={expense?.paidBy?.avatar} />
                <AvatarFallback className="text-xs">
                  {getInitials(expense?.paidBy?.firstName || "", expense?.paidBy?.lastName || "")}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {expense?.paidBy?.firstName} {expense?.paidBy?.lastName}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrencyWithSymbol(amount, currency)}</div>
            <div className="text-xs text-muted-foreground">{currency}</div>
          </div>
        </div>

        {expense?.notes && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{expense.notes}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-2">Split between</p>
          {splits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No split data.</p>
          ) : (
            <div className="space-y-2">
              {splits.map((s: any) => {
                const share = s?.amountCents != null ? s.amountCents / 100 : s?.amount || 0
                return (
                  <div key={s.user?._id || s.user} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={s?.user?.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(s?.user?.firstName || "", s?.user?.lastName || "")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {s?.user?.firstName} {s?.user?.lastName}
                      </span>
                    </div>
                    <div className="text-sm font-medium">{formatCurrencyWithSymbol(share, currency)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {expense?.receipt?.url && (
          <div className="pt-2 border-t">
            <a className="text-sm text-blue-400 hover:underline" href={expense.receipt.url} target="_blank" rel="noreferrer">
              View receipt
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
