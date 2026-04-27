"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import {
  UserPlus,
  Mail,
  Send,
  Copy,
  Check,
  X,
  Users,
  MessageSquare,
  DollarSign,
  Trash2,
  MoreHorizontal
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { friendsAPI, conversationAPI } from "@/lib/api"
import { formatCurrencyWithSymbol } from "@/lib/currency"
import { useAuth } from "@/contexts/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"

interface Friend {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'active' | 'pending' | 'invited'
  joinedDate: string
  totalExpenses: number
  balance: number
}

interface PendingInvitation {
  code: string
  invitedDate: string
  expiresAt: string
  message?: string
  inviter: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatar?: string
  }
}

interface FriendApiItem {
  _id: string
  firstName?: string
  lastName?: string
  email: string
  avatar?: string
  joinedAt?: string
}

interface FriendListResponse {
  data?: {
    data?: FriendApiItem[]
  }
}

interface PendingInvitesResponse {
  data?: {
    data?: PendingInvitation[]
  }
}

interface ApiErrorLike {
  message?: string
  response?: {
    data?: {
      message?: string
    }
  }
}

/** Map raw API response to Friend[] */
function mapFriends(res: FriendListResponse): Friend[] {
  const items = Array.isArray(res.data?.data) ? res.data.data : []
  return items.map((u) => ({
    id: u._id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" "),
    email: u.email,
    avatar: u.avatar || undefined,
    status: 'active' as const,
    joinedDate: u.joinedAt || new Date().toISOString(),
    totalExpenses: 0,
    balance: 0,
  }))
}

export function FriendInvitationWithDelete() {
  const { user } = useAuth()
  const userCurrency = user?.preferences?.currency || "USD"
  const queryClient = useQueryClient()

  // ─── React Query: friends list (cached, instant back-nav) ─────────
  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['friends-list'],
    queryFn: () => friendsAPI.list(),
    staleTime: 5 * 60 * 1000,
    select: mapFriends,
  })

  // ─── React Query: pending invitations (cached) ────────────────────
  const { data: pendingInvitations = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['friend-invites'],
    queryFn: () => friendsAPI.myInvites(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    select: (res: PendingInvitesResponse) => {
      const items = Array.isArray(res.data?.data) ? res.data.data : []
      return items
    },
  })

  // Real-time socket event → invalidate React Query caches
  useEffect(() => {
    const onInvited = () => {
      queryClient.invalidateQueries({ queryKey: ['friend-invites'] })
    }
    const onAccepted = () => {
      queryClient.invalidateQueries({ queryKey: ['friends-list'] })
      queryClient.invalidateQueries({ queryKey: ['friend-invites'] })
    }
    window.addEventListener("socket:friend:invited", onInvited)
    window.addEventListener("socket:friend:accepted", onAccepted)
    return () => {
      window.removeEventListener("socket:friend:invited", onInvited)
      window.removeEventListener("socket:friend:accepted", onAccepted)
    }
  }, [queryClient])

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null)
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteMessage, setInviteMessage] = useState('Hey! Join me on SajiloKhata to easily split and track our shared expenses. It makes managing group expenses so much simpler!')
  const [copiedLink, setCopiedLink] = useState(false)
  const [sending, setSending] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const isLoading = friendsLoading || invitesLoading

  const handleSendInvitations = async () => {
    if (sending) return
    setSending(true)
    const emails = inviteEmails
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'))

    if (emails.length === 0) {
      toast({
        title: "No valid emails",
        description: "Please enter at least one valid email address.",
        variant: "destructive"
      })
      setSending(false)
      return
    }

    // Check for duplicates (friends only; pending received invites don't matter here)
    const existingEmails = [
      ...friends.map(f => f.email),
    ]

    const newEmails = emails.filter(email => !existingEmails.includes(email))
    const duplicateEmails = emails.filter(email => existingEmails.includes(email))

    if (duplicateEmails.length > 0) {
      toast({
        title: "Some emails already invited",
        description: `${duplicateEmails.join(', ')} ${duplicateEmails.length === 1 ? 'is' : 'are'} already in your friends or pending invitations.`,
        variant: "destructive"
      })
    }

    if (newEmails.length === 0) {
      setSending(false)
      return
    }

    try {
      const results = await Promise.allSettled(
        newEmails.map(email => friendsAPI.createInvite({ inviteeEmail: email, message: inviteMessage }))
      )

      const succeeded: string[] = []
      const failed: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') succeeded.push(newEmails[i])
        else failed.push(newEmails[i])
      })

      setInviteEmails('')
      setIsInviteDialogOpen(false)

      if (succeeded.length) {
        toast({ title: "Invitations sent!", description: `Sent ${succeeded.length} invitation${succeeded.length === 1 ? '' : 's'}.` })
      }
      if (failed.length) {
        toast({ title: "Some invites failed", description: failed.join(', '), variant: 'destructive' })
      }

    } catch (e: unknown) {
      const _error = e as ApiErrorLike
      toast({ title: "Failed to send invites", description: _error.message || "", variant: "destructive" })
    }
    setSending(false)
  }

  const handleGenerateLink = async () => {
    setGeneratingLink(true)
    try {
      const res = await friendsAPI.createInvite({ message: inviteMessage || undefined }) as { data?: { inviteUrl?: string } }
      const url = res.data?.inviteUrl || null
      setInviteLink(url)
      if (url) {
        toast({ title: "Invite link generated!", description: "Share this link with your friend." })
      }
    } catch (e: unknown) {
      const error = e as ApiErrorLike
      toast({ title: "Failed to generate link", description: error.response?.data?.message || error.message || "", variant: "destructive" })
    } finally {
      setGeneratingLink(false)
    }
  }

  const handleCopyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
      toast({
        title: "Link copied!",
        description: "Invitation link copied to clipboard.",
      })
    } catch (_error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive"
      })
    }
  }

  const handleAcceptInvite = async (code: string) => {
    try {
      await friendsAPI.acceptInvite(code)
      toast({ title: "You're now friends!" })
      // Invalidate both queries to refresh from server
      queryClient.invalidateQueries({ queryKey: ['friends-list'] })
      queryClient.invalidateQueries({ queryKey: ['friend-invites'] })
    } catch (e: unknown) {
      const error = e as ApiErrorLike
      toast({
        title: "Failed to accept invite",
        description: error.response?.data?.message || error.message || "",
        variant: "destructive",
      })
    }
  }

  const handleDeclineInvite = async (code: string) => {
    try {
      await friendsAPI.declineInvite(code)
      toast({ title: "Invite declined" })
      queryClient.invalidateQueries({ queryKey: ['friend-invites'] })
    } catch (e: unknown) {
      const error = e as ApiErrorLike
      toast({
        title: "Failed to decline invite",
        description: error.response?.data?.message || error.message || "",
        variant: "destructive",
      })
    }
  }

  const handleDeleteFriend = (friend: Friend) => {
    setFriendToDelete(friend)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteFriend = async () => {
    if (!friendToDelete) return

    try {
      await friendsAPI.remove(friendToDelete.id)
      toast({
        title: "Friend removed",
        description: `${friendToDelete.name} has been removed from your friends list.`,
      })
      queryClient.invalidateQueries({ queryKey: ['friends-list'] })
    } catch (e: unknown) {
      const error = e as ApiErrorLike
      toast({
        title: "Failed to remove friend",
        description: error.response?.data?.message || error.message || "An error occurred while removing the friend.",
        variant: "destructive",
      })
    } finally {
      setFriendToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>
      case 'opened':
        return <Badge className="bg-purple-100 text-purple-800">Opened</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const startDirectChat = async (friendId: string) => {
    try {
      await conversationAPI.upsertDM(friendId)
      router.push(`/chat?dm=${friendId}`)
    } catch (e: unknown) {
      const error = e as ApiErrorLike
      toast({ title: "Failed to open chat", description: error.response?.data?.message || "", variant: "destructive" })
    }
  }

  const addToExpense = (friendId: string) => {
    router.push(`/expenses/create?with=${friendId}`)
  }

  const addToGroup = (friendId: string) => {
    router.push(`/groups?addMember=${friendId}`)
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-48 bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-72 bg-slate-700 rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-32 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KanbanCard key={i}>
              <KanbanCardHeader className="pb-2">
                <div className="h-4 w-20 bg-slate-700 rounded animate-pulse" />
              </KanbanCardHeader>
              <KanbanCardContent>
                <div className="h-8 w-12 bg-slate-700 rounded animate-pulse" />
              </KanbanCardContent>
            </KanbanCard>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold">Friends & Invitations</h2>
          <p className="text-muted-foreground">
            Invite friends to join SajiloKhata and manage shared expenses together
          </p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Friends
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KanbanCard>
          <KanbanCardHeader className="pb-2">
            <KanbanCardTitle className="text-sm font-medium">Total Friends</KanbanCardTitle>
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-xl sm:text-2xl font-bold">{friends.length}</div>
          </KanbanCardContent>
        </KanbanCard>
        <KanbanCard>
          <KanbanCardHeader className="pb-2">
            <KanbanCardTitle className="text-sm font-medium">Pending Invitations</KanbanCardTitle>
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-xl sm:text-2xl font-bold">{pendingInvitations.length}</div>
          </KanbanCardContent>
        </KanbanCard>
        <KanbanCard>
          <KanbanCardHeader className="pb-2">
            <KanbanCardTitle className="text-sm font-medium">Total Balance</KanbanCardTitle>
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600 break-all">
              {formatCurrencyWithSymbol(friends.reduce((sum, f) => sum + f.balance, 0), userCurrency)}
            </div>
          </KanbanCardContent>
        </KanbanCard>
        <KanbanCard>
          <KanbanCardHeader className="pb-2">
            <KanbanCardTitle className="text-sm font-medium">Shared Expenses</KanbanCardTitle>
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {friends.reduce((sum, f) => sum + f.totalExpenses, 0)}
            </div>
          </KanbanCardContent>
        </KanbanCard>
      </div>

      <Tabs defaultValue="friends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingInvitations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4">
          {friends.length > 0 ? (
            <div className="grid gap-4">
              {friends.map((friend) => (
                <KanbanCard key={friend.id}>
                  <KanbanCardContent className="p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>
                            {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-semibold break-words">{friend.name}</h3>
                          <p className="text-sm text-muted-foreground break-all">{friend.email}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {getStatusBadge(friend.status)}
                            <span className="text-xs text-muted-foreground">
                              Joined {new Date(friend.joinedDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div className="text-left sm:text-right">
                          <div className="text-sm text-muted-foreground">Balance</div>
                          <div className={`font-semibold break-all ${friend.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrencyWithSymbol(Math.abs(friend.balance), userCurrency)}
                            <span className="text-xs ml-1">
                              {friend.balance >= 0 ? 'owes you' : 'you owe'}
                            </span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <div className="text-sm text-muted-foreground">Expenses</div>
                          <div className="font-semibold">{friend.totalExpenses}</div>
                        </div>

                        <div className="flex gap-2 ml-auto sm:ml-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startDirectChat(friend.id)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addToExpense(friend.id)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startDirectChat(friend.id)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addToExpense(friend.id)}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Add to Expense
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addToGroup(friend.id)}>
                                <Users className="h-4 w-4 mr-2" />
                                Add to Group
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteFriend(friend)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Friend
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </KanbanCardContent>
                </KanbanCard>
              ))}
            </div>
          ) : (
            <KanbanCard>
              <KanbanCardContent className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No friends yet</h3>
                <p className="text-muted-foreground mb-4">
                  Invite your friends to start sharing expenses together
                </p>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Your First Friend
                </Button>
              </KanbanCardContent>
            </KanbanCard>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingInvitations.length > 0 ? (
            <div className="grid gap-4">
              {pendingInvitations.map((invitation) => (
                <KanbanCard key={invitation.code}>
                  <KanbanCardContent className="p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={invitation.inviter.avatar} />
                          <AvatarFallback>
                            {invitation.inviter.firstName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-semibold">
                            {invitation.inviter.firstName} {invitation.inviter.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground break-all">{invitation.inviter.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited on {new Date(invitation.invitedDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Expires {new Date(invitation.expiresAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:justify-end">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAcceptInvite(invitation.code)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeclineInvite(invitation.code)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {invitation.message && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{invitation.message}</p>
                      </div>
                    )}
                  </KanbanCardContent>
                </KanbanCard>
              ))}
            </div>
          ) : (
            <KanbanCard>
              <KanbanCardContent className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No pending invitations</h3>
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have any incoming friend invites right now.
                </p>
              </KanbanCardContent>
            </KanbanCard>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Friends Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-sm w-auto max-h-[85vh] mx-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-semibold">Invite Friends to SajiloKhata</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send invitations via email or share your personal invite link
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="email" className="space-y-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email Invites</TabsTrigger>
              <TabsTrigger value="link">Share Link</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-2">
              <div>
                <Label htmlFor="emails" className="text-xs">Email Addresses</Label>
                <Textarea
                  id="emails"
                  placeholder={"Enter email addresses (one per line or comma-separated)\nalice@example.com\nbob@example.com"}
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate multiple emails with commas or new lines
                </p>
              </div>

              <div>
                <Label htmlFor="message" className="text-xs">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to your invitation..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="min-h-[50px] text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="link" className="space-y-2">
              <div>
                <Label className="text-xs">Your Personal Invite Link</Label>
                {inviteLink ? (
                  <>
                    <div className="flex gap-2 mt-2">
                      <Input value={inviteLink} readOnly className="flex-1 h-8 text-sm" />
                      <Button
                        variant="outline"
                        onClick={handleCopyLink}
                        className="flex-shrink-0 h-8"
                      >
                        {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Share this link with friends so they can join SajiloKhata and connect with you
                    </p>
                  </>
                ) : (
                  <div className="mt-2">
                    <Button onClick={handleGenerateLink} disabled={generatingLink} size="sm" className="w-full">
                      {generatingLink ? 'Generating...' : 'Generate Invite Link'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click to generate a shareable invite link
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} size="sm" className="h-8 px-3">
              Cancel
            </Button>
            <Button onClick={handleSendInvitations} size="sm" className="h-8 px-3" disabled={sending}>
              <Send className="h-3 w-3 mr-1" />
              {sending ? 'Sending...' : 'Send Invitations'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Friend Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm w-auto max-h-[85vh] mx-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-semibold">Remove Friend</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove {friendToDelete?.name} from your friends list?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-xs">!</span>
                  </div>
                </div>
                <div className="text-xs">
                  <p className="font-medium text-yellow-800 mb-1">This action cannot be undone</p>
                  <ul className="text-yellow-700 space-y-1">
                    <li>• {friendToDelete?.name} will be removed from all shared groups</li>
                    <li>• Shared expense history will be preserved</li>
                    <li>• You can re-add them later by sending a new invitation</li>
                  </ul>
                </div>
              </div>
            </div>

            {friendToDelete && friendToDelete.balance !== 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <Trash2 className="h-4 w-4" />
                  <span className="font-medium">Outstanding Balance</span>
                </div>
                <p className="text-xs text-red-700 mt-1">
                  {friendToDelete.balance > 0
                    ? `${friendToDelete.name} owes you ${formatCurrencyWithSymbol(Math.abs(friendToDelete.balance), userCurrency)}`
                    : `You owe ${friendToDelete.name} ${formatCurrencyWithSymbol(Math.abs(friendToDelete.balance), userCurrency)}`
                  }
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Make sure to settle this balance before removing them.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteFriend}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Friend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
