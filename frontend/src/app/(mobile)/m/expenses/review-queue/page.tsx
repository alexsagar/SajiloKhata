"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, RefreshCw, CheckCircle2, Copy } from "lucide-react"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { MobileEmptyState } from "@/components/mobile/mobile-empty-state"
import { MobileListSkeleton } from "@/components/mobile/mobile-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { receiptAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const PAGE_SIZE = 20
type ReviewReceipt = {
    _id: string
    originalName?: string
    createdAt: string
    expenseId?: string | { _id?: string }
    ocrData?: {
        parsedData?: {
            merchant?: string
            total?: string | number
            currency?: string
            date?: string
        }
        reviewReasons?: string[]
        confidence?: number
        duplicateDetection?: {
            duplicateOf?: string
            isDuplicate?: boolean
        }
    }
}

type ReviewQueuePayload = {
    receipts?: ReviewReceipt[]
    pagination?: {
        pages?: number
    }
}

function getExpenseId(expenseId?: ReviewReceipt["expenseId"]) {
    if (!expenseId) return undefined
    return typeof expenseId === "string" ? expenseId : expenseId._id
}

export default function MobileReviewQueuePage() {
    const [page, setPage] = useState(1)
    const [duplicateOnly, setDuplicateOnly] = useState(false)
    const queryClient = useQueryClient()

    const receiptsQuery = useQuery({
        queryKey: ["receipt-review-queue", page, duplicateOnly],
        queryFn: () =>
            receiptAPI.getReceipts({
                page,
                limit: PAGE_SIZE,
                requiresReview: true,
                duplicateOnly,
                processingStatus: "completed",
            }),
    })

    const markReviewedMutation = useMutation({
        mutationFn: (receiptId: string) => receiptAPI.markReviewed(receiptId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["receipt-review-queue"] })
            toast({ title: "Marked as reviewed" })
        },
        onError: (e: Error) =>
            toast({ title: "Could not mark reviewed", description: e?.message, variant: "destructive" }),
    })

    const reprocessMutation = useMutation({
        mutationFn: (receiptId: string) => receiptAPI.reprocessReceipt(receiptId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["receipt-review-queue"] })
            toast({ title: "Reprocessing queued" })
        },
        onError: (e: Error) =>
            toast({ title: "Could not reprocess", description: e?.message, variant: "destructive" }),
    })

    const payload = (receiptsQuery.data?.data?.data || {}) as ReviewQueuePayload
    const receipts = payload.receipts || []
    const pagination = payload.pagination || { pages: 1 }

    return (
        <>
            <MobileHeader
                title="OCR Review Queue"
                showBack
                actions={
                    <Button
                        variant={duplicateOnly ? "default" : "ghost"}
                        size="sm"
                        className="h-10 text-xs px-2"
                        onClick={() => {
                            setDuplicateOnly((prev) => !prev)
                            setPage(1)
                        }}
                    >
                        {duplicateOnly ? "Dupes" : "All"}
                    </Button>
                }
            />

            <div className="flex flex-col gap-3 px-3 py-3">
                {receiptsQuery.isLoading ? (
                    <MobileListSkeleton count={3} />
                ) : receipts.length === 0 ? (
                    <MobileEmptyState
                        icon={CheckCircle2}
                        title="All clear!"
                        description="No receipts currently require review."
                    />
                ) : (
                    <>
                        {receipts.map((receipt) => {
                            const id = String(receipt._id)
                            const parsed = receipt?.ocrData?.parsedData || {}
                            const reasons: string[] = receipt?.ocrData?.reviewReasons || []
                            const duplicateOf = receipt?.ocrData?.duplicateDetection?.duplicateOf
                            const expenseId = getExpenseId(receipt?.expenseId)

                            return (
                                <div
                                    key={id}
                                    className="rounded-xl border border-white/5 bg-[var(--card)] p-4 space-y-3"
                                >
                                    {/* Header */}
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-white truncate">
                                                {parsed?.merchant || receipt.originalName || "Unknown merchant"}
                                            </p>
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                                                {new Date(receipt.createdAt).toLocaleString()} · {receipt?.ocrData?.confidence ?? "N/A"}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {reasons.length > 0

                                            ? reasons.map((reason) => (
                                                <Badge key={reason} variant="secondary" className="text-xs">
                                                    {reason.replace(/_/g, " ")}
                                                </Badge>
                                            ))
                                            : <Badge variant="outline" className="text-xs">Review required</Badge>}
                                        {receipt?.ocrData?.duplicateDetection?.isDuplicate && (
                                            <Badge variant="destructive" className="gap-1 text-xs">
                                                <Copy className="h-3 w-3" />
                                                Duplicate
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-0.5">
                                        <div>Total: {parsed?.total ?? "N/A"} {parsed?.currency || ""}</div>
                                        <div>Date: {parsed?.date ? new Date(parsed.date).toLocaleDateString() : "N/A"}</div>
                                        {duplicateOf && <div>Duplicate Of: {String(duplicateOf)}</div>}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="min-h-[44px] flex-1"
                                            onClick={() => markReviewedMutation.mutate(id)}
                                            disabled={markReviewedMutation.isPending}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1" />
                                            Reviewed
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="min-h-[44px] flex-1"
                                            onClick={() => reprocessMutation.mutate(id)}
                                            disabled={reprocessMutation.isPending}
                                        >
                                            <RefreshCw className="h-4 w-4 mr-1" />
                                            Reprocess
                                        </Button>
                                        {expenseId ? (
                                            <Button size="sm" className="min-h-[44px] flex-1" asChild>
                                                <Link href={`/m/expenses/${expenseId}`}>Open</Link>
                                            </Button>
                                        ) : (
                                            <Button size="sm" className="min-h-[44px] flex-1" asChild>
                                                <Link href="/m/expenses">Expenses</Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {/* Pagination */}
                        <div className="flex justify-between gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="min-h-[44px] flex-1"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="min-h-[44px] flex-1"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page >= Number(pagination.pages || 1)}
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
