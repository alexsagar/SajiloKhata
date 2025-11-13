 import { create } from "zustand"

 export type Expense = {
   id: string
   description: string
   amount: number
   currency: string
   date: string
   groupId?: string
 }

 type ExpensesState = {
   items: Expense[]
   isLoading: boolean
   error: string | null
   setItems: (items: Expense[]) => void
   add: (expense: Expense) => void
   update: (id: string, patch: Partial<Expense>) => void
   remove: (id: string) => void
   setLoading: (v: boolean) => void
   setError: (e: string | null) => void
 }

 export const useExpensesStore = create<ExpensesState>((set) => ({
   items: [],
   isLoading: false,
   error: null,
   setItems: (items) => set({ items }),
   add: (expense) => set((s) => ({ items: [expense, ...s.items] })),
   update: (id, patch) =>
     set((s) => ({
       items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
     })),
   remove: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),
   setLoading: (v) => set({ isLoading: v }),
   setError: (e) => set({ error: e }),
 }))

