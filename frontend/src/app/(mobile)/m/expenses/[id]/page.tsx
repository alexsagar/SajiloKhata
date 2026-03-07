"use client"

import { use } from "react"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { ExpenseDetails } from "@/components/expenses/expense-details"

interface MobileExpenseDetailPageProps {
    params: Promise<{ id: string }>
}

export default function MobileExpenseDetailPage({ params }: MobileExpenseDetailPageProps) {
    const { id } = use(params)

    return (
        <>
            <MobileHeader title="Expense Details" showBack />
            <div className="flex flex-col gap-3 px-3 py-3">
                <ExpenseDetails expenseId={id} />
            </div>
        </>
    )
}
