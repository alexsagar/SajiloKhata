"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notificationAPI, settlementAPI } from "@/lib/api"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { MobileEmptyState } from "@/components/mobile/mobile-empty-state"
import { MobileListSkeleton } from "@/components/mobile/mobile-skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Bell } from "lucide-react"
import { syncDashboardState, syncGroupState } from "@/lib/server-state"
import { useAuth } from "@/contexts/auth-context"

const PAGE_SIZE = 20

function resolveHref(notification: any) {
    if (notification?.data?.actionUrl) return notification.data.actionUrl
    const type = notification?.type
    if (
        [
            "EXPENSE_CREATED", "EXPENSE_UPDATED", "EXPENSE_DELETED",
            "SPLIT_CHANGED_FOR_YOU", "EXPENSE_COMMENT_MENTION",
            "expense_added", "expense_updated",
        ].includes(type)
    ) {
        return notification?.data?.expenseId
            ? `/m/expenses/${notification.data.expenseId}`
            : "/m/expenses"
    }
    if (
        [
            "SETTLEMENT_REQUESTED", "SETTLEMENT_RECORDED",
            "SETTLEMENT_REMINDER", "settlement_request",
        ].includes(type)
    ) {
        return notification?.data?.groupId
            ? `/m/groups/${notification.data.groupId}`
            : "/m/groups"
    }
    if (
        [
            "RECEIPT_OCR_COMPLETED", "RECEIPT_OCR_FAILED",
            "RECEIPT_AMOUNT_MISMATCH",
        ].includes(type)
    ) {
        return notification?.data?.expenseId
            ? `/m/expenses/${notification.data.expenseId}`
            : "/m/expenses"
    }
    return "/m/notifications"
}

export default function MobileNotificationsPage() {
    const [page, setPage] = useState(1)
    const queryClient = useQueryClient()
    const { user } = useAuth()

    const notificationsQuery = useQuery({
        queryKey: ["notifications", page],
        queryFn: () => notificationAPI.getNotifications({ page, limit: PAGE_SIZE }),
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    })

    const markRead = useMutation({
        mutationFn: (id: string) => notificationAPI.markAsRead(id),
        onSuccess: () => syncDashboardState(queryClient, { includeNotifications: true }),
    })

    const markAllRead = useMutation({
        mutationFn: () => notificationAPI.markAllAsRead(),
        onSuccess: () => syncDashboardState(queryClient, { includeNotifications: true }),
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
        onError: (e: any) =>
            toast({ title: "Could not record settlement", description: e?.message, variant: "destructive" }),
    })

    const remindLater = useMutation({
        mutationFn: (settlementId: string) => settlementAPI.remindLater(settlementId, 3),
        onSuccess: () => {
            syncDashboardState(queryClient, { includeNotifications: true })
            toast({ title: "Reminder snoozed for 3 days" })
        },
        onError: (e: any) =>
            toast({ title: "Could not snooze reminder", description: e?.message, variant: "destructive" }),
    })

    const payload = notificationsQuery.data?.data || {}
    const list = payload.notifications || []
    const unreadCount = Number(payload.unreadCount || 0)
    const totalPages = Number(payload.pagination?.pages || 1)

    const canPrev = page > 1
    const canNext = page < totalPages

    const title = useMemo(
        () => (unreadCount > 0 ? `Notifications (${unreadCount})` : "Notifications"),
        [unreadCount],
    )
    const currentUserId = String((user as any)?._id || (user as any)?.id || "")

    return (
        <>
            <MobileHeader
                title={title}
                actions={
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 text-xs px-2"
                        onClick={() => markAllRead.mutate()}
                        disabled={markAllRead.isPending || unreadCount === 0}
                    >
                        Read all
                    </Button>
                }
            />

            <div className="flex flex-col gap-2 px-3 py-3">
                {notificationsQuery.isLoading ? (
                    <MobileListSkeleton count={4} />
                ) : list.length === 0 ? (
                    <MobileEmptyState
                        icon={Bell}
                        title="No notifications"
                        description="You're all caught up!"
                    />
                ) : (
                    <>
                        {list.map((notification: any) => {
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
                            const canRemind =
                                ["SETTLEMENT_REQUESTED", "SETTLEMENT_REMINDER"].includes(type) &&
                                Boolean(settlementId) &&
                                settlementPayerId === currentUserId

                            return (
                                <div
                                    key={id}
                                    className={`rounded-xl border border-white/5 p-3.5 transition-colors ${isRead ? "bg-[var(--card)]" : "bg-[hsl(var(--primary)/0.05)]"
                                        }`}
                                >
                                    {/* Content */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                href={resolveHref(notification)}
                                                className="font-medium text-sm text-white hover:underline"
                                                onClick={() => {
                                                    if (!isRead) markRead.mutate(id)
                                                }}
                                            >
                                                {notification.title}
                                            </Link>
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                                                {notification.message}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] whitespace-nowrap pt-0.5">
                                            {new Date(notification.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Action buttons */}
                                    {(canRecordPaid || canRemind || paymentLink || !isRead) && (
                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                            {!isRead && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="min-h-[44px] text-xs"
                                                    onClick={() => markRead.mutate(id)}
                                                    disabled={markRead.isPending}
                                                >
                                                    Mark read
                                                </Button>
                                            )}
                                            {canRecordPaid && (
                                                <Button
                                                    size="sm"
                                                    className="min-h-[44px] text-xs"
                                                    onClick={() => confirmSettlement.mutate(String(settlementId))}
                                                    disabled={confirmSettlement.isPending}
                                                >
                                                    Record Paid
                                                </Button>
                                            )}
                                            {canRemind && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="min-h-[44px] text-xs"
                                                    onClick={() => remindLater.mutate(String(settlementId))}
                                                    disabled={remindLater.isPending}
                                                >
                                                    Remind Later
                                                </Button>
                                            )}
                                            {paymentLink && (
                                                <Button size="sm" variant="outline" className="min-h-[44px] text-xs" asChild>
                                                    <a href={String(paymentLink)} target="_blank" rel="noreferrer">
                                                        Pay Link
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Pagination */}
                        <div className="flex justify-between gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="min-h-[44px] flex-1"
                                disabled={!canPrev}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="min-h-[44px] flex-1"
                                disabled={!canNext}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
