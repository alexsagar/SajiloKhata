"use client"

import { useState } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Wallet, Users, Scan } from "lucide-react"
import { CreatePersonalExpenseDialog } from "@/components/expenses/create-personal-expense-dialog"
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog"
import { SmartReceiptScanner } from "@/components/ocr/smart-receipt-scanner"
import { CreateGroupDialog } from "@/components/groups/create-group-dialog"

export function QuickActions() {
  const [showPersonalExpense, setShowPersonalExpense] = useState(false)
  const [showGroupExpense, setShowGroupExpense] = useState(false)
  const [showScanReceipt, setShowScanReceipt] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  return (
    <>
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle>Quick Actions</KanbanCardTitle>
          <KanbanCardDescription>Common tasks to get you started</KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Personal Expense */}
            <div 
              className="h-24 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 ring-1 ring-white/10 text-slate-200 hover:bg-white/7 transition-all duration-150 cursor-pointer group"
              onClick={() => setShowPersonalExpense(true)}
            >
              <Wallet className="h-7 w-7 group-hover:text-emerald-400 transition-colors" />
              <span className="text-xs sm:text-sm font-medium text-center">Personal Expense</span>
            </div>

            {/* Group Expense */}
            <div 
              className="h-24 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 ring-1 ring-white/10 text-slate-200 hover:bg-white/7 transition-all duration-150 cursor-pointer group"
              onClick={() => setShowGroupExpense(true)}
            >
              <Users className="h-7 w-7 group-hover:text-blue-400 transition-colors" />
              <span className="text-xs sm:text-sm font-medium text-center">Group Expense</span>
            </div>

            {/* Create Group */}
            <div 
              className="h-24 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 ring-1 ring-white/10 text-slate-200 hover:bg-white/7 transition-all duration-150 cursor-pointer group"
              onClick={() => setShowCreateGroup(true)}
            >
              <Users className="h-7 w-7 group-hover:text-fuchsia-400 transition-colors" />
              <span className="text-xs sm:text-sm font-medium text-center">Create Group</span>
            </div>

            {/* Scan Receipt */}
            <div 
              className="h-24 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 ring-1 ring-white/10 text-slate-200 hover:bg-white/7 transition-all duration-150 cursor-pointer group"
              onClick={() => setShowScanReceipt(true)}
            >
              <Scan className="h-7 w-7 group-hover:text-amber-400 transition-colors" />
              <span className="text-xs sm:text-sm font-medium text-center">Scan Receipt</span>
            </div>
          </div>

          {/* Tip section */}
          <div className="mt-6 p-3 bg-white/5 ring-1 ring-white/10 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">💡</span>
              <p className="text-sm text-slate-300">
                <strong className="text-slate-100">Tip:</strong> Personal expenses use your profile currency, while group expenses use the group's currency.
              </p>
            </div>
          </div>
        </KanbanCardContent>
      </KanbanCard>

      {/* Modals */}
      {showPersonalExpense && (
        <CreatePersonalExpenseDialog 
          open={showPersonalExpense} 
          onOpenChange={setShowPersonalExpense} 
        />
      )}

      {showGroupExpense && (
        <CreateExpenseDialog 
          open={showGroupExpense} 
          onOpenChange={setShowGroupExpense}
        />
      )}

      {showScanReceipt && (
        <SmartReceiptScanner 
          open={showScanReceipt} 
          onOpenChange={setShowScanReceipt}
        />
      )}

      {showCreateGroup && (
        <CreateGroupDialog 
          open={showCreateGroup} 
          onOpenChange={setShowCreateGroup}
        />
      )}
    </>
  )
}
