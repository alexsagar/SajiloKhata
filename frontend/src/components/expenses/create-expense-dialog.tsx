"use client"

import React from "react"

import { useEffect, useState } from "react"
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
import { Check, Loader2, Upload, X } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { expenseAPI, groupAPI, receiptAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { useDropzone } from "react-dropzone"
import { CurrencySelector } from "@/components/currency/currency-selector"
import { useAuth } from "@/contexts/auth-context"
import { CreateExpenseSchema } from "@/lib/validation"
import { useCreateExpenseMutation } from "@/hooks/use-create-expense-mutation"
import {
  formatReceiptItemsToNotes,
  type NormalizedReceiptData,
} from "@/lib/receipt-normalizer"

type CreateExpenseFormData = z.infer<typeof CreateExpenseSchema>

interface CreateExpenseDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultGroupId?: string
  children?: React.ReactNode
  initialReceiptData?: (NormalizedReceiptData & { receipt?: File | null }) | null
}

export function CreateExpenseDialog({
  open,
  onOpenChange,
  defaultGroupId,
  children,
  initialReceiptData = null,
}: CreateExpenseDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedReceiptId, setUploadedReceiptId] = useState<string | null>(null)
  const [receiptParsed, setReceiptParsed] = useState<any>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [showCurrencySelection, setShowCurrencySelection] = useState(false)
  const [lastAppliedReceiptKey, setLastAppliedReceiptKey] = useState<string | null>(null)
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
    getValues,
    trigger,
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

  const { mutate: createExpense, isPending } = useCreateExpenseMutation({
    selectedMembers,
    selectedGroup,
    onSuccess: (data) => {
      // Link uploaded receipt if applicable
      try {
        const created = data?.data?.data || data?.data
        const expenseId = created?._id || created?.id
        if (uploadedReceiptId && expenseId) {
          receiptAPI.linkToExpense(uploadedReceiptId, expenseId)
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
    onError: (error) => {
      console.error("Create expense failed", error)
    }
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

      // Pass receipt file if selected (though receipt scanning is mainly for personal, manual upload might exist)
      createExpense({ ...data, receiptFile: selectedFile })
    } catch (error) {

    }
  }

  const toggleMember = (userId: string) => {
    if (!userId) return
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const resolveMemberId = (member: any): string => {
    const raw = member?.user?._id || member?.user?.id || member?.user
    return raw ? String(raw) : ""
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

  const handleReceiptProcessed = (receiptData: NormalizedReceiptData & { receipt?: File | null }) => {
    const currentDescription = String(getValues("description") || "").trim()
    const currentAmountRaw = Number(getValues("amount") || 0)
    const currentNotes = String(getValues("notes") || "").trim()

    const merchantFallback = receiptData.merchant?.trim() || "Receipt"
    const nextNotes =
      receiptData.items.length > 0
        ? formatReceiptItemsToNotes(receiptData.items, receiptData.currency || selectedCurrency || "USD")
        : ""

    if (!currentDescription) {
      setValue("description", merchantFallback, { shouldValidate: true, shouldDirty: true })
    }
    if (!currentAmountRaw && typeof receiptData.total === "number" && receiptData.total > 0) {
      setValue("amount", receiptData.total, { shouldValidate: true, shouldDirty: true })
    }
    if (!currentNotes && nextNotes) {
      setValue("notes", nextNotes, { shouldValidate: true, shouldDirty: true })
    }
    if (receiptData.currency) {
      setValue("currencyCode", receiptData.currency, { shouldValidate: true, shouldDirty: true })
    }
    if (receiptData.date) {
      setValue("date", receiptData.date, { shouldValidate: true, shouldDirty: true })
    }
    if (receiptData.receipt) {
      setSelectedFile(receiptData.receipt)
    }
    trigger()
  }

  useEffect(() => {
    if (!open) {
      setLastAppliedReceiptKey(null)
      return
    }
  }, [open])

  useEffect(() => {
    if (!open || !initialReceiptData) return
    const key = JSON.stringify({
      merchant: initialReceiptData.merchant,
      total: initialReceiptData.total,
      currency: initialReceiptData.currency,
      date: initialReceiptData.date,
      itemCount: initialReceiptData.items?.length || 0,
      receiptName: initialReceiptData.receipt?.name || null,
    })
    if (key === lastAppliedReceiptKey) return
    handleReceiptProcessed(initialReceiptData)
    setLastAppliedReceiptKey(key)
  }, [open, initialReceiptData, lastAppliedReceiptKey])

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
              disabled={isPending}
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
                disabled={isPending}
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
                  disabled={isPending}
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
                disabled={isPending}
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
                disabled={isPending}
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
                disabled={isPending}
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
                disabled={isPending}
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
                  (() => {
                    const memberId = resolveMemberId(member)
                    const isSelected = selectedMembers.includes(memberId)
                    const firstName = member?.user?.firstName || ""
                    const lastName = member?.user?.lastName || ""
                    const avatar = member?.user?.avatar

                    return (
                      <button
                        type="button"
                        key={memberId || `${firstName}-${lastName}`}
                        className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all ${isSelected
                          ? "border-primary bg-primary/20 ring-1 ring-primary/50"
                          : "border-muted-foreground/25 hover:border-muted-foreground/50"
                          }`}
                        onClick={() => toggleMember(memberId)}
                        disabled={!memberId}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={avatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(firstName, lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate flex-1 text-left">
                          {firstName} {lastName}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                      </button>
                    )
                  })()
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
              disabled={isPending}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending && (
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
