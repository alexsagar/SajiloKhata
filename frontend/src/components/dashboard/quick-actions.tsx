"use client"

import { useState } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Wallet, Users, Scan } from "lucide-react"
import { CreatePersonalExpenseDialog } from "@/components/expenses/create-personal-expense-dialog"
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog"
import { SmartReceiptScanner } from "@/components/ocr/smart-receipt-scanner"
import { CreateGroupDialog } from "@/components/groups/create-group-dialog"
import { useQuery } from "@tanstack/react-query"
import { groupAPI } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { NormalizedReceiptData } from "@/lib/receipt-normalizer"

export function QuickActions() {
  const [showPersonalExpense, setShowPersonalExpense] = useState(false)
  const [showGroupExpense, setShowGroupExpense] = useState(false)
  const [showScanReceipt, setShowScanReceipt] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showReceiptTarget, setShowReceiptTarget] = useState(false)
  const [receiptTargetType, setReceiptTargetType] = useState<"personal" | "group">("personal")
  const [targetGroupId, setTargetGroupId] = useState("")
  const [prefillReceiptData, setPrefillReceiptData] = useState<(NormalizedReceiptData & { receipt?: File | null }) | null>(null)
  const { data: groupsResp } = useQuery({
    queryKey: ["user-groups"],
    queryFn: () => groupAPI.getGroups(),
  })
  const groups = ((groupsResp as any)?.data?.data || (groupsResp as any)?.data || []) as Array<{ _id: string; name: string }>

  const resetReceiptPrefillFlow = () => {
    setShowReceiptTarget(false)
    setReceiptTargetType("personal")
    setTargetGroupId("")
    setPrefillReceiptData(null)
  }

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
          onOpenChange={(open) => {
            setShowPersonalExpense(open)
            if (!open) {
              resetReceiptPrefillFlow()
            }
          }}
          initialReceiptData={prefillReceiptData}
        />
      )}

      {showGroupExpense && (
        <CreateExpenseDialog 
          open={showGroupExpense} 
          onOpenChange={(open) => {
            setShowGroupExpense(open)
            if (!open) {
              resetReceiptPrefillFlow()
            }
          }}
          defaultGroupId={targetGroupId || undefined}
          initialReceiptData={prefillReceiptData}
        />
      )}

      {showScanReceipt && (
        <SmartReceiptScanner 
          open={showScanReceipt} 
          onOpenChange={setShowScanReceipt}
          onReceiptProcessed={(receiptData) => {
            setPrefillReceiptData(receiptData)
            setShowScanReceipt(false)
            setShowReceiptTarget(true)
          }}
        />
      )}

      <Dialog
        open={showReceiptTarget}
        onOpenChange={(open) => {
          setShowReceiptTarget(open)
          if (!open) {
            resetReceiptPrefillFlow()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Use Scanned Receipt</DialogTitle>
            <DialogDescription>
              Choose where to apply this scanned expense data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`rounded-lg border p-3 text-left transition ${receiptTargetType === "personal" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
                onClick={() => setReceiptTargetType("personal")}
              >
                <p className="text-sm font-medium">Personal Expense</p>
                <p className="text-xs text-muted-foreground mt-1">Apply to your own expense</p>
              </button>
              <button
                type="button"
                className={`rounded-lg border p-3 text-left transition ${receiptTargetType === "group" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
                onClick={() => setReceiptTargetType("group")}
              >
                <p className="text-sm font-medium">Group Expense</p>
                <p className="text-xs text-muted-foreground mt-1">Split with a group</p>
              </button>
            </div>

            {receiptTargetType === "group" && (
              <div className="space-y-2">
                <Label>Select Group</Label>
                <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder={groups.length ? "Choose a group" : "No groups available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group._id} value={group._id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => resetReceiptPrefillFlow()}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowReceiptTarget(false)
                  if (receiptTargetType === "group") {
                    if (!targetGroupId) return
                    setShowGroupExpense(true)
                    return
                  }
                  setShowPersonalExpense(true)
                }}
                disabled={receiptTargetType === "group" && !targetGroupId}
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showCreateGroup && (
        <CreateGroupDialog 
          open={showCreateGroup} 
          onOpenChange={setShowCreateGroup}
        />
      )}
    </>
  )
}
