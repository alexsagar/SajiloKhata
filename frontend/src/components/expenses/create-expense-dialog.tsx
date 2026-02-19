"use client"

import React from "react"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Upload, X } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { expenseAPI, groupAPI, receiptAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { useDropzone } from "react-dropzone"
import { CurrencySelector } from "@/components/currency/currency-selector"
import { useAuth } from "@/contexts/auth-context"
import { CreateExpenseSchema } from "@/lib/validation"

type CreateExpenseFormData = z.infer<typeof CreateExpenseSchema>

interface CreateExpenseDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultGroupId?: string
  children?: React.ReactNode
}

export function CreateExpenseDialog({ open, onOpenChange, defaultGroupId, children }: CreateExpenseDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedReceiptId, setUploadedReceiptId] = useState<string | null>(null)
  const [receiptParsed, setReceiptParsed] = useState<any>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [showCurrencySelection, setShowCurrencySelection] = useState(false)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: groups } = useQuery({
    queryKey: ["user-groups"],
    queryFn: () => groupAPI.getGroups(),
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateExpenseFormData>({
    resolver: zodResolver(CreateExpenseSchema),
    defaultValues: {
      groupId: defaultGroupId || "",
      category: "other",
      splitType: "equal",
      date: new Date().toISOString().split('T')[0],
      currencyCode: user?.preferences?.currency || "USD",
      description: "",
      amount: 0,
    },
  })

  const selectedGroupId = watch("groupId")
  const selectedCurrency = watch("currencyCode")
  const groupsData = (groups as any)?.data?.data || (groups as any)?.data || []
  const selectedGroup = groupsData.find((g: any) => g._id === selectedGroupId)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      setSelectedFile(file)
      // Note: Receipt scanning is only supported for personal expenses.
    }
  })

  const createExpenseMutation = useMutation({
    mutationFn: async (data: CreateExpenseFormData) => {
      const formData = new FormData()

      // Add basic fields
      formData.append('description', data.description)
      formData.append('amount', data.amount.toString())
      formData.append('category', data.category || 'other')
      formData.append('date', data.date || new Date().toISOString())
      if (data.notes) formData.append('notes', data.notes)
      if (data.groupId) formData.append('groupId', data.groupId)
      if (data.splitType) formData.append('splitType', data.splitType)
      if (data.currencyCode) formData.append('currencyCode', data.currencyCode)

      // Add required createdBy field
      if (user?.id) {
        formData.append('createdBy', user.id)
      } else {
        throw new Error('User not authenticated')
      }

      // Build splits including payer (current user) + selected members
      if (data.groupId) {
        const amountNumber = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
        const participants = Array.from(new Set([user.id, ...selectedMembers]))

        if (participants.length === 0) {
          throw new Error('No participants selected for group split')
        }

        let splits: Array<{ user: string; amount?: number; percentage?: number }> = []
        const splitType = data.splitType || 'equal'

        if (splitType === 'equal') {
          const share = amountNumber / participants.length
          splits = participants.map((pid) => ({ user: pid, amount: Number(share.toFixed(2)) }))
        } else if (splitType === 'percentage') {
          const pct = Math.round((100 / participants.length) * 100) / 100 // equal fallback
          splits = participants.map((pid) => ({ user: pid, percentage: pct }))
        } else if (splitType === 'exact') {
          const share = amountNumber / participants.length // default exact equally
          splits = participants.map((pid) => ({ user: pid, amount: Number(share.toFixed(2)) }))
        }

        formData.append('splits', JSON.stringify(splits))
      }

      if (selectedFile) {
        formData.append('receipt', selectedFile)
      }

      return expenseAPI.createExpense(formData)
    },

    // ---- Optimistic update: instant UI visibility ----
    onMutate: async (data: CreateExpenseFormData) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      //    We cancel 'expenses' (main list), 'recent-expenses' (dashboard), 'expense-summary' (balances),
      //    and the specific group's expenses if applicable.
      await queryClient.cancelQueries({ queryKey: ["expenses"] })
      await queryClient.cancelQueries({ queryKey: ["recent-expenses"] })
      await queryClient.cancelQueries({ queryKey: ["expense-summary"] })
      if (data.groupId) {
        await queryClient.cancelQueries({ queryKey: ["group-expenses", data.groupId] })
      }

      // 2. Snapshot all expense queries for rollback
      const previousExpenses = queryClient.getQueryData(["expenses"])
      const previousRecent = queryClient.getQueryData(["recent-expenses"])
      const previousSummary = queryClient.getQueryData(["expense-summary"])
      const previousGroupExpenses = data.groupId ? queryClient.getQueryData(["group-expenses", data.groupId]) : null

      // 3. Build optimistic expense object
      const tempId = `optimistic-${Date.now()}`
      const amountNum = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
      const amountCents = Math.round(amountNum * 100)

      const optimisticExpense = {
        _id: tempId,
        _optimistic: true,
        description: data.description,
        amount: amountNum,
        amountCents,
        currencyCode: data.currencyCode || user?.preferences?.currency || 'USD',
        category: data.category || 'other',
        date: data.date || new Date().toISOString(),
        notes: data.notes || null,
        groupId: data.groupId || null,
        status: 'active',
        paidBy: {
          _id: user?.id,
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          username: user?.username || '',
          avatar: user?.avatar || '',
        },
        splits: [{
          user: {
            _id: user?.id,
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            username: user?.username || '',
          },
          amountCents,
          amount: amountNum,
          settled: false,
        }],
        createdAt: new Date().toISOString(),
      }

      // 4. Inject into all matching expense query caches

      // A. "expenses" (Main List)
      queryClient.setQueryData(["expenses"], (old: any) => {
        if (!old?.data) return old
        const payload = old.data?.data || old.data
        const list = payload?.expenses
        if (Array.isArray(list)) {
          return {
            ...old,
            data: {
              ...old.data,
              data: {
                ...(old.data?.data || old.data),
                expenses: [optimisticExpense, ...list],
              },
            },
          }
        }
        return old
      })

      // B. "recent-expenses" (Dashboard Widget - Limit 8)
      queryClient.setQueryData(["recent-expenses"], (old: any) => {
        if (!old?.data) return old
        const payload = old.data?.data || old.data
        const list = payload?.expenses || payload
        if (Array.isArray(list)) {
          const newList = [optimisticExpense, ...list].slice(0, 8) // Maintain limit
          return {
            ...old,
            data: {
              ...old.data,
              data: { ...(old.data?.data || old.data), expenses: newList },
              expenses: newList // Handle both shapes
            }
          }
        }
        return old
      })

      // C. "expense-summary" (Dashboard Balances)
      queryClient.setQueryData(["expense-summary"], (old: any) => {
        if (!old?.data) return old
        const payload = old.data?.data || old.data
        const list = payload?.expenses
        if (Array.isArray(list)) {
          return {
            ...old,
            data: {
              ...old.data,
              data: {
                ...(old.data?.data || old.data),
                expenses: [optimisticExpense, ...list],
              },
            },
          }
        }
        return old
      })

      // D. "group-expenses" (Group Details)
      if (data.groupId) {
        queryClient.setQueryData(["group-expenses", data.groupId], (old: any) => {
          if (!old?.data) return old
          const payload = old.data?.data || old.data
          const list = payload?.expenses
          if (Array.isArray(list)) {
            return {
              ...old,
              data: {
                ...old.data,
                data: {
                  ...(old.data?.data || old.data),
                  expenses: [optimisticExpense, ...list],
                },
              },
            }
          }
          return old
        })
      }

      return { previousExpenses, previousRecent, previousSummary, previousGroupExpenses, tempId, groupId: data.groupId }
    },

    // ---- Rollback on error ----
    onError: (error: any, _variables, context) => {
      // Restore snapshots
      if (context?.previousExpenses) queryClient.setQueryData(["expenses"], context.previousExpenses)
      if (context?.previousRecent) queryClient.setQueryData(["recent-expenses"], context.previousRecent)
      if (context?.previousSummary) queryClient.setQueryData(["expense-summary"], context.previousSummary)
      if (context?.groupId && context?.previousGroupExpenses) {
        queryClient.setQueryData(["group-expenses", context.groupId], context.previousGroupExpenses)
      }

      const message = error?.response?.data?.message || error?.message || 'Failed to create expense'
      toast({
        variant: "destructive",
        title: "Expense creation failed",
        description: message + '. Your data has been preserved — please try again.',
      })
    },

    // ---- Replace temp record with real server record ----
    onSuccess: async (response: any, _variables, context) => {
      const created = response?.data?.data || response?.data
      const tempId = context?.tempId

      // Helper to replace tempId with real ID in a list
      const replaceInList = (list: any[]) => list.map(e => e._id === tempId ? created : e)

      // 1. Update "expenses"
      queryClient.setQueryData(["expenses"], (old: any) => {
        if (!old?.data) return old
        const payload = old.data?.data || old.data
        if (Array.isArray(payload?.expenses)) {
          const updated = replaceInList(payload.expenses)
          return { ...old, data: { ...old.data, data: { ...payload, expenses: updated } } }
        }
        return old
      })

      // 2. Update "recent-expenses"
      queryClient.setQueryData(["recent-expenses"], (old: any) => {
        if (!old?.data) return old
        const payload = old.data?.data || old.data
        const list = payload?.expenses || payload
        if (Array.isArray(list)) {
          const updated = replaceInList(list)
          // Handle both shapes again
          return { ...old, data: { ...old.data, data: { ...payload, expenses: updated }, expenses: updated } }
        }
        return old
      })

      // 3. Update "expense-summary"
      queryClient.setQueryData(["expense-summary"], (old: any) => {
        if (!old?.data) return old
        const payload = old.data?.data || old.data
        if (Array.isArray(payload?.expenses)) {
          const updated = replaceInList(payload.expenses)
          return { ...old, data: { ...old.data, data: { ...payload, expenses: updated } } }
        }
        return old
      })

      // 4. Update "group-expenses"
      if (context?.groupId) {
        queryClient.setQueryData(["group-expenses", context.groupId], (old: any) => {
          if (!old?.data) return old
          const payload = old.data?.data || old.data
          if (Array.isArray(payload?.expenses)) {
            const updated = replaceInList(payload.expenses)
            return { ...old, data: { ...old.data, data: { ...payload, expenses: updated } } }
          }
          return old
        })
      }

      // Link uploaded receipt if applicable
      try {
        const expenseId = created?._id || created?.id
        if (uploadedReceiptId && expenseId) {
          await receiptAPI.linkToExpense(uploadedReceiptId, expenseId)
        }
      } catch { }

      onOpenChange?.(false)
      reset()
      setSelectedFile(null)
      setUploadedReceiptId(null)
      setReceiptParsed(null)
      setSelectedMembers([])
      setShowCurrencySelection(false)
    },

    // ---- Always invalidate for consistency ----
    onSettled: (_data, _error, variables) => {
      // Invalidate all affected queries to ensure we eventually get the server-side truth
      // (calculations, balances, updated sorting, etc.)
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["recent-expenses"] })
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] })
      queryClient.invalidateQueries({ queryKey: ["user-groups"] })

      if (variables.groupId) {
        queryClient.invalidateQueries({ queryKey: ["group-expenses", variables.groupId] })
        // Also invalidate group-specific balance/settlements if they exist as separate keys
        queryClient.invalidateQueries({ queryKey: ["group-balance", variables.groupId] })
      }

      // Invalidate analytics
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey?.[0]
          return typeof key === 'string' && (key.startsWith('analytics-') || key === 'analytics-kpis')
        }
      })
    },
  })

  const onSubmit = (data: CreateExpenseFormData) => {
    try {
      // Ensure we have valid data before proceeding
      if (!data.description || !data.amount || (typeof data.amount === 'number' && data.amount <= 0) || !data.groupId) {
        return
      }

      // For group expenses, ensure we have members selected
      if (selectedMembers.length === 0) {
        return
      }

      createExpenseMutation.mutate(data)
    } catch (error) {

    }
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCurrencySelect = (currency: string) => {
    try {
      if (!currency) {

        return
      }
      setValue("currencyCode", currency)
      setShowCurrencySelection(false)
    } catch (error) {

      toast({
        title: "Error",
        description: "Failed to set currency. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="w-full max-w-md sm:max-w-lg max-h-[85vh] mx-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">Create New Expense</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Add a new expense to split with your group.</DialogDescription>
        </DialogHeader>

        {/* Receipt Upload */}
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"
            }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {isDragActive
              ? "Drop the receipt here..."
              : "Drag & drop a receipt, or click to select"}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What did you spend money on?"
              {...register("description")}
              disabled={createExpenseMutation.isPending}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                disabled={createExpenseMutation.isPending}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <div className="flex items-center gap-2">
                <CurrencySelector
                  value={selectedCurrency}
                  onValueChange={(value) => setValue("currencyCode", value)}
                  variant="compact"
                  disabled={createExpenseMutation.isPending}
                />
                {selectedGroup && selectedGroup.currencyCode && selectedGroup.currencyCode !== selectedCurrency && (
                  <p className="text-xs text-muted-foreground">
                    Group uses {selectedGroup.currencyCode}
                  </p>
                )}
              </div>
              {errors.currencyCode && <p className="text-sm text-destructive">{errors.currencyCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupId">Group</Label>
              <Select
                value={watch("groupId")}
                onValueChange={(value) => setValue("groupId", value)}
                disabled={createExpenseMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groupsData.map((group: any) => (
                    <SelectItem key={group._id} value={group._id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.groupId && <p className="text-sm text-destructive">{errors.groupId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="splitType">Split Type</Label>
              <Select
                value={watch("splitType")}
                onValueChange={(value: "equal" | "percentage" | "exact") => setValue("splitType", value)}
                disabled={createExpenseMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select split type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equal</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="exact">Exact Amount</SelectItem>
                </SelectContent>
              </Select>
              {errors.splitType && <p className="text-sm text-destructive">{errors.splitType.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={watch("category")}
                onValueChange={(value: "food" | "transportation" | "accommodation" | "entertainment" | "utilities" | "shopping" | "healthcare" | "other") => setValue("category", value)}
                disabled={createExpenseMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                {...register("date")}
                disabled={createExpenseMutation.isPending}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          {/* Group Members Selection */}
          {selectedGroup && (
            <div className="space-y-2">
              <Label>Select Members to Split With</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {selectedGroup.members?.map((member: any) => (
                  <div
                    key={member.user._id}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${selectedMembers.includes(member.user._id)
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                      }`}
                    onClick={() => toggleMember(member.user._id)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.user.firstName, member.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">
                      {member.user.firstName} {member.user.lastName}
                    </span>
                  </div>
                ))}
              </div>
              {selectedMembers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Select at least one member to split the expense with
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              {...register("notes")}
              disabled={createExpenseMutation.isPending}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={createExpenseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}