"use client"

import { CreateExpenseDialog } from "./create-expense-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface CreateExpenseFormProps {
  defaultGroupId?: string
}

export function CreateExpenseForm({ defaultGroupId }: CreateExpenseFormProps) {
  return (
    <CreateExpenseDialog defaultGroupId={defaultGroupId}>
      <Button className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add New Expense
      </Button>
    </CreateExpenseDialog>
  )
}