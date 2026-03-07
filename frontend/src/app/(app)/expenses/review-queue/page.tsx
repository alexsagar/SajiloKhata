"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, RefreshCw, CheckCircle2, Copy } from "lucide-react"
import { Header } from "@/components/common/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { receiptAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const PAGE_SIZE = 20

export default function OCRReviewQueuePage() {
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
    onError: (e: any) => {
      toast({
        title: "Could not mark reviewed",
        description: e?.message,
        variant: "destructive",
      })
    },
  })

  const reprocessMutation = useMutation({
    mutationFn: (receiptId: string) => receiptAPI.reprocessReceipt(receiptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-review-queue"] })
      toast({ title: "Reprocessing queued" })
    },
    onError: (e: any) => {
      toast({
        title: "Could not reprocess receipt",
        description: e?.message,
        variant: "destructive",
      })
    },
  })

  const payload = receiptsQuery.data?.data?.data || {}
  const receipts = payload.receipts || []
  const pagination = payload.pagination || { pages: 1 }

  return (
    <>
      <Header
        title="OCR Review Queue"
        description="Receipts that need manual review"
        actions={
          <Button
            variant={duplicateOnly ? "default" : "outline"}
            onClick={() => {
              setDuplicateOnly((prev) => !prev)
              setPage(1)
            }}
          >
            {duplicateOnly ? "Showing Duplicates" : "Show Duplicates Only"}
          </Button>
        }
      />
      <div className="space-y-4">
        {receipts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No receipts currently require review.
            </CardContent>
          </Card>
        ) : (
          receipts.map((receipt: any) => {
            const id = String(receipt._id)
            const parsed = receipt?.ocrData?.parsedData || {}
            const reasons: string[] = receipt?.ocrData?.reviewReasons || []
            const duplicateOf = receipt?.ocrData?.duplicateDetection?.duplicateOf
            const expenseId = receipt?.expenseId?._id || receipt?.expenseId
            return (
              <Card key={id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    {parsed?.merchant || receipt.originalName || "Unknown merchant"}
                  </CardTitle>
                  <CardDescription>
                    {new Date(receipt.createdAt).toLocaleString()} | Confidence: {receipt?.ocrData?.confidence ?? "N/A"}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {reasons.length > 0 ? (
                      reasons.map((reason) => (
                        <Badge key={reason} variant="secondary">
                          {reason.replace(/_/g, " ")}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">Review required</Badge>
                    )}
                    {receipt?.ocrData?.duplicateDetection?.isDuplicate && (
                      <Badge variant="destructive" className="gap-1">
                        <Copy className="h-3 w-3" />
                        Possible duplicate
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <div>Total: {parsed?.total ?? "N/A"} {parsed?.currency || ""}</div>
                    <div>Date: {parsed?.date ? new Date(parsed.date).toLocaleDateString() : "N/A"}</div>
                    {duplicateOf ? <div>Duplicate Of: {String(duplicateOf)}</div> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markReviewedMutation.mutate(id)}
                      disabled={markReviewedMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark Reviewed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reprocessMutation.mutate(id)}
                      disabled={reprocessMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reprocess
                    </Button>
                    {expenseId ? (
                      <Button size="sm" asChild>
                        <Link href={`/expenses/${expenseId}/receipt`}>Open Expense Receipt</Link>
                      </Button>
                    ) : (
                      <Button size="sm" asChild>
                        <Link href="/expenses">Open Expenses</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Number(pagination.pages || 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  )
}
