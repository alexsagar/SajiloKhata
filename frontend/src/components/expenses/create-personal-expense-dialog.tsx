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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, X, Scan } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { CurrencySelector } from "@/components/currency/currency-selector"
import { useAuth } from "@/contexts/auth-context"
import { CreateExpenseSchema } from "@/lib/validation"
import { SmartReceiptScanner } from "@/components/ocr/smart-receipt-scanner"

type CreatePersonalExpenseFormData = z.infer<typeof CreateExpenseSchema>

interface CreatePersonalExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePersonalExpenseDialog({ open, onOpenChange }: CreatePersonalExpenseDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCurrencySelection, setShowCurrencySelection] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const queryClient = useQueryClient()
  const { user, loading: authLoading, refreshAuth } = useAuth()

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        setBackendStatus('checking')
        
        // Try to access the auth endpoint directly
        const authResponse = await fetch('http://localhost:5000/api/auth/me', { 
          method: 'GET',
          credentials: 'include'
        })
        
        if (authResponse.ok) {
          setBackendStatus('online')
          console.log('Auth endpoint accessible, status:', authResponse.status)
          
          // Get the actual response data to see the structure
          try {
            const responseData = await authResponse.json()
            console.log('CreatePersonalExpenseDialog - Direct API response:', responseData)
            console.log('CreatePersonalExpenseDialog - Response data keys:', Object.keys(responseData || {}))
          } catch (parseError) {
            console.log('CreatePersonalExpenseDialog - Could not parse response as JSON:', parseError)
          }
          
          // If backend is online but we don't have user, try to refresh auth
          if (!user && !authLoading) {
            console.log('Backend online but no user, refreshing auth...')
            await refreshAuth()
          }
        } else {
          setBackendStatus('offline')
          console.log('Auth endpoint returned error status:', authResponse.status)
        }
      } catch (error) {
        console.log('Backend health check failed:', error)
        setBackendStatus('offline')
      }
    }

    if (open) {
      checkBackend()
    }
  }, [open, user, authLoading, refreshAuth])

  // Debug logging and monitoring
  useEffect(() => {
    console.log('CreatePersonalExpenseDialog - User changed:', user)
    console.log('CreatePersonalExpenseDialog - Auth loading:', authLoading)
    if (user) {
      console.log('CreatePersonalExpenseDialog - User ID:', user.id)
      console.log('CreatePersonalExpenseDialog - User object keys:', Object.keys(user))
      console.log('CreatePersonalExpenseDialog - User preferences:', user.preferences)
      
      // Validate user object structure
      if (!user.id) {
        console.error('CreatePersonalExpenseDialog - User object missing ID!')
        console.error('CreatePersonalExpenseDialog - Full user object:', user)
      }
      
      if (!user.preferences) {
        console.error('CreatePersonalExpenseDialog - User object missing preferences!')
      }
    } else {
      console.log('CreatePersonalExpenseDialog - No user object available')
    }
  }, [user, authLoading])

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
            <div className={`p-3 border rounded-lg ${
              backendStatus === 'online' 
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


  const createPersonalExpenseMutation = useMutation({
    mutationFn: async (data: CreatePersonalExpenseFormData) => {
      // Double-check user authentication
      if (!user?.id) {
        throw new Error('User not authenticated. Please log in again.')
      }

      console.log('CreatePersonalExpenseDialog - Creating expense with user:', user)
      console.log('CreatePersonalExpenseDialog - User ID:', user.id)
      console.log('CreatePersonalExpenseDialog - User object keys:', Object.keys(user))

      const formData = new FormData()
      
      // Add basic fields
      formData.append('description', data.description)
      formData.append('amount', data.amount.toString())
      formData.append('category', data.category || 'other')
      formData.append('date', data.date || new Date().toISOString())
      if (data.notes) formData.append('notes', data.notes)
      if (data.currencyCode) formData.append('currencyCode', data.currencyCode)
      
      // Add required createdBy field
      formData.append('createdBy', user.id)
      
      // Debug: Log all FormData entries
      console.log('CreatePersonalExpenseDialog - FormData contents:')
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`)
      }
      
      // Personal expense - no groupId, no splits (server will auto-split)
      
      if (selectedFile) {
        formData.append('receipt', selectedFile)
      }
      
      return expenseAPI.createExpense(formData)
    },
    onMutate: async (newExpenseData) => {
      console.log("🚀 Starting optimistic update for expense:", newExpenseData.description)
      
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["expenses"] })
      await queryClient.cancelQueries({ queryKey: ["recent-expenses"] })

      // Snapshot the previous values for all queries
      const previousData = {
        expenses: queryClient.getQueryData(["expenses"]),
        recentExpenses: queryClient.getQueryData(["recent-expenses"]),
        expensesUndefined: queryClient.getQueryData(["expenses", undefined]),
        expensesNull: queryClient.getQueryData(["expenses", null])
      }

      console.log("📊 Current query data:", previousData)

      // Create the optimistic expense object
      const tempId = `temp-${Date.now()}`
      const optimisticExpense = {
        _id: tempId,
        id: tempId,
        description: newExpenseData.description,
        amount: newExpenseData.amount,
        category: newExpenseData.category || 'other',
        date: newExpenseData.date || new Date().toISOString(),
        notes: newExpenseData.notes || '',
        currencyCode: newExpenseData.currencyCode || user?.preferences?.currency || 'NPR',
        createdBy: user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPersonal: true,
        splits: [{
          userId: user?.id,
          amount: newExpenseData.amount,
          percentage: 100
        }]
      }

      console.log("✨ Created optimistic expense:", optimisticExpense)

      // Optimistically update all expense queries with better logic
      const updateQueryData = (queryKey: any[], debugName: string) => {
        queryClient.setQueryData(queryKey, (old: any) => {
          console.log(`📝 Updating ${debugName} query:`, old)
          
          // Handle different data structures
          if (!old) {
            console.log(`➕ ${debugName}: Creating new data structure`)
            return [optimisticExpense]
          }
          
          if (Array.isArray(old)) {
            console.log(`📋 ${debugName}: Direct array, adding to front`)
            return [optimisticExpense, ...old]
          }
          
          if (old.data && Array.isArray(old.data)) {
            console.log(`📦 ${debugName}: Wrapped array, adding to front`)
            return { ...old, data: [optimisticExpense, ...old.data] }
          }
          
          if (old.expenses && Array.isArray(old.expenses)) {
            console.log(`💼 ${debugName}: Expenses property, adding to front`)
            return { ...old, expenses: [optimisticExpense, ...old.expenses] }
          }
          
          console.log(`❓ ${debugName}: Unknown structure, returning as-is`)
          return old
        })
      }

      // Update all possible expense query variations
      updateQueryData(["expenses"], "expenses")
      updateQueryData(["expenses", undefined], "expenses-undefined")  
      updateQueryData(["expenses", null], "expenses-null")
      updateQueryData(["recent-expenses"], "recent-expenses")
      
      console.log("✅ Optimistic updates completed")

      // Return a context object with the snapshotted value
      return { previousData, optimisticExpense }
    },
    onSuccess: (data, variables, context) => {
      console.log("✅ Expense created successfully, server response:", data)
      
      // Close dialog and reset form immediately
      onOpenChange(false)
      setTimeout(() => {
        reset()
        setSelectedFile(null)
        setShowCurrencySelection(false)
        setShowReceiptScanner(false)
      }, 100)

      // Force immediate refetch of all expense queries to get latest data
      console.log("🔄 Force refetching all expense queries")
      queryClient.refetchQueries({ queryKey: ["expenses"] })
      queryClient.refetchQueries({ queryKey: ["recent-expenses"] })
      
      // Also invalidate analytics/dashboard queries
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (error: any, variables, context) => {
      console.log("❌ Expense creation failed, reverting optimistic updates")
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        // Revert all expense queries to their previous state
        queryClient.setQueryData(["expenses"], context.previousData.expenses)
        queryClient.setQueryData(["expenses", undefined], context.previousData.expensesUndefined)
        queryClient.setQueryData(["expenses", null], context.previousData.expensesNull)
        queryClient.setQueryData(["recent-expenses"], context.previousData.recentExpenses)
        
        console.log("🔄 Reverted all queries to previous state")
      }
    },
  })

  const onSubmit = (data: CreatePersonalExpenseFormData) => {
    try {
      // Validate required fields
      if (!data.description || !data.amount || (typeof data.amount === 'number' && data.amount <= 0)) {
        return
      }

      // Show immediate feedback that expense is being created
      console.log("Creating personal expense with optimistic update...")
      createPersonalExpenseMutation.mutate(data)
    } catch (error) {
      console.error("Form submission error:", error)
    }
  }

  const handleCurrencySelect = (currency: string) => {
    try {
      if (!currency) {
        console.warn("No currency selected")
        return
      }
      setValue("currencyCode", currency)
      setShowCurrencySelection(false)
    } catch (error) {
      console.error("Currency selection error:", error)
    }
  }

  const handleReceiptProcessed = (receiptData: any) => {
    console.log("=== RECEIPT PROCESSING START ===")
    console.log("Personal Expense Dialog - Received receipt data:", receiptData)
    console.log("Dialog open state:", open)
    console.log("User currency:", user?.preferences?.currency)
    
    try {
      // Prepare the new form values
      const newFormValues = {
        category: receiptData.category || "other",
        date: receiptData.date || new Date().toISOString().split('T')[0],
        currencyCode: user?.preferences?.currency || "NPR",
        description: receiptData.description || "",
        amount: receiptData.amount || 0,
      }
      
      console.log("Form values to set:", newFormValues)
      
      // Reset form with new values to ensure UI updates
      reset(newFormValues)
      console.log("Form reset completed")
      
      // Set the file separately
      if (receiptData.receipt) {
        console.log("Setting file:", receiptData.receipt.name)
        setSelectedFile(receiptData.receipt)
      }
      
      // Force a re-render and ensure dialog stays open
      setTimeout(() => {
        console.log("Triggering form validation")
        trigger()
        
        // Ensure dialog stays open
        if (!open) {
          console.log("Dialog was closed, forcing it to stay open")
          onOpenChange(true)
        }
      }, 100)

      
      console.log("=== RECEIPT PROCESSING END ===")
    } catch (error) {
      console.error("Error processing receipt data:", error)
      console.error("Receipt data that caused error:", receiptData)
    }
  }

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
              disabled={createPersonalExpenseMutation.isPending}
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
                disabled={createPersonalExpenseMutation.isPending}
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
                disabled={createPersonalExpenseMutation.isPending}
              />
              {errors.currencyCode && <p className="text-xs text-destructive">{errors.currencyCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs">Category</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value as any)}
                disabled={createPersonalExpenseMutation.isPending}
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
                disabled={createPersonalExpenseMutation.isPending}
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
              disabled={createPersonalExpenseMutation.isPending}
              className="min-h-[50px] text-sm"
            />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createPersonalExpenseMutation.isPending}
              size="sm"
              className="h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPersonalExpenseMutation.isPending}
              size="sm"
              className="h-8 px-3"
            >
              {createPersonalExpenseMutation.isPending && (
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
