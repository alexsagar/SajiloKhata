/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateExpenseMutation } from '../use-create-expense-mutation'
import { expenseAPI } from '@/lib/api'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

interface CreateExpensePayload {
    description: string
    amount: number
    currencyCode: string
    date?: string
    category?: string
    groupId?: string
    splitType?: string
}

interface OptimisticExpense {
    _id?: string
    description: string
    amount: number
    _optimistic?: boolean
}

interface ExpenseListCache {
    data: {
        data?: {
            expenses?: OptimisticExpense[]
        }
        expenses?: OptimisticExpense[]
    }
}

interface CreateExpenseApiResponse {
    data: {
        data: OptimisticExpense
    }
}

// Mock dependencies
vi.mock('@/lib/api', () => ({
    expenseAPI: {
        createExpense: vi.fn(),
    },
    receiptAPI: {
        linkToExpense: vi.fn(),
    }
}))

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        user: {
            id: 'user-1',
            firstName: 'Test',
            lastName: 'User',
            preferences: { currency: 'USD' }
        }
    })
}))

vi.mock('@/hooks/use-toast', () => ({
    toast: vi.fn()
}))

describe('useCreateExpenseMutation', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        })
        vi.clearAllMocks()
    })

    afterEach(() => {
        queryClient.clear()
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    it('should perform optimistic updates on mutation', async () => {
        // Setup initial cache state to match backend response shape exactly
        const initialExpenses = { data: { data: { expenses: [] } } }
        queryClient.setQueryData(['expenses'], initialExpenses)

        // Setup API mock with delay to capture optimistic state
        const mockExpense = { _id: 'real-id', description: 'Test Expense', amount: 100 }
        vi.mocked(expenseAPI.createExpense).mockImplementation(async () => {
            await new Promise(r => setTimeout(r, 100))
            return { data: { data: mockExpense } } as CreateExpenseApiResponse
        })

        const { result } = renderHook(() => useCreateExpenseMutation(), { wrapper })

        // Execute mutation
        result.current.mutate({
            description: 'Test Expense',
            amount: 100,
            currencyCode: 'USD',
            date: '2023-01-01',
            category: 'food',
            groupId: '',
            splitType: 'equal'
        } as CreateExpensePayload)

        // Verify optimistic update happens immediately
        await waitFor(() => {
            const expensesCache = queryClient.getQueryData<ExpenseListCache>(['expenses'])
            console.log('Cache State:', JSON.stringify(expensesCache, null, 2))

            // Check for optimistic item in the nested structure
            const list = expensesCache?.data?.data?.expenses || expensesCache?.data?.expenses

            const optimisticItem = list?.find((expense) => expense._optimistic)
            expect(optimisticItem).toBeDefined()
            expect(optimisticItem.description).toBe('Test Expense')
        })
    })

    it('should invalidate queries on settlement', async () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        vi.mocked(expenseAPI.createExpense).mockResolvedValue({ data: { data: { _id: '123', description: 'Test', amount: 50 } } } as CreateExpenseApiResponse)

        const { result } = renderHook(() => useCreateExpenseMutation(), { wrapper })

        result.current.mutate({
            description: 'Test',
            amount: 50,
            currencyCode: 'USD'
        } as CreateExpensePayload)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expenses'] })
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['recent-expenses'] })
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expense-summary'] })
    })
})
