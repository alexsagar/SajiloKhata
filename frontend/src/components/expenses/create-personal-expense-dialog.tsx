"use client"

import React from "react"

import { useState, useEffect } from "react"
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
import { Loader2, X, Scan } from "lucide-react"
import { useCreateExpenseMutation } from "@/hooks/use-create-expense-mutation"
import { CurrencySelector } from "@/components/currency/currency-selector"
import { useAuth } from "@/contexts/auth-context"
import { CreateExpenseSchema } from "@/lib/validation"
import { SmartReceiptScanner } from "@/components/ocr/smart-receipt-scanner"
import { authAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import {
  formatReceiptItemsToNotes,
  type NormalizedReceiptData,
} from "@/lib/receipt-normalizer"


type CreatePersonalExpenseFormData = z.infer<typeof CreateExpenseSchema>

interface CreatePersonalExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialReceiptData?: (NormalizedReceiptData & { receipt?: File | null }) | null
}

export function CreatePersonalExpenseDialog({ open, onOpenChange, initialReceiptData = null }: CreatePersonalExpenseDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [lastAppliedReceiptKey, setLastAppliedReceiptKey] = useState<string | null>(null)

  const { user, loading: authLoading, refreshAuth } = useAuth()
  const isDev = process.env.NODE_ENV !== "production"

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        setBackendStatus('checking')
        await authAPI.me()
        if (isDev) {
          console.debug("CreatePersonalExpenseDialog: backend auth check passed")
        }
          setBackendStatus('online')
        if (!user && !authLoading) {
          await refreshAuth()
        }
      } catch (error) {
        setBackendStatus('offline')
      }
    }

    if (open) {
      checkBackend()
    }
  }, [open, user, authLoading, refreshAuth])

  // Don't render if still loading auth
  if (authLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-md sm:max-w-lg max-h-[85vh] mx-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-semibold">Create Personal Expense</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Checking authentication...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Show authentication error if no user
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-md sm:max-w-lg max-h-[85vh] mx-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-semibold">Authentication Required</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You need to be logged in to create expenses. Please try refreshing the page or logging in again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Backend Status */}
            <div className={`p-3 border rounded-lg ${backendStatus === 'online'
              ? 'bg-green-50 border-green-200'
              : backendStatus === 'offline'
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
              }`}>
              <div className="text-sm">
                <p className="font-medium mb-1">
                  Backend Status: {
                    backendStatus === 'online' ? '🟢 Online' :
                      backendStatus === 'offline' ? '🔴 Offline' :
                        '🟡 Checking...'
                  }
                </p>
                {backendStatus === 'offline' && (
                  <p className="text-red-700 text-xs">
                    The backend server appears to be offline. Please ensure it's running on localhost:5000
                  </p>
                )}
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Possible issues:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Your session may have expired</li>
                  <li>The backend server might not be running</li>
                  <li>There might be a network connectivity issue</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="outline" onClick={refreshAuth}>
                Refresh Auth
              </Button>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<CreatePersonalExpenseFormData>({
    resolver: zodResolver(CreateExpenseSchema),
    defaultValues: {
      category: "other",
      date: new Date().toISOString().split('T')[0],
      currencyCode: user?.preferences?.currency || "USD",
      description: "",
      amount: 0,
    },
  })

  const selectedCurrency = watch("currencyCode")


  const { mutate: createExpense, isPending } = useCreateExpenseMutation({
    onSuccess: (data) => {
      if (isDev) console.debug("CreatePersonalExpenseDialog: expense created", data)

      // Close dialog and reset form immediately
      onOpenChange(false)
      setTimeout(() => {
        reset()
        setSelectedFile(null)
        setShowReceiptScanner(false)
      }, 100)
    },
    onError: (error) => {
      if (isDev) console.debug("CreatePersonalExpenseDialog: expense creation failed", error)
    }
  })

  const onSubmit = (data: CreatePersonalExpenseFormData) => {
    try {
      // Validate required fields
      if (!data.description || !data.amount || (typeof data.amount === 'number' && data.amount <= 0)) {
        return
      }

      // Pass the receipt file to the mutation
      createExpense({ ...data, receiptFile: selectedFile })
    } catch (error) {
      if (isDev) console.debug("CreatePersonalExpenseDialog: form submit error", error)
    }
  }

  const handleReceiptProcessed = (receiptData: NormalizedReceiptData & { receipt?: File | null }) => {
    try {
      const currentDescription = String(getValues("description") || "").trim()
      const currentAmountRaw = Number(getValues("amount") || 0)
      const currentNotes = String(getValues("notes") || "").trim()

      const merchantFallback = receiptData.merchant?.trim() || "Receipt"
      const nextNotes =
        receiptData.items.length > 0
          ? formatReceiptItemsToNotes(receiptData.items, receiptData.currency || selectedCurrency || "USD")
          : ""

      const skipped: string[] = []
      const applied: string[] = []

      if (!currentDescription) {
        setValue("description", merchantFallback, { shouldValidate: true, shouldDirty: true })
        applied.push("Description")
      } else {
        skipped.push("Description")
      }

      if (!currentAmountRaw && typeof receiptData.total === "number" && receiptData.total > 0) {
        setValue("amount", receiptData.total, { shouldValidate: true, shouldDirty: true })
        applied.push("Amount")
      } else if (currentAmountRaw) {
        skipped.push("Amount")
      }

      if (!currentNotes && nextNotes) {
        setValue("notes", nextNotes, { shouldValidate: true, shouldDirty: true })
        applied.push("Notes")
      } else if (currentNotes) {
        skipped.push("Notes")
      }

      if (receiptData.currency) {
        setValue("currencyCode", receiptData.currency, { shouldValidate: true, shouldDirty: true })
        applied.push("Currency")
      }

      if (receiptData.date) {
        setValue("date", receiptData.date, { shouldValidate: true, shouldDirty: true })
        applied.push("Date")
      }

      if (receiptData.receipt) {
        setSelectedFile(receiptData.receipt)
      }

      trigger()
      if (!open) onOpenChange(true)

      toast({
        title: "Receipt data applied",
        description:
          applied.length > 0
            ? `${applied.join(", ")} filled.${skipped.length ? ` Skipped: ${skipped.join(", ")}.` : ""}`
            : "No empty fields were available to auto-fill.",
      })
    } catch (error) {
      if (isDev) {
        console.debug("CreatePersonalExpenseDialog: receipt processing error", error)
      }
      toast({
        title: "Could not apply receipt data",
        description: "Please fill the expense fields manually.",
        variant: "destructive",
      })
    }
  }

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
      <DialogContent className="w-full max-w-md sm:max-w-lg max-h-[85vh] mx-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">Create Personal Expense</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add a new personal expense to track your spending.
          </DialogDescription>
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

        {/* Receipt Scanner */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowReceiptScanner(true)}
            className="h-7 px-3 text-xs"
          >
            <Scan className="h-3 w-3 mr-1" />
            Smart Receipt Scanner
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">Description</Label>
            <Input
              id="description"
              placeholder="What did you spend money on?"
              {...register("description")}
              disabled={isPending}
              className="h-8 text-sm"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                disabled={isPending}
                className="h-8 text-sm"
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="currency" className="text-xs">Currency</Label>
              <CurrencySelector
                value={selectedCurrency}
                onValueChange={(value) => setValue("currencyCode", value)}
                variant="compact"
                disabled={isPending}
              />
              {errors.currencyCode && <p className="text-xs text-destructive">{errors.currencyCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs">Category</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value as CreatePersonalExpenseFormData["category"])}
                disabled={isPending}
              >
                <SelectTrigger className="h-8 text-sm">
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
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="date" className="text-xs">Date</Label>
              <Input
                id="date"
                type="date"
                {...register("date")}
                disabled={isPending}
                className="h-8 text-sm"
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              {...register("notes")}
              disabled={isPending}
              className="min-h-[50px] text-sm"
            />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              size="sm"
              className="h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              size="sm"
              className="h-8 px-3"
            >
              {isPending && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Create Expense
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Smart Receipt Scanner */}
      <SmartReceiptScanner
        open={showReceiptScanner}
        onOpenChange={setShowReceiptScanner}
        onReceiptProcessed={handleReceiptProcessed}
      />
    </Dialog>
  )
}
