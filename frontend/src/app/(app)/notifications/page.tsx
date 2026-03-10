"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notificationAPI, settlementAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { syncDashboardState, syncGroupState } from "@/lib/server-state"
import { useAuth } from "@/contexts/auth-context"

const PAGE_SIZE = 20

function resolveHref(notification: any) {
  if (notification?.data?.actionUrl) return notification.data.actionUrl
  const type = notification?.type
  if (["EXPENSE_CREATED", "EXPENSE_UPDATED", "EXPENSE_DELETED", "SPLIT_CHANGED_FOR_YOU", "EXPENSE_COMMENT_MENTION", "expense_added", "expense_updated"].includes(type)) {
    return notification?.data?.expenseId ? `/expenses/${notification.data.expenseId}` : "/expenses"
  }
  if (["SETTLEMENT_REQUESTED", "SETTLEMENT_RECORDED", "SETTLEMENT_REMINDER", "settlement_request"].includes(type)) {
    return notification?.data?.groupId ? `/groups/${notification.data.groupId}` : "/groups"
  }
  if (["RECEIPT_OCR_COMPLETED", "RECEIPT_OCR_FAILED", "RECEIPT_AMOUNT_MISMATCH"].includes(type)) {
    return notification?.data?.expenseId ? `/expenses/${notification.data.expenseId}/receipt` : "/expenses"
  }
  return "/notifications"
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const notificationsQuery = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => notificationAPI.getNotifications({ page, limit: PAGE_SIZE }),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationAPI.markAsRead(id),
    onSuccess: () => {
      syncDashboardState(queryClient, { includeNotifications: true })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationAPI.markAllAsRead(),
    onSuccess: () => {
      syncDashboardState(queryClient, { includeNotifications: true })
    },
  })

  const confirmSettlement = useMutation({
    mutationFn: (settlementId: string) => settlementAPI.confirm(settlementId),
    onSuccess: (response: any) => {
      const settlement = response?.data?.data || response?.data || {}
      const groupId = settlement?.groupId?._id || settlement?.groupId || null
      if (groupId) {
        syncGroupState(queryClient, { groupId: String(groupId), includeNotifications: true })
      } else {
        syncDashboardState(queryClient, { includeNotifications: true })
      }
      toast({ title: "Settlement recorded" })
    },
    onError: (e: any) => toast({ title: "Could not record settlement", description: e?.message, variant: "destructive" }),
  })

  const remindLater = useMutation({
    mutationFn: (settlementId: string) => settlementAPI.remindLater(settlementId, 3),
    onSuccess: () => {
      syncDashboardState(queryClient, { includeNotifications: true })
      toast({ title: "Reminder snoozed for 3 days" })
    },
    onError: (e: any) => toast({ title: "Could not snooze reminder", description: e?.message, variant: "destructive" }),
  })

  const payload = notificationsQuery.data?.data || {}
  const list = payload.notifications || []
  const unreadCount = Number(payload.unreadCount || 0)
  const totalPages = Number(payload.pagination?.pages || 1)

  const canPrev = page > 1
  const canNext = page < totalPages

  const title = useMemo(() => `Notifications (${unreadCount} unread)`, [unreadCount])
  const currentUserId = String((user as any)?._id || (user as any)?.id || "")

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unreadCount === 0}>
            Mark all as read
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            list.map((notification: any) => {
              const id = notification.id || notification._id
              const isRead = Boolean(notification.isRead ?? notification.read)
              const type = String(notification.type || "")
              const settlementId = notification?.data?.settlementId
              const paymentLink = notification?.data?.paymentLink
              const settlementPayerId = String(notification?.data?.fromUserId || "")
              const canRecordPaid =
                ["SETTLEMENT_REQUESTED", "SETTLEMENT_REMINDER"].includes(type) &&
                Boolean(settlementId) &&
                settlementPayerId === currentUserId
              const canRemindLater =
                ["SETTLEMENT_REQUESTED", "SETTLEMENT_REMINDER"].includes(type) &&
                Boolean(settlementId) &&
                settlementPayerId === currentUserId

              return (
                <div
                  key={id}
                  className={`block rounded border p-3 transition-colors ${isRead ? "bg-background" : "bg-primary/5"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={resolveHref(notification)}
                        className="font-medium hover:underline"
                        onClick={() => {
                          if (!isRead) markRead.mutate(id)
                        }}
                      >
                        {notification.title}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!isRead && (
                      <Button size="sm" variant="outline" onClick={() => markRead.mutate(id)} disabled={markRead.isPending}>
                        Mark read
                      </Button>
                    )}
                    {canRecordPaid && (
                      <Button
                        size="sm"
                        onClick={() => confirmSettlement.mutate(String(settlementId))}
                        disabled={confirmSettlement.isPending}
                      >
                        Record Paid
                      </Button>
                    )}
                    {canRemindLater && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => remindLater.mutate(String(settlementId))}
                        disabled={remindLater.isPending}
                      >
                        Remind Later
                      </Button>
                    )}
                    {paymentLink && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={String(paymentLink)} target="_blank" rel="noreferrer">
                          Pay Link
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous
        </Button>
        <Button variant="outline" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
