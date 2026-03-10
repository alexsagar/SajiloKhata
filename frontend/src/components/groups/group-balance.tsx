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
import { formatCurrency as formatCurrencyUtil, getInitials } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { TrendingUp, TrendingDown, DollarSign, ArrowRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { useSocket } from "@/contexts/socket-context"
import { toast } from "@/hooks/use-toast"
import { syncGroupState } from "@/lib/server-state"

interface GroupBalanceProps {
  groupId: string
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast({
        title: "Could not send reminder",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    },
  })

  const openPaymentLinkDialog = (settlement: any) => {
    setSelectedSettlementId(settlement._id)
    setPaymentLink(settlement.paymentLink || "")
    setPaymentProvider(settlement.paymentProvider || "")
    setIsPaymentLinkDialogOpen(true)
  }

  const savePaymentLink = () => {
    if (!selectedSettlementId) return
    try {
      // Basic URL check before API call
      // eslint-disable-next-line no-new
      new URL(paymentLink)
    } catch (_) {
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

    const refetchGroupData = (payload: any) => {
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
  const apiBalance = balance?.data?.data || balance?.data || {}
  let balancesMap: Record<string, any> = {}
  if (apiBalance?.balances) {
    if (Array.isArray(apiBalance.balances)) {
      apiBalance.balances.forEach((b: any) => {
        const uid = b?.user?._id || b?.userId || b?._id || "unknown"
        const amount = typeof b?.amount === "number"
          ? b.amount
          : typeof b?.net === "number"
            ? b.net
            : typeof b?.netCents === "number"
              ? b.netCents / 100
              : (typeof b?.youAreOwed === "number" || typeof b?.youOwe === "number")
                ? (Number(b?.youAreOwed || 0) - Number(b?.youOwe || 0))
                : 0
        balancesMap[uid] = { ...b, amount }
      })
    } else {
      Object.entries(apiBalance.balances as Record<string, any>).forEach(([uid, b]) => {
        const amount = typeof b?.amount === "number"
          ? b.amount
          : typeof b?.net === "number"
            ? b.net
            : typeof b?.netCents === "number"
              ? b.netCents / 100
              : (typeof b?.youAreOwed === "number" || typeof b?.youOwe === "number")
                ? (Number(b?.youAreOwed || 0) - Number(b?.youOwe || 0))
                : 0
        balancesMap[uid] = { ...b, amount }
      })
    }
  }

  // If no balances from API, compute from expenses using edge-based accounting
  // (mirrors backend buildGroupNetBalances: each unsettled split where user != paidBy
  //  creates an edge: split.user owes paidBy the split amount)
  if (Object.keys(balancesMap).length === 0) {
    const payload = (expensesData?.data && (expensesData?.data as any).data) ? (expensesData?.data as any).data : (expensesData?.data as any)
    const expensesList: any[] = (payload?.expenses as any[]) || []

    const addUser = (user: any) => {
      const uid = user?._id
      if (!uid) return
      if (!balancesMap[uid]) {
        balancesMap[uid] = { user, amount: 0 }
      }
    }

    expensesList
      .filter((exp: any) => exp?.status === "active")
      .forEach((exp: any) => {
        if (exp?.paidBy) addUser(exp.paidBy)
        const pid = exp?.paidBy?._id
          ; (exp?.splits || []).forEach((split: any) => {
            addUser(split.user)
            const uid = split.user?._id
            if (!uid || !pid) return
            // Skip self-splits (payer's own share) and settled splits
            if (uid === pid) return
            if (split?.settled) return
            const owe = split?.amountCents != null ? split.amountCents / 100 : (split?.amount ?? 0)
            if (owe <= 0) return
            // Edge: split.user owes paidBy this amount
            balancesMap[uid].amount = (balancesMap[uid].amount || 0) - owe
            balancesMap[pid].amount = (balancesMap[pid].amount || 0) + owe
          })
      })
  }

  const balanceEntries = Object.entries(balancesMap)
  const transactions = apiBalance?.minimumTransactions || []

  const settlementsPayload = (settlementsResp?.data && (settlementsResp?.data as any).data) ? (settlementsResp?.data as any).data : (settlementsResp?.data as any)
  const settlements: any[] = settlementsPayload?.settlements || []
  const currentUserId = String((user as any)?._id || (user as any)?.id || "")
  const settlementTotals = settlementsPayload?.totals || { pendingCents: 0, confirmedCents: 0 }
  const pendingTotal = (settlementTotals.pendingCents || 0) / 100
  const confirmedTotal = (settlementTotals.confirmedCents || 0) / 100
  const pendingSettlements = settlements.filter((s: any) => s.status === "PENDING")
  const confirmedSettlements = settlements.filter((s: any) => s.status === "CONFIRMED")
  const memberCount = Number(apiBalance?.memberCount || balanceEntries.length || 0)

  // Total expenses: prefer API, else compute from expenses
  const expensesPayload = (expensesData?.data && (expensesData?.data as any).data) ? (expensesData?.data as any).data : (expensesData?.data as any)
  const expensesListForTotal: any[] = (expensesPayload?.expenses as any[]) || []
  const computedTotal = expensesListForTotal.reduce((sum, exp) => sum + (exp?.amountCents != null ? exp.amountCents / 100 : (exp?.amount ?? 0)), 0)
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
              {balanceEntries.map(([userId, balance]: [string, any]) => (
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
              {transactions.map((transaction: any, index: number) => (
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
              No stored settlement plan yet. Click "Settle Up" to generate one.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSettlements.map((s: any) => {
                const fromUser = s.fromUserId
                const toUser = s.toUserId
                const amount = (s.amountCents || 0) / 100
                const isPending = s.status === "PENDING"
                const isPayer = String(fromUser?._id || fromUser) === currentUserId
                const isCreditor = String(toUser?._id || toUser) === currentUserId

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
                {confirmedSettlements.map((s: any) => {
                  const fromUser = s.fromUserId
                  const toUser = s.toUserId
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
