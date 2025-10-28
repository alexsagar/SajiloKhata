"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/common/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/common/header"
import { GroupBalance } from "@/components/groups/group-balance"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Settings, Users } from "lucide-react"
import Link from "next/link"

interface GroupPageClientProps {
  groupId: string
}

export function GroupPageClient({ groupId }: GroupPageClientProps) {
  const [showCreateExpense, setShowCreateExpense] = useState(false)

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <Header
          title="Group Details"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/groups/${groupId}/members`}>
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/groups/${groupId}/settings`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button size="sm" onClick={() => setShowCreateExpense(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          }
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <GroupBalance groupId={groupId} />
          <ExpensesList groupId={groupId} />
        </div>
      </SidebarInset>

      <CreateExpenseDialog 
        open={showCreateExpense} 
        onOpenChange={setShowCreateExpense}
        defaultGroupId={groupId}
      />
    </>
  )
}
