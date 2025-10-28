"use client"

import type React from "react"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const editExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.string(),
  date: z.string().optional(),
  notes: z.string().optional(),
})

type EditExpenseFormData = z.infer<typeof editExpenseSchema>

interface EditExpenseDialogProps {
  expense: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditExpenseDialog({ expense, open, onOpenChange }: EditExpenseDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditExpenseFormData>({
    resolver: zodResolver(editExpenseSchema),
  })

  useEffect(() => {
    if (expense) {
      reset({
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : "",
        notes: expense.notes || "",
      })
    }
  }, [expense, reset])

  const updateExpenseMutation = useMutation({
    mutationFn: (data: EditExpenseFormData) => expenseAPI.updateExpense(expense._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["user-balance"] })
      toast({
        title: "Expense updated",
        description: "Your expense has been updated successfully.",
      })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update expense",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: EditExpenseFormData) => {
    updateExpenseMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">Edit Expense</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Update the details of your expense.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Dinner at restaurant"
              {...register("description")}
              disabled={updateExpenseMutation.isPending}
              className="h-8 text-sm"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                disabled={updateExpenseMutation.isPending}
                className="h-8 text-sm"
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs">Category</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value)}
                disabled={updateExpenseMutation.isPending}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food & Dining</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="date" className="text-xs">Date</Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
              disabled={updateExpenseMutation.isPending}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this expense"
              {...register("notes")}
              disabled={updateExpenseMutation.isPending}
              className="min-h-[50px] text-sm"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateExpenseMutation.isPending}
              size="sm"
              className="h-8 px-3"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateExpenseMutation.isPending} size="sm" className="h-8 px-3">
              {updateExpenseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}