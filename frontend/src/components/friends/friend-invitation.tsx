"use client"

import { useState } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardDescription, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
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
  Clock, 
  X,
  Users,
  MessageSquare,
  DollarSign,
  Plus,
  Trash2,
  MoreHorizontal
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { friendsAPI } from "@/lib/api"

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
  id: string
  email: string
  invitedDate: string
  status: 'sent' | 'opened' | 'expired'
  message?: string
}

// Empty initial data - will be populated from API
const mockFriends: Friend[] = []
const mockPendingInvitations: PendingInvitation[] = []

export function FriendInvitation() {
  const [friends, setFriends] = useState<Friend[]>(mockFriends)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>(mockPendingInvitations)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteMessage, setInviteMessage] = useState('Hey! Join me on Khutrukey to easily split and track our shared expenses. It makes managing group expenses so much simpler!')
  const [copiedLink, setCopiedLink] = useState(false)
  const { toast } = useToast()

  const inviteLink = "https://khutrukey.app/invite/abc123"

  const handleSendInvitations = async () => {
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
      return
    }

    // Check for duplicates
    const existingEmails = [
      ...friends.map(f => f.email),
      ...pendingInvitations.map(p => p.email)
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

      if (succeeded.length) {
        const newInvitations = succeeded.map(email => ({
          id: Date.now().toString() + Math.random(),
          email,
          invitedDate: new Date().toISOString().split('T')[0],
          status: 'sent' as const,
          message: inviteMessage,
        }))
        setPendingInvitations(prev => [...prev, ...newInvitations])
      }

      setInviteEmails('')
      setIsInviteDialogOpen(false)

      if (succeeded.length) {
        toast({ title: "Invitations sent!", description: `Sent ${succeeded.length} invitation${succeeded.length === 1 ? '' : 's'}.` })
      }
      if (failed.length) {
        toast({ title: "Some invites failed", description: failed.join(', '), variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Failed to send invites", description: e?.message || "", variant: "destructive" })
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
      toast({
        title: "Link copied!",
        description: "Invitation link copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive"
      })
    }
  }

  const handleResendInvitation = (invitationId: string) => {
    setPendingInvitations(prev => prev.map(inv => 
      inv.id === invitationId 
        ? { ...inv, status: 'sent' as const, invitedDate: new Date().toISOString().split('T')[0] }
        : inv
    ))
    
    toast({
      title: "Invitation resent",
      description: "The invitation has been sent again.",
    })
  }

  const handleCancelInvitation = (invitationId: string) => {
    setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    
    toast({
      title: "Invitation cancelled",
      description: "The invitation has been cancelled.",
    })
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

  const startDirectChat = (friendId: string) => {
    // This would navigate to direct chat with the friend
    toast({
      title: "Starting chat",
      description: "Opening direct message...",
    })
  }

  const addToExpense = (friendId: string) => {
    // This would open expense creation with friend pre-selected
    toast({
      title: "Adding to expense",
      description: "Opening expense creation...",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Friends & Invitations</h2>
          <p className="text-muted-foreground">
            Invite friends to join Khutrukey and manage shared expenses together
          </p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Friends
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <KanbanCard>
          <KanbanCardHeader className="pb-2">
            <KanbanCardTitle className="text-sm font-medium">Total Friends</KanbanCardTitle>
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-2xl font-bold">{friends.length}</div>
          </KanbanCardContent>
        </KanbanCard>
        <KanbanCard>
          <KanbanCardHeader className="pb-2">
            <KanbanCardTitle className="text-sm font-medium">Pending Invitations</KanbanCardTitle>
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-2xl font-bold">{pendingInvitations.length}</div>
          </KanbanCardContent>
        </KanbanCard>
        <KanbanCard>
          <KanbanCardHeader className="pb-2">
            <KanbanCardTitle className="text-sm font-medium">Total Balance</KanbanCardTitle>
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-2xl font-bold text-green-600">
              ${friends.reduce((sum, f) => sum + f.balance, 0).toFixed(2)}
            </div>
          </KanbanCardContent>
        </KanbanCard>
        <KanbanCard>
          <KanbanCardHeader className="pb-2">
            <KanbanCardTitle className="text-sm font-medium">Shared Expenses</KanbanCardTitle>
          </KanbanCardHeader>
          <KanbanCardContent>
            <div className="text-2xl font-bold">
              {friends.reduce((sum, f) => sum + f.totalExpenses, 0)}
            </div>
          </KanbanCardContent>
        </KanbanCard>
      </div>

      <Tabs defaultValue="friends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingInvitations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4">
          {friends.length > 0 ? (
            <div className="grid gap-4">
              {friends.map((friend) => (
                <KanbanCard key={friend.id}>
                  <KanbanCardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>
                            {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{friend.name}</h3>
                          <p className="text-sm text-muted-foreground">{friend.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(friend.status)}
                            <span className="text-xs text-muted-foreground">
                              Joined {new Date(friend.joinedDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Balance</div>
                          <div className={`font-semibold ${friend.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(friend.balance).toFixed(2)}
                            <span className="text-xs ml-1">
                              {friend.balance >= 0 ? 'owes you' : 'you owe'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Expenses</div>
                          <div className="font-semibold">{friend.totalExpenses}</div>
                        </div>
                        
                        <div className="flex gap-2">
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
                <KanbanCard key={invitation.id}>
                  <KanbanCardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            <Mail className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{invitation.email}</h3>
                          <p className="text-sm text-muted-foreground">
                            Invited on {new Date(invitation.invitedDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(invitation.status)}
                            {invitation.status === 'opened' && (
                              <span className="text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 inline mr-1" />
                                Waiting for signup
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvitation(invitation.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Resend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
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
                  All your invitations have been accepted or you haven't sent any yet
                </p>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitations
                </Button>
              </KanbanCardContent>
            </KanbanCard>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Friends Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-sm w-auto max-h-[85vh] mx-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-semibold">Invite Friends to Khutrukey</DialogTitle>
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
                  placeholder="Enter email addresses (one per line or comma-separated)&#10;alice@example.com&#10;bob@example.com"
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
                  Share this link with friends so they can join Khutrukey and connect with you
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} size="sm" className="h-8 px-3">
              Cancel
            </Button>
            <Button onClick={handleSendInvitations} size="sm" className="h-8 px-3">
              <Send className="h-3 w-3 mr-1" />
              Send Invitations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}