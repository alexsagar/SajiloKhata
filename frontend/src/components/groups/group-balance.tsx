"use client"

import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { groupAPI, expenseAPI, settlementAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { getInitials } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { DollarSign, ArrowRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { useSocket } from "@/contexts/socket-context"
import { toast } from "@/hooks/use-toast"
import { syncGroupState } from "@/lib/server-state"
import type { User } from "@/types/user"

interface GroupBalanceProps {
  groupId: string
}

interface ErrorWithMessage {
  message?: string
}

interface QueryEnvelope<T> {
  data?: T | QueryEnvelope<T>
}

interface BalanceUser {
  _id?: string
  id?: string
  firstName?: string
  lastName?: string
  username?: string
  email?: string
  avatar?: string
}

interface BalanceEntry {
  user?: BalanceUser
  userId?: string
  _id?: string
  amount?: number
  net?: number
  netCents?: number
  youAreOwed?: number
  youOwe?: number
}

interface BalanceTransaction {
  from?: BalanceUser | null
  to?: BalanceUser | null
  amount: number
}

interface GroupBalancesPayload {
  balances?: BalanceEntry[] | Record<string, BalanceEntry>
  minimumTransactions?: BalanceTransaction[]
  totalExpenses?: number
  memberCount?: number
}

interface SettlementRecord {
  _id: string
  fromUserId?: BalanceUser | string
  toUserId?: BalanceUser | string
  amountCents?: number
  status?: "PENDING" | "CONFIRMED" | string
  paymentLink?: string
  paymentProvider?: string
}

interface GroupSettlementsPayload {
  settlements?: SettlementRecord[]
  totals?: {
    pendingCents?: number
    confirmedCents?: number
  }
}

interface ExpenseSplit {
  user?: BalanceUser
  amountCents?: number
  amount?: number
  settled?: boolean
}

interface BalanceExpense {
  status?: string
  paidBy?: BalanceUser
  splits?: ExpenseSplit[]
  amountCents?: number
  amount?: number
}

interface GroupExpensesPayload {
  expenses?: BalanceExpense[]
}

interface GroupSocketPayload {
  groupId?: string
}

function unwrapQueryEnvelope<T>(value: QueryEnvelope<T> | undefined): T | undefined {
  if (!value) return undefined
  const candidate = value.data
  if (candidate && typeof candidate === "object" && "data" in candidate) {
    return (candidate as QueryEnvelope<T>).data as T | undefined
  }
  return candidate as T | undefined
}

function toBalanceUser(value?: BalanceUser | string | null): BalanceUser | undefined {
  return value && typeof value === "object" ? value : undefined
}

export function GroupBalance({ groupId }: GroupBalanceProps) {
  const { user } = useAuth()
  const userCurrency = user?.preferences?.currency || "USD"
  const queryClient = useQueryClient()
  const { socket, joinGroups } = useSocket()
  const [isPaymentLinkDialogOpen, setIsPaymentLinkDialogOpen] = useState(false)
  const [paymentLink, setPaymentLink] = useState("")
  const [paymentProvider, setPaymentProvider] = useState("")
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null)

  const { data: balance, isLoading } = useQuery({
    queryKey: ["group-balance", groupId],
    queryFn: () => groupAPI.getBalances(groupId),
  })

  const { data: settlementsResp } = useQuery({
    queryKey: ["group-settlements", groupId],
    queryFn: () => groupAPI.getGroupSettlements(groupId),
  })

  const settleUpMutation = useMutation({
    mutationFn: () => groupAPI.settleUp(groupId),
    onSuccess: () => {
      syncGroupState(queryClient, { groupId, includeNotifications: true })
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (settlementId: string) => settlementAPI.confirm(settlementId),
    onSuccess: () => {
      syncGroupState(queryClient, { groupId, includeNotifications: true })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Could not confirm payment",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  const paymentLinkMutation = useMutation({
    mutationFn: ({ settlementId, paymentLink, paymentProvider }: { settlementId: string; paymentLink: string; paymentProvider?: string }) =>
      settlementAPI.setPaymentLink(settlementId, { paymentLink, paymentProvider }),
    onSuccess: () => {
      syncGroupState(queryClient, { groupId, includeNotifications: true })
      toast({ title: "Payment link saved" })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Could not save payment link",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  const remindMutation = useMutation({
    mutationFn: (settlementId: string) => settlementAPI.remind(settlementId),
    onSuccess: () => {
      syncGroupState(queryClient, { groupId, includeNotifications: true })
      toast({ title: "Reminder sent" })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Could not send reminder",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  const openPaymentLinkDialog = (settlement: SettlementRecord) => {
    setSelectedSettlementId(settlement._id)
    setPaymentLink(settlement.paymentLink || "")
    setPaymentProvider(settlement.paymentProvider || "")
    setIsPaymentLinkDialogOpen(true)
  }

  const savePaymentLink = () => {
    if (!selectedSettlementId) return
    if (!URL.canParse(paymentLink)) {
      toast({
        title: "Invalid link",
        description: "Please enter a valid payment URL.",
        variant: "destructive",
      })
      return
    }

    paymentLinkMutation.mutate(
      {
        settlementId: selectedSettlementId,
        paymentLink,
        paymentProvider: paymentProvider || undefined,
      },
      {
        onSuccess: () => {
          setIsPaymentLinkDialogOpen(false)
          setSelectedSettlementId(null)
          setPaymentLink("")
          setPaymentProvider("")
        },
      },
    )
  }

  // Fetch expenses to compute balances if API doesn't provide them
  const { data: expensesData } = useQuery({
    queryKey: ["group-expenses-for-balance", groupId],
    queryFn: () => expenseAPI.getExpenses(groupId),
  })

  useEffect(() => {
    joinGroups([groupId])
  }, [joinGroups, groupId])

  useEffect(() => {
    if (!socket) return

    const refetchGroupData = (payload: GroupSocketPayload) => {
      if (String(payload?.groupId || "") !== String(groupId)) return
      syncGroupState(queryClient, { groupId, includeNotifications: true })
    }

    socket.on("settlement:confirmed", refetchGroupData)
    socket.on("settlement:plan-updated", refetchGroupData)
    socket.on("expense_added", refetchGroupData)
    socket.on("expense_updated", refetchGroupData)
    socket.on("expense_deleted", refetchGroupData)
    socket.on("split_settled", refetchGroupData)

    return () => {
      socket.off("settlement:confirmed", refetchGroupData)
      socket.off("settlement:plan-updated", refetchGroupData)
      socket.off("expense_added", refetchGroupData)
      socket.off("expense_updated", refetchGroupData)
      socket.off("expense_deleted", refetchGroupData)
      socket.off("split_settled", refetchGroupData)
    }
  }, [socket, groupId, queryClient])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <LoadingSpinner />
      </div>
    )
  }

  // Normalize API balances shape (object map or array) and compute fallback from expenses
  const apiBalance = unwrapQueryEnvelope<GroupBalancesPayload>(balance?.data as QueryEnvelope<GroupBalancesPayload> | undefined) || {}
  const balancesMap: Record<string, BalanceEntry & { amount: number }> = {}
  if (apiBalance?.balances) {
    if (Array.isArray(apiBalance.balances)) {
      apiBalance.balances.forEach((balanceEntry) => {
        const uid = balanceEntry?.user?._id || balanceEntry?.userId || balanceEntry?._id || "unknown"
        const amount = typeof balanceEntry?.amount === "number"
          ? balanceEntry.amount
          : typeof balanceEntry?.net === "number"
            ? balanceEntry.net
            : typeof balanceEntry?.netCents === "number"
              ? balanceEntry.netCents / 100
              : (typeof balanceEntry?.youAreOwed === "number" || typeof balanceEntry?.youOwe === "number")
                ? (Number(balanceEntry?.youAreOwed || 0) - Number(balanceEntry?.youOwe || 0))
                : 0
        balancesMap[uid] = { ...balanceEntry, amount }
      })
    } else {
      Object.entries(apiBalance.balances).forEach(([uid, balanceEntry]) => {
        const amount = typeof balanceEntry?.amount === "number"
          ? balanceEntry.amount
          : typeof balanceEntry?.net === "number"
            ? balanceEntry.net
            : typeof balanceEntry?.netCents === "number"
              ? balanceEntry.netCents / 100
              : (typeof balanceEntry?.youAreOwed === "number" || typeof balanceEntry?.youOwe === "number")
                ? (Number(balanceEntry?.youAreOwed || 0) - Number(balanceEntry?.youOwe || 0))
                : 0
        balancesMap[uid] = { ...balanceEntry, amount }
      })
    }
  }

  // If no balances from API, compute from expenses using edge-based accounting
  // (mirrors backend buildGroupNetBalances: each unsettled split where user != paidBy
  //  creates an edge: split.user owes paidBy the split amount)
  if (Object.keys(balancesMap).length === 0) {
    const payload = unwrapQueryEnvelope<GroupExpensesPayload>(expensesData?.data as QueryEnvelope<GroupExpensesPayload> | undefined)
    const expensesList = payload?.expenses || []

    const addUser = (balanceUser?: BalanceUser) => {
      const uid = balanceUser?._id
      if (!uid) return
      if (!balancesMap[uid]) {
        balancesMap[uid] = { user: balanceUser, amount: 0 }
      }
    }

    expensesList
      .filter((expense) => expense?.status === "active")
      .forEach((expense) => {
        if (expense?.paidBy) addUser(expense.paidBy)
        const payerId = expense?.paidBy?._id
        ;(expense?.splits || []).forEach((split) => {
            addUser(split.user)
            const uid = split.user?._id
            if (!uid || !payerId) return
            // Skip self-splits (payer's own share) and settled splits
            if (uid === payerId) return
            if (split?.settled) return
            const owe = split?.amountCents != null ? split.amountCents / 100 : (split?.amount ?? 0)
            if (owe <= 0) return
            // Edge: split.user owes paidBy this amount
            balancesMap[uid].amount = (balancesMap[uid].amount || 0) - owe
            balancesMap[payerId].amount = (balancesMap[payerId].amount || 0) + owe
          })
      })
  }

  const balanceEntries = Object.entries(balancesMap)
  const transactions = apiBalance?.minimumTransactions || []

  const settlementsPayload = unwrapQueryEnvelope<GroupSettlementsPayload>(settlementsResp?.data as QueryEnvelope<GroupSettlementsPayload> | undefined)
  const settlements = settlementsPayload?.settlements || []
  const currentUserId = String((user as User | null)?._id || user?.id || "")
  const settlementTotals = settlementsPayload?.totals || { pendingCents: 0, confirmedCents: 0 }
  const pendingTotal = (settlementTotals.pendingCents || 0) / 100
  const confirmedTotal = (settlementTotals.confirmedCents || 0) / 100
  const pendingSettlements = settlements.filter((settlement) => settlement.status === "PENDING")
  const confirmedSettlements = settlements.filter((settlement) => settlement.status === "CONFIRMED")
  const memberCount = Number(apiBalance?.memberCount || balanceEntries.length || 0)

  // Total expenses: prefer API, else compute from expenses
  const expensesPayload = unwrapQueryEnvelope<GroupExpensesPayload>(expensesData?.data as QueryEnvelope<GroupExpensesPayload> | undefined)
  const expensesListForTotal = expensesPayload?.expenses || []
  const computedTotal = expensesListForTotal.reduce((sum, expense) => sum + (expense?.amountCents != null ? expense.amountCents / 100 : (expense?.amount ?? 0)), 0)
  const totalExpenses = apiBalance?.totalExpenses != null ? apiBalance.totalExpenses : computedTotal

  return (
    <div className="space-y-6">
      {/* Summary */}
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Group Balance Summary
          </KanbanCardTitle>
          <KanbanCardDescription>
            Overview of expenses and balances in this group
          </KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses, userCurrency)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Transactions Needed</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="text-2xl font-bold">{memberCount}</p>
            </div>
          </div>
        </KanbanCardContent>
      </KanbanCard>

      {/* Individual Balances */}
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle>Member Balances</KanbanCardTitle>
          <KanbanCardDescription>
            How much each member owes or is owed
          </KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent>
          {balanceEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No balance data available
            </div>
          ) : (
            <div className="space-y-3">
              {balanceEntries.map(([userId, balance]) => (
                <div key={userId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={balance.user?.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {getInitials(balance.user?.firstName || "U", balance.user?.lastName || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {balance.user?.firstName} {balance.user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {balance.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${balance.amount > 0 ? 'text-green-600' :
                      balance.amount < 0 ? 'text-red-600' :
                        'text-muted-foreground'
                      }`}>
                      {balance.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(balance.amount), userCurrency)}
                    </div>
                    <Badge variant={
                      balance.amount === 0 ? "secondary" :
                        balance.amount > 0 ? "default" : "destructive"
                    }>
                      {balance.amount === 0 ? 'Settled' :
                        balance.amount > 0 ? 'Is owed' : 'Owes'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </KanbanCardContent>
      </KanbanCard>

      {/* Suggested Transactions */}
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle>Current Position</KanbanCardTitle>
          <KanbanCardDescription>
            Net amounts that still need to be paid after applying confirmed settlements
          </KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              Everyone is settled up.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={transaction.from?.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {getInitials(transaction.from?.firstName || "U", transaction.from?.lastName || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{transaction.from?.firstName}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={transaction.to?.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {getInitials(transaction.to?.firstName || "U", transaction.to?.lastName || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{transaction.to?.firstName}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(transaction.amount, userCurrency)}</span>
                </div>
              ))}
            </div>
          )}
        </KanbanCardContent>
      </KanbanCard>

      {/* Pending Settlement Plan */}
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle className="flex items-center justify-between gap-2">
            <span>Pending Settlement Plan</span>
            <Button
              size="sm"
              onClick={() => settleUpMutation.mutate()}
              disabled={settleUpMutation.isPending}
            >
              Settle Up
            </Button>
          </KanbanCardTitle>
          <KanbanCardDescription>
            Stored settlement plan for this group (no payments—manual confirmation)
          </KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pending Total</p>
              <p className="text-xl font-bold">{formatCurrency(pendingTotal, userCurrency)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Confirmed Total</p>
              <p className="text-xl font-bold">{formatCurrency(confirmedTotal, userCurrency)}</p>
            </div>
          </div>

          {pendingSettlements.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No stored settlement plan yet. Click &quot;Settle Up&quot; to generate one.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSettlements.map((s) => {
                const fromUser = toBalanceUser(s.fromUserId)
                const toUser = toBalanceUser(s.toUserId)
                const amount = (s.amountCents || 0) / 100
                const isPending = s.status === "PENDING"
                const isPayer = String(fromUser?._id || s.fromUserId || "") === currentUserId
                const isCreditor = String(toUser?._id || s.toUserId || "") === currentUserId

                return (
                  <div key={s._id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={fromUser?.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">
                          {getInitials(fromUser?.firstName || "U", fromUser?.lastName || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{fromUser?.firstName}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={toUser?.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">
                          {getInitials(toUser?.firstName || "U", toUser?.lastName || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{toUser?.firstName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatCurrency(amount, userCurrency)}</span>
                      <Badge variant={isPending ? "secondary" : "default"}>
                        {s.status}
                      </Badge>
                      {isPending && isPayer && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmMutation.mutate(s._id)}
                          disabled={confirmMutation.isPending}
                        >
                          Mark as Paid
                        </Button>
                      )}
                      {isPending && isCreditor && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPaymentLinkDialog(s)}
                          disabled={paymentLinkMutation.isPending}
                        >
                          {s.paymentLink ? "Update Pay Link" : "Add Pay Link"}
                        </Button>
                      )}
                      {isPending && isCreditor && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => remindMutation.mutate(s._id)}
                          disabled={remindMutation.isPending}
                        >
                          Remind
                        </Button>
                      )}
                      {isPending && isPayer && s.paymentLink && (
                        <Button size="sm" variant="secondary" asChild>
                          <a href={s.paymentLink} target="_blank" rel="noreferrer">
                            Pay Link
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </KanbanCardContent>
      </KanbanCard>

      {/* Confirmed Settlement History */}
      <KanbanCard>
        <KanbanCardHeader>
          <KanbanCardTitle>Settlement History</KanbanCardTitle>
          <KanbanCardDescription>
            Confirmed settlement records kept for audit/history
          </KanbanCardDescription>
        </KanbanCardHeader>
        <KanbanCardContent>
          {confirmedSettlements.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No confirmed settlements yet.
            </div>
          ) : (
            <ScrollArea className="max-h-96 pr-3">
              <div className="space-y-3">
                {confirmedSettlements.map((s) => {
                  const fromUser = toBalanceUser(s.fromUserId)
                  const toUser = toBalanceUser(s.toUserId)
                  const amount = (s.amountCents || 0) / 100

                  return (
                    <div key={s._id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={fromUser?.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">
                            {getInitials(fromUser?.firstName || "U", fromUser?.lastName || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{fromUser?.firstName}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={toUser?.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">
                            {getInitials(toUser?.firstName || "U", toUser?.lastName || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{toUser?.firstName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{formatCurrency(amount, userCurrency)}</span>
                        <Badge>CONFIRMED</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </KanbanCardContent>
      </KanbanCard>

      <Dialog open={isPaymentLinkDialogOpen} onOpenChange={setIsPaymentLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Link</DialogTitle>
            <DialogDescription>
              Add an external payment link (eSewa/Khalti/Fonepay/etc.) for this settlement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment URL</label>
              <Input
                placeholder="https://..."
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider (optional)</label>
              <Input
                placeholder="eSewa / Khalti / Fonepay"
                value={paymentProvider}
                onChange={(e) => setPaymentProvider(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePaymentLink} disabled={paymentLinkMutation.isPending || !paymentLink.trim()}>
              Save Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
