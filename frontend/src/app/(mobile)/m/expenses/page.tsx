"use client"

import { useState } from "react"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { ExpenseCreationOptions } from "@/components/expenses/expense-creation-options"
import { MobileFilterSheet } from "@/components/mobile/mobile-filter-sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ClipboardCheck } from "lucide-react"
import Link from "next/link"

export default function MobileExpensesPage() {
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
        setFilters((prev) => ({
            ...prev,
            ...newFilters,
        }))
    }

    return (
        <>
            <MobileHeader
                title="Expenses"
                actions={
                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0" asChild>
                            <Link href="/m/expenses/review-queue">
                                <ClipboardCheck className="h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-col gap-3 px-3 py-3">
                {/* Creation options */}
                <ExpenseCreationOptions />

                {/* Filter sheet */}
                <MobileFilterSheet title="Filter Expenses">
                    <div className="space-y-4">
                        <div>
                            <Label>Search</Label>
                            <Input
                                placeholder="Search expenses..."
                                value={filters.search}
                                onChange={(e) => handleFiltersChange({ search: e.target.value })}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Category</Label>
                            <Input
                                placeholder="Category..."
                                value={filters.category}
                                onChange={(e) => handleFiltersChange({ category: e.target.value })}
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>From</Label>
                                <Input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => handleFiltersChange({ startDate: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>To</Label>
                                <Input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => handleFiltersChange({ endDate: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>
                </MobileFilterSheet>

                {/* Expenses list */}
                <ExpensesList filters={filters} />
            </div>
        </>
    )
}
