"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { expenseAPI } from "@/lib/api"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { formatCurrencyWithSymbol } from "@/lib/currency"
import { useCurrency } from "@/contexts/currency-context"
import { useAuth } from "@/contexts/auth-context"
import { getInitials, formatDate } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useMemo, useState } from "react"
import { toast } from "@/hooks/use-toast"

interface ExpenseDetailsProps {
  expenseId: string
}

function getMentionQuery(text: string, cursor: number) {
  const head = text.slice(0, Math.max(0, cursor))
  const match = head.match(/@([a-zA-Z0-9_]*)$/)
  return match ? match[1] : null
}

function insertMention(text: string, cursor: number, username: string) {
  const head = text.slice(0, Math.max(0, cursor))
  const tail = text.slice(Math.max(0, cursor))
  const replacedHead = head.replace(/@([a-zA-Z0-9_]*)$/, `@${username} `)
  return `${replacedHead}${tail}`
}

export function ExpenseDetails({ expenseId }: ExpenseDetailsProps) {
  const { currency: displayCurrency } = useCurrency()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState("")
  const [commentCursor, setCommentCursor] = useState(0)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [editingCursor, setEditingCursor] = useState(0)
  const [addMentionIndex, setAddMentionIndex] = useState(0)
  const [editMentionIndex, setEditMentionIndex] = useState(0)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => expenseAPI.getExpense(expenseId),
  })
  const commentsQuery = useQuery({
    queryKey: ["expense-comments", expenseId],
    queryFn: () => expenseAPI.getComments(expenseId),
  })

  const addCommentMutation = useMutation({
    mutationFn: (text: string) => expenseAPI.addComment(expenseId, { text }),
    onSuccess: () => {
      setCommentText("")
      queryClient.invalidateQueries({ queryKey: ["expense-comments", expenseId] })
      toast({ title: "Comment added" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to add comment", description: error?.message })
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => expenseAPI.deleteComment(expenseId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-comments", expenseId] })
      toast({ title: "Comment deleted" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete comment", description: error?.message })
    },
  })
  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, text }: { commentId: string; text: string }) =>
      expenseAPI.updateComment(expenseId, commentId, { text }),
    onSuccess: () => {
      setEditingCommentId(null)
      setEditingText("")
      queryClient.invalidateQueries({ queryKey: ["expense-comments", expenseId] })
      toast({ title: "Comment updated" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update comment", description: error?.message })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
          <CardDescription>Unable to load expense {expenseId}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Something went wrong loading this expense.</p>
        </CardContent>
      </Card>
    )
  }

  const payload = (data.data && (data.data as any).data) ? (data.data as any).data : (data.data as any)
  const expense = payload?.expense || payload

  const amount = (expense?.amountCents != null ? expense.amountCents / 100 : expense?.amount) || 0
  const currency = displayCurrency || expense?.currencyCode || expense?.currency || "USD"
  const splits = Array.isArray(expense?.splits) ? expense.splits : []
  const commentsPayload = (commentsQuery.data?.data as any)?.data || (commentsQuery.data?.data as any) || {}
  const comments = Array.isArray(commentsPayload.comments) ? commentsPayload.comments : []

  const mentionCandidates = useMemo(() => {
    const map = new Map<string, string>()
    for (const split of splits) {
      const username = split?.user?.username
      if (username) map.set(username, `${split?.user?.firstName || ""} ${split?.user?.lastName || ""}`.trim())
    }
    if (expense?.paidBy?.username) {
      map.set(expense.paidBy.username, `${expense?.paidBy?.firstName || ""} ${expense?.paidBy?.lastName || ""}`.trim())
    }
    return Array.from(map.keys())
  }, [splits, expense?.paidBy])
  const addMentionQuery = useMemo(() => getMentionQuery(commentText, commentCursor), [commentText, commentCursor])
  const addMentionSuggestions = useMemo(() => {
    if (addMentionQuery == null) return []
    const q = addMentionQuery.toLowerCase()
    return mentionCandidates.filter((u) => u.toLowerCase().includes(q)).slice(0, 5)
  }, [addMentionQuery, mentionCandidates])
  const editMentionQuery = useMemo(() => getMentionQuery(editingText, editingCursor), [editingText, editingCursor])
  const editMentionSuggestions = useMemo(() => {
    if (editMentionQuery == null) return []
    const q = editMentionQuery.toLowerCase()
    return mentionCandidates.filter((u) => u.toLowerCase().includes(q)).slice(0, 5)
  }, [editMentionQuery, mentionCandidates])
  const normalizedAddMentionIndex =
    addMentionSuggestions.length > 0 ? Math.min(addMentionIndex, addMentionSuggestions.length - 1) : 0
  const normalizedEditMentionIndex =
    editMentionSuggestions.length > 0 ? Math.min(editMentionIndex, editMentionSuggestions.length - 1) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense?.description || "Expense Details"}</CardTitle>
        <CardDescription>
          {formatDate(expense?.date)} • {expense?.group?.name ? `Group: ${expense.group.name}` : "Personal"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Paid by</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={expense?.paidBy?.avatar} />
                <AvatarFallback className="text-xs">
                  {getInitials(expense?.paidBy?.firstName || "", expense?.paidBy?.lastName || "")}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {expense?.paidBy?.firstName} {expense?.paidBy?.lastName}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrencyWithSymbol(amount, currency)}</div>
            <div className="text-xs text-muted-foreground">{currency}</div>
          </div>
        </div>

        {expense?.notes && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{expense.notes}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-2">Split between</p>
          {splits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No split data.</p>
          ) : (
            <div className="space-y-2">
              {splits.map((s: any) => {
                const share = s?.amountCents != null ? s.amountCents / 100 : s?.amount || 0
                return (
                  <div key={s.user?._id || s.user} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={s?.user?.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(s?.user?.firstName || "", s?.user?.lastName || "")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {s?.user?.firstName} {s?.user?.lastName}
                      </span>
                    </div>
                    <div className="text-sm font-medium">{formatCurrencyWithSymbol(share, currency)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {expense?.receipt?.url && (
          <div className="pt-2 border-t">
            <a className="text-sm text-blue-400 hover:underline" href={expense.receipt.url} target="_blank" rel="noreferrer">
              View receipt
            </a>
          </div>
        )}

        <div className="pt-3 border-t space-y-3">
          <div>
            <p className="text-sm font-medium">Comments</p>
            {mentionCandidates.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Mention users with @username: {mentionCandidates.map((u) => `@${u}`).join(", ")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment. Use @username to mention someone."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onClick={(e) => setCommentCursor((e.target as HTMLTextAreaElement).selectionStart || 0)}
              onKeyUp={(e) => setCommentCursor((e.target as HTMLTextAreaElement).selectionStart || 0)}
              onKeyDown={(e) => {
                if (!addMentionSuggestions.length) return
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setAddMentionIndex((prev) => (prev + 1) % addMentionSuggestions.length)
                  return
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setAddMentionIndex((prev) => (prev - 1 + addMentionSuggestions.length) % addMentionSuggestions.length)
                  return
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault()
                  const selected = addMentionSuggestions[normalizedAddMentionIndex]
                  if (!selected) return
                  const next = insertMention(commentText, commentCursor, selected)
                  setCommentText(next)
                  setCommentCursor(next.length)
                  setAddMentionIndex(0)
                  return
                }
                if (e.key === "Escape") {
                  setAddMentionIndex(0)
                }
              }}
              rows={3}
            />
            {addMentionSuggestions.length > 0 && (
              <div className="rounded-md border bg-background p-1">
                {addMentionSuggestions.map((username, idx) => (
                  <button
                    key={username}
                    type="button"
                    className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${idx === normalizedAddMentionIndex ? "bg-muted" : ""}`}
                    onClick={() => {
                      const next = insertMention(commentText, commentCursor, username)
                      setCommentText(next)
                      setCommentCursor(next.length)
                      setAddMentionIndex(0)
                    }}
                  >
                    @{username}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => addCommentMutation.mutate(commentText)}
                disabled={addCommentMutation.isPending || !commentText.trim()}
              >
                Comment
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              comments.map((comment: any) => (
                <div key={comment._id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={comment?.user?.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(comment?.user?.firstName || "", comment?.user?.lastName || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {comment?.user?.firstName} {comment?.user?.lastName}
                        </p>
                        {editingCommentId === String(comment._id) ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingText}
                              rows={3}
                              onChange={(e) => setEditingText(e.target.value)}
                              onClick={(e) => setEditingCursor((e.target as HTMLTextAreaElement).selectionStart || 0)}
                              onKeyUp={(e) => setEditingCursor((e.target as HTMLTextAreaElement).selectionStart || 0)}
                              onKeyDown={(e) => {
                                if (!editMentionSuggestions.length) return
                                if (e.key === "ArrowDown") {
                                  e.preventDefault()
                                  setEditMentionIndex((prev) => (prev + 1) % editMentionSuggestions.length)
                                  return
                                }
                                if (e.key === "ArrowUp") {
                                  e.preventDefault()
                                  setEditMentionIndex((prev) => (prev - 1 + editMentionSuggestions.length) % editMentionSuggestions.length)
                                  return
                                }
                                if (e.key === "Enter" || e.key === "Tab") {
                                  e.preventDefault()
                                  const selected = editMentionSuggestions[normalizedEditMentionIndex]
                                  if (!selected) return
                                  const next = insertMention(editingText, editingCursor, selected)
                                  setEditingText(next)
                                  setEditingCursor(next.length)
                                  setEditMentionIndex(0)
                                  return
                                }
                                if (e.key === "Escape") {
                                  setEditMentionIndex(0)
                                }
                              }}
                            />
                            {editMentionSuggestions.length > 0 && (
                              <div className="rounded-md border bg-background p-1">
                                {editMentionSuggestions.map((username, idx) => (
                                  <button
                                    key={username}
                                    type="button"
                                    className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${idx === normalizedEditMentionIndex ? "bg-muted" : ""}`}
                                    onClick={() => {
                                      const next = insertMention(editingText, editingCursor, username)
                                      setEditingText(next)
                                      setEditingCursor(next.length)
                                      setEditMentionIndex(0)
                                    }}
                                  >
                                    @{username}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => editCommentMutation.mutate({ commentId: comment._id, text: editingText })}
                                disabled={editCommentMutation.isPending || !editingText.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCommentId(null)
                                  setEditingText("")
                                  setEditMentionIndex(0)
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{comment?.text}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {comment?.createdAt ? new Date(comment.createdAt).toLocaleString() : ""}
                          {comment?.editedAt ? " (edited)" : ""}
                        </p>
                      </div>
                    </div>
                    {String(comment?.user?._id || "") === String((user as any)?._id || (user as any)?.id || "") && (
                      <div className="flex gap-1">
                        {editingCommentId !== String(comment._id) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCommentId(String(comment._id))
                              setEditingText(String(comment?.text || ""))
                              setEditingCursor(String(comment?.text || "").length)
                              setEditMentionIndex(0)
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteCommentMutation.mutate(comment._id)}
                          disabled={deleteCommentMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
