
"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { CreateExpenseSchema } from "@/lib/validation"
import { z } from "zod"
import { syncDashboardState, syncGroupState } from "@/lib/server-state"

type CreateExpenseFormData = z.infer<typeof CreateExpenseSchema>

type SelectedGroupMemberUser = {
    _id?: string
    id?: string
    firstName?: string
    lastName?: string
    avatar?: string
}

interface UseCreateExpenseMutationOptions {
    onSuccess?: (data: unknown) => void
    onError?: (error: unknown) => void
    onSettled?: () => void
    // Context for split calculation
    selectedMembers?: string[]
    selectedGroup?: {
        members?: Array<{
            user?: SelectedGroupMemberUser | string
        }>
    } | null
}

type ExpenseListPayload = {
    expenses?: ExpenseLike[]
}

type ExpenseLike = {
    _id: string
    [key: string]: unknown
}

type ExpenseQueryCache = {
    data?: {
        data?: ExpenseListPayload
        expenses?: ExpenseLike[]
    } | ExpenseListPayload
}

type MutationContext = {
    previousExpenses: unknown
    previousRecent: unknown
    previousSummary: unknown
    previousGroupExpenses: unknown
    tempId: string
    groupId?: string
}

export function useCreateExpenseMutation(options: UseCreateExpenseMutationOptions = {}) {
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const { selectedMembers = [], selectedGroup } = options
    const currentUserId = user?.id || user?._id

    return useMutation({
        mutationFn: async (data: CreateExpenseFormData & { receiptFile?: File | null }) => {
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
            if (currentUserId) {
                formData.append('createdBy', currentUserId)
            } else {
                throw new Error('User not authenticated')
            }

            // Build splits for GROUP expenses
            if (data.groupId) {
                const amountNumber = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
                const participants = Array.from(new Set([currentUserId, ...selectedMembers])).filter(Boolean) as string[]

                if (participants.length === 0) {
                    // If no selected members but groupId is set, maybe it's just the user? 
                    // Usually group expense implies >1 person. But strictly, logic requires participants.
                    // Fallback to just user if empty to avoid crash, but backend might validate.
                }

                let splits: Array<{ user: string; amount?: number; percentage?: number }> = []
                const splitType = data.splitType || 'equal'

                if (participants.length > 0) {
                    if (splitType === 'equal') {
                        const share = amountNumber / participants.length
                        splits = participants.map((pid) => ({ user: pid, amount: Number(share.toFixed(2)) }))
                    } else if (splitType === 'percentage') {
                        const pct = Math.round((100 / participants.length) * 100) / 100
                        splits = participants.map((pid) => ({ user: pid, percentage: pct }))
                    } else if (splitType === 'exact') {
                        const share = amountNumber / participants.length
                        splits = participants.map((pid) => ({ user: pid, amount: Number(share.toFixed(2)) }))
                    }
                }

                // Only append splits if we calculated them
                if (splits.length > 0) {
                    formData.append('splits', JSON.stringify(splits))
                }
            }

            if (data.receiptFile) {
                formData.append('receipt', data.receiptFile)
            }

            return expenseAPI.createExpense(formData)
        },

        // ---- Optimistic update: instant UI visibility ----
        onMutate: async (data) => {
            // 1. Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["expenses"] })
            await queryClient.cancelQueries({ queryKey: ["recent-expenses"] })
            await queryClient.cancelQueries({ queryKey: ["expense-summary"] })
            if (data.groupId) {
                await queryClient.cancelQueries({ queryKey: ["group-expenses", data.groupId] })
                await queryClient.cancelQueries({ queryKey: ["group-balance", data.groupId] })
            }

            // 2. Snapshot
            const previousExpenses = queryClient.getQueryData(["expenses"])
            const previousRecent = queryClient.getQueryData(["recent-expenses"])
            const previousSummary = queryClient.getQueryData(["expense-summary"])
            const previousGroupExpenses = data.groupId ? queryClient.getQueryData(["group-expenses", data.groupId]) : null

            // 3. Build optimistic expense
            const tempId = `optimistic-${Date.now()}`
            const amountNum = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
            const amountCents = Math.round(amountNum * 100)

            // Calculate splits optimistically
            let optimisticSplits: Array<Record<string, unknown>> = []

            if (data.groupId) {
                const participants = Array.from(new Set([currentUserId, ...selectedMembers])).filter(Boolean) as string[]
                const splitType = data.splitType || 'equal'

                if (participants.length > 0) {
                    if (splitType === 'equal') {
                        const share = amountNum / participants.length
                        const shareCents = Math.round(share * 100)
                        optimisticSplits = participants.map(pid => {
                            const mUser = (selectedGroup?.members || []).find((m) => (typeof m.user === 'object' && m.user ? (m.user._id || m.user.id) : m.user) === pid)?.user
                            const memberInfo = typeof mUser === 'object' ? mUser : undefined
                            return {
                                user: {
                                    _id: pid,
                                    firstName: memberInfo?.firstName || (pid === currentUserId ? user?.firstName : 'Member'),
                                    lastName: memberInfo?.lastName || (pid === currentUserId ? user?.lastName : ''),
                                    avatar: memberInfo?.avatar || '',
                                },
                                amount: share,
                                amountCents: shareCents,
                                settled: false
                            }
                        })
                    } else {
                        // Fallback for non-equal (percentage/exact) to simple equal share for UI responsiveness
                        // or just show the total. But "You Owe" depends on splits.
                        // We'll approximate equal split for optimistic UI to avoid complex math locally
                        const share = amountNum / participants.length
                        const shareCents = Math.round(share * 100)
                        optimisticSplits = participants.map(pid => {
                            const mUser = (selectedGroup?.members || []).find((m) => (typeof m.user === 'object' && m.user ? (m.user._id || m.user.id) : m.user) === pid)?.user
                            const memberInfo = typeof mUser === 'object' ? mUser : undefined
                            return {
                                user: { _id: pid, firstName: memberInfo?.firstName || '' },
                                amount: share,
                                amountCents: shareCents,
                                settled: false
                            }
                        })
                    }
                }
            } else {
                // Personal
                optimisticSplits = [{
                    user: {
                        _id: currentUserId,
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        username: user?.username || '',
                    },
                    amountCents,
                    amount: amountNum,
                    settled: false,
                }]
            }

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
                    _id: currentUserId,
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    username: user?.username || '',
                    avatar: user?.avatar || '',
                },
                splits: optimisticSplits,
                createdAt: new Date().toISOString(),
            }

            // 4. Inject into caches
            const updateListCache = (old: ExpenseQueryCache | undefined, limit?: number) => {
                if (!old?.data) return old
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload = ('data' in (old.data || {}) ? (old.data as any).data : old.data) as any
                const list = Array.isArray(payload) ? payload : (payload?.expenses || [])

                if (Array.isArray(list)) {
                    const newList = [optimisticExpense, ...list]
                    const slicedList = limit ? newList.slice(0, limit) : newList

                    return {
                        ...old,
                        data: {
                            ...old.data,
                            data: {
                                ...(payload || {}),
                                expenses: slicedList
                            },
                            expenses: slicedList // Polyfill
                        }
                    }
                }
                return old
            }

            queryClient.setQueryData(["expenses"], (old: ExpenseQueryCache | undefined) => updateListCache(old))
            queryClient.setQueryData(["recent-expenses"], (old: ExpenseQueryCache | undefined) => updateListCache(old, 8))
            queryClient.setQueryData(["expense-summary"], (old: ExpenseQueryCache | undefined) => updateListCache(old))

            if (data.groupId) {
                queryClient.setQueryData(["group-expenses", data.groupId], (old: ExpenseQueryCache | undefined) => updateListCache(old))
            }

            return { previousExpenses, previousRecent, previousSummary, previousGroupExpenses, tempId, groupId: data.groupId }
        },

        onError: (error: unknown, _variables, context?: MutationContext) => {
            if (context?.previousExpenses) queryClient.setQueryData(["expenses"], context.previousExpenses)
            if (context?.previousRecent) queryClient.setQueryData(["recent-expenses"], context.previousRecent)
            if (context?.previousSummary) queryClient.setQueryData(["expense-summary"], context.previousSummary)
            if (context?.groupId && context?.previousGroupExpenses) {
                queryClient.setQueryData(["group-expenses", context.groupId], context.previousGroupExpenses)
            }

            const message = error instanceof Error ? error.message : 'Failed to create expense'
            toast({
                variant: "destructive",
                title: "Expense creation failed",
                description: message + '. Your data has been preserved.',
            })
            options.onError?.(error)
        },

        onSuccess: async (response, variables, context?: MutationContext) => {
            const created = response?.data?.data || response?.data
            const tempId = context?.tempId

            // Helper to replace tempId
            const replaceInList = (list: ExpenseLike[]) => list.map(e => e._id === tempId ? created : e)
            const updateListCache = (old: ExpenseQueryCache | undefined) => {
                if (!old?.data) return old
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload = ('data' in (old.data || {}) ? (old.data as any).data : old.data) as any
                const list = Array.isArray(payload) ? payload : (payload?.expenses || [])

                if (Array.isArray(list)) {
                    const updated = replaceInList(list)
                    return { ...old, data: { ...old.data, data: { ...(payload || {}), expenses: updated }, expenses: updated } }
                }
                return old
            }

            queryClient.setQueryData(["expenses"], updateListCache)
            queryClient.setQueryData(["recent-expenses"], updateListCache)
            queryClient.setQueryData(["expense-summary"], updateListCache)
            if (context?.groupId) {
                queryClient.setQueryData(["group-expenses", context.groupId], updateListCache)
            }

            // Link receipt if generic upload was used (legacy path check?)
            // logic for linking uploaded receipt ID if one was pre-uploaded is up to the caller to handle?
            // Actually `CreateExpenseDialog` had logic: `linkToExpense(uploadedReceiptId, expenseId)`
            // The hook handles `receiptFile` being passed in directly.
            // If the caller manages `uploadedReceiptId` separately, they can do it in `onSuccess` callback.

            options.onSuccess?.(response)
        },

        onSettled: (_data, _error, variables) => {
            if (variables.groupId) {
                syncGroupState(queryClient, { groupId: String(variables.groupId), includeNotifications: true })
            } else {
                syncDashboardState(queryClient, { includeNotifications: true })
            }
            queryClient.invalidateQueries({
                predicate: (q) => {
                    const key = q.queryKey?.[0]
                    return typeof key === 'string' && (key.startsWith('analytics-') || key === 'analytics-kpis')
                }
            })
            options.onSettled?.()
        }
    })
}
