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
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ExpenseCreationOptions />
        <ExpenseFilters onFiltersChange={handleFiltersChange} />
        <ExpensesList filters={filters} />
      </div>
    </AppLayout>
  )
}
