"use client"

import { use, useState } from "react"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { GroupBalance } from "@/components/groups/group-balance"
import { GroupActivityFeed } from "@/components/groups/group-activity-feed"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Settings, Users } from "lucide-react"
import Link from "next/link"

interface MobileGroupDetailPageProps {
    params: Promise<{ id: string }>
}

export default function MobileGroupDetailPage({ params }: MobileGroupDetailPageProps) {
    const { id: groupId } = use(params)
    const [showCreateExpense, setShowCreateExpense] = useState(false)

    return (
        <>
            <MobileHeader
                title="Group Details"
                showBack
                actions={
                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0" asChild>
                            <Link href={`/groups/${groupId}/members`}>
                                <Users className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0" asChild>
                            <Link href={`/groups/${groupId}/settings`}>
                                <Settings className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 text-[hsl(var(--primary))]"
                            onClick={() => setShowCreateExpense(true)}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-col gap-4 px-3 py-3">
                {/* Balance summary */}
                <GroupBalance groupId={groupId} />

                {/* Activity feed */}
                <GroupActivityFeed groupId={groupId} />

                {/* Group expenses */}
                <ExpensesList groupId={groupId} />
            </div>

            <CreateExpenseDialog
                open={showCreateExpense}
                onOpenChange={setShowCreateExpense}
                defaultGroupId={groupId}
            />
        </>
    )
}
