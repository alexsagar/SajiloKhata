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
import { Loader2, Upload, X } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { expenseAPI, receiptAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useDropzone } from "react-dropzone"
import { CurrencySelector } from "@/components/currency/currency-selector"
import { useAuth } from "@/contexts/auth-context"
import { CreateExpenseSchema } from "@/lib/validation"

type CreatePersonalExpenseFormData = z.infer<typeof CreateExpenseSchema>

interface CreatePersonalExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePersonalExpenseDialog({ open, onOpenChange }: CreatePersonalExpenseDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCurrencySelection, setShowCurrencySelection] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
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
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
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
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
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


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      setSelectedFile(file)
      // Auto-upload and OCR for personal expense to prefill fields
      if (file) {
        const fd = new FormData()
        fd.append('receipt', file)
        receiptAPI.uploadReceipt(fd as any)
          .then((res: any) => {
            const data = res?.data?.data || {}
            const parsed = data.parsedData || {}
            const extracted: string = data.extractedText || ''
            // Only set amount (total) and notes (items list)
            let totalNum: number | null = null
            const toNumber = (val: any): number => {
              if (val == null) return NaN
              let s = String(val).trim()
              // Remove currency codes
              s = s.replace(/[A-Z]{2,}\s*/g, '')
              // Decide if comma is decimal or thousands
              const lastComma = s.lastIndexOf(',')
              const lastDot = s.lastIndexOf('.')
              if (lastComma !== -1 && lastDot === -1) {
                // If comma within last 3 chars, treat as decimal, else thousands
                if (s.length - lastComma <= 3) {
                  s = s.replace(',', '.')
                } else {
                  s = s.replace(/,/g, '')
                }
              } else if (lastComma !== -1 && lastDot !== -1) {
                // If both exist and comma is thousands (before dot), drop commas
                if (lastComma < lastDot) s = s.replace(/,/g, '')
              }
              // Remove any remaining thousands separators
              s = s.replace(/\s/g, '')
              const n = Number(s)
              return Number.isFinite(n) ? n : NaN
            }

            if (parsed.total) {
              totalNum = toNumber(parsed.total)
            } else if (extracted) {
              const totalRegexes = [
                /\btotal\s*payable\b[:\s-]*[A-Z]{2,}?\s*([-]?[0-9][0-9.,]*)/i,
                /\bgrand\s*total\b[:\s-]*[A-Z]{2,}?\s*([-]?[0-9][0-9.,]*)/i,
                /\btotal\b[:\s-]*[A-Z]{2,}?\s*([-]?[0-9][0-9.,]*)/i,
                /\btotal\s*payable\b[:\s-]*([-]?[0-9][0-9.,]*)/i,
                /\bgrand\s*total\b[:\s-]*([-]?[0-9][0-9.,]*)/i,
                /\btotal\b[:\s-]*([-]?[0-9][0-9.,]*)/i,
              ]
              let m: RegExpMatchArray | null = null
              for (const r of totalRegexes) { m = extracted.match(r); if (m) break }
              if (m && m[1]) totalNum = toNumber(m[1])
            }
            if (typeof totalNum === 'number' && !Number.isNaN(totalNum) && totalNum > 0) {
              if (!Number.isNaN(totalNum) && totalNum > 0) {
                setValue('amount', totalNum)
              }
            }
            let itemNames = ''
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
              itemNames = parsed.items
                .map((it: any) => String(it.description || '').trim())
                .filter((s: string) => s.length > 0)
                .join(', ')
            } else if (extracted) {
              const lines = extracted.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
              const startIdx = lines.findIndex(l => /order\s*details|^item(\s+qty)?/i.test(l))
              const stopIdx = lines.findIndex(l => /(subtotal|service\s*charge|vat|discount|total\s*payable|\btotal\b)/i.test(l))
              const range = lines.slice(startIdx >= 0 ? startIdx + 1 : 0, stopIdx > 0 ? stopIdx : undefined)
              const amountCapture = /([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)/
              const items: string[] = []
              for (const ln of range) {
                if (/(subtotal|service\s*charge|vat|tax|cashier|server|receipt|phone|date|discount)/i.test(ln)) continue
                // Try to match lines ending with an amount first
                const m = ln.match(new RegExp(`^(.*?)(?:\\s+)${amountCapture.source}\\s*$`))
                if (m) {
                  let desc = (m[1] || '').trim()
                  // Strip trailing numbers (qty/rate) to keep only item name
                  desc = desc.replace(/\s+\d.*$/, '')
                  if (desc && desc.length > 2) items.push(desc)
                  continue
                }
                // Fallback: treat first token as item name if line contains numbers
                const tokens = ln.split(/\s+/)
                const first = tokens[0]
                if (first && tokens.length >= 2 && tokens.some(t => amountCapture.test(t))) {
                  items.push(first)
                }
              }
              if (items.length) {
                itemNames = items.join(', ')
              }
            }
            if (itemNames) {
              const existing = watch('notes') || ''
              const newNotes = existing ? `${existing}\nItems: ${itemNames}` : `Items: ${itemNames}`
              setValue('notes', newNotes)
            }
            toast({ title: 'Receipt processed', description: 'Total and items were added. Please verify before saving.' })
          })
          .catch(() => {
            toast({ variant: 'destructive', title: 'Processing failed', description: 'Failed to process receipt. You can still enter details manually.' })
          })
      }
    }
  })

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
    onSuccess: async (resp) => {
      // Try to extract the created expense from various possible response shapes
      const createdExpense = (resp as any)?.data?.data?.expense || (resp as any)?.data?.expense || (resp as any)?.data

      // Optimistically update recent-expenses list
      queryClient.setQueryData(["recent-expenses"], (old: any) => {
        if (!old) return old
        const oldExpenses = old?.data?.expenses || old?.expenses
        if (Array.isArray(oldExpenses)) {
          const updated = [createdExpense, ...oldExpenses]
          if (old.data && Array.isArray(old.data.expenses)) {
            return { ...old, data: { ...old.data, expenses: updated } }
          }
          return { ...(old || {}), expenses: updated }
        }
        return old
      })

      // Optimistically update any expenses queries
      queryClient.setQueriesData({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "expenses" }, (old: any) => {
        if (!old) return old
        const payload = (old?.data && old.data.data) ? old.data.data : old.data
        if (payload && Array.isArray(payload.expenses)) {
          const updated = [createdExpense, ...payload.expenses]
          if (old.data && old.data.data) {
            return { ...old, data: { ...old.data, data: { ...old.data.data, expenses: updated } } }
          }
          if (old.data) {
            return { ...old, data: { ...old.data, expenses: updated } }
          }
        }
        return old
      })

      // Invalidate all expense-related queries to ensure the lists and dashboard refresh
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "expenses" })
      queryClient.invalidateQueries({ queryKey: ["recent-expenses"] })
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] })
      queryClient.invalidateQueries({ queryKey: ["expense-chart-data"] })

      // Proactively refetch the most visible widgets immediately
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["recent-expenses"] }),
        queryClient.refetchQueries({ queryKey: ["expense-summary"] }),
        queryClient.refetchQueries({ queryKey: ["expense-chart-data"] }),
      ])
      
      toast({
        title: "Personal expense created",
        description: "Your personal expense has been created successfully.",
      })
      onOpenChange(false)
      reset()
      setSelectedFile(null)
      setShowCurrencySelection(false)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create personal expense",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: CreatePersonalExpenseFormData) => {
    try {
      // Validate required fields
      if (!data.description || !data.amount || (typeof data.amount === 'number' && data.amount <= 0)) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      createPersonalExpenseMutation.mutate(data)
    } catch (error) {
      console.error("Form submission error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
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
      toast({
        title: "Error",
        description: "Failed to set currency. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
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

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
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

          <div className="grid grid-cols-2 gap-2">
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

          <div className="flex justify-end gap-2 pt-1">
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
    </Dialog>
  )
}
