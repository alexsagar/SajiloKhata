"use client"

import { useState } from "react"
import { AppLayout } from "@/components/common/app-layout"
import { Header } from "@/components/common/header"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { ExpenseCreationOptions } from "@/components/expenses/expense-creation-options"
import { ExpenseFilters } from "@/components/expenses/expense-filters"

export default function ExpensesPage() {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    groupId: "",
    startDate: "",
    endDate: "",
  })

  const handleFiltersChange = (newFilters: {
    search?: string
    category?: string
    groupId?: string
    startDate?: string
    endDate?: string
  }) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }))
  }

  return (
    <AppLayout>
      <Header
        title="Expenses"
        description="View and manage all your expenses"
      />
      <div className="mt-3 sm:mt-4 flex flex-1 flex-col gap-4 w-full max-w-full overflow-x-hidden">
        <ExpenseCreationOptions />
        <ExpenseFilters onFiltersChange={handleFiltersChange} />
        <ExpensesList filters={filters} />
      </div>
    </AppLayout>
  )
}
