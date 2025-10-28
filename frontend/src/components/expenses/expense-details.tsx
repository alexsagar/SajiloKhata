"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface ExpenseDetailsProps {
  expenseId: string
}

export function ExpenseDetails({ expenseId }: ExpenseDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Details</CardTitle>
        <CardDescription>Viewing expense {expenseId}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Expense details will be loaded here.</p>
      </CardContent>
    </Card>
  )
}
