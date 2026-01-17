"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getInitials } from "@/lib/utils"
import { formatCurrencyWithSymbol } from "@/lib/currency"

interface Participant {
  id: string
  firstName: string
  lastName: string
  email?: string
  avatar?: string
}

interface SplitShare {
  userId: string
  amount: number
}

interface AdvanceSplitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Participant[]
  totalAmount: number
  currency: string
  initialSplits?: SplitShare[]
  onConfirm: (splits: SplitShare[]) => void
}

export function AdvanceSplitDialog({
  open,
  onOpenChange,
  participants,
  totalAmount,
  currency,
  initialSplits = [],
  onConfirm,
}: AdvanceSplitDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSplits.map((s) => s.userId)),
  )

  const [amounts, setAmounts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    initialSplits.forEach((s) => {
      map[s.userId] = s.amount
    })
    return map
  })

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAmountChange = (id: string, value: string) => {
    const num = Number(value.replace(/[^0-9.\-]/g, ""))
    if (Number.isNaN(num)) return
    setAmounts((prev) => ({ ...prev, [id]: num }))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (num > 0) {
        next.add(id)
      }
      return next
    })
  }

  const { totalSelected, diff, isOver, isUnder } = useMemo(() => {
    const totalSelected = Array.from(selectedIds).reduce((sum, id) => sum + (amounts[id] || 0), 0)
    const diff = totalSelected - totalAmount
    return {
      totalSelected,
      diff,
      isOver: diff > 0.005,
      isUnder: diff < -0.005,
    }
  }, [selectedIds, amounts, totalAmount])

  const handleConfirm = () => {
    const splits: SplitShare[] = Array.from(selectedIds)
      .map((id) => ({ userId: id, amount: amounts[id] || 0 }))
      .filter((s) => s.amount > 0)
    onConfirm(splits)
    onOpenChange(false)
  }

  const handleEqualSplit = () => {
    const active = participants.map((p) => p.id)
    const count = active.length || 1
    const share = totalAmount / count
    const nextAmounts: Record<string, number> = {}
    active.forEach((id) => {
      nextAmounts[id] = Number(share.toFixed(2))
    })
    setSelectedIds(new Set(active))
    setAmounts(nextAmounts)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Bill</DialogTitle>
          <DialogDescription>
            Select who to split with and how much each person owes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total to split</span>
            <span className="font-semibold">
              {formatCurrencyWithSymbol(totalAmount, currency)}
            </span>
          </div>

          <Button variant="outline" size="sm" onClick={handleEqualSplit} className="w-full">
            Split equally between all participants
          </Button>

          <ScrollArea className="h-64 border rounded-md">
            <div className="divide-y">
              {participants.map((p) => {
                const selected = selectedIds.has(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleParticipant(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      selected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.avatar} />
                      <AvatarFallback>
                        {getInitials(p.firstName || "U", p.lastName || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {p.firstName} {p.lastName}
                      </div>
                      {p.email && (
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      )}
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amounts[p.id] ?? ""}
                        onChange={(e) => handleAmountChange(p.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 text-right"
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>

          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span>Selected total</span>
              <span className="font-medium">
                {formatCurrencyWithSymbol(totalSelected, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Difference</span>
              <span
                className={
                  isOver ? "text-red-600" : isUnder ? "text-yellow-600" : "text-green-600"
                }
              >
                {diff > 0
                  ? `+${formatCurrencyWithSymbol(diff, currency)}`
                  : formatCurrencyWithSymbol(diff, currency)}
              </span>
            </div>
            {(isOver || isUnder) && (
              <div className="text-[11px]">
                {isOver && "Selected amounts exceed the total. Reduce some shares."}
                {isUnder && "Selected amounts are less than the total. Increase some shares."}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isOver || selectedIds.size === 0}>
            Confirm Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

