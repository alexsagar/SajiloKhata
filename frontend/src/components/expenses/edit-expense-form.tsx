"use client"

import { EditExpenseDialog } from "./edit-expense-dialog"
import { useState } from "react"

interface EditExpenseFormProps {
  expenseId: string
}

export function EditExpenseForm({ expenseId }: EditExpenseFormProps) {
  const [expense, setExpense] = useState(null)
  const [open, setOpen] = useState(true)

  // This would typically fetch the expense data
  // For now, we'll just show a placeholder

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Expense</h1>
      <p className="text-muted-foreground">
        Expense editing form for ID: {expenseId}
      </p>
      {expense && (
        <EditExpenseDialog
          expense={expense}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </div>
  )
}