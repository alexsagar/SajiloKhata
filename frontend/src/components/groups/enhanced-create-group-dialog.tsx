"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Users, 
  Mail, 
  UserPlus, 
  X,
  Search,
  Plus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Friend {
  id: string
  name: string
  email: string
  avatar?: string
  isSelected?: boolean
}

interface CreateGroupDialogProps {
  children: React.ReactNode
  onGroupCreated?: (group: any) => void
}

// Empty initial data - will be populated from API
const mockFriends: Friend[] = []

export function EnhancedCreateGroupDialog({ children, onGroupCreated }: CreateGroupDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([])
  const [emailInvites, setEmailInvites] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [friends] = useState<Friend[]>(mockFriends)
  const { toast } = useToast()

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleFriendToggle = (friend: Friend) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id)
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id)
      } else {
        return [...prev, friend]
      }
    })
  }

  const handleRemoveFriend = (friendId: string) => {
    setSelectedFriends(prev => prev.filter(f => f.id !== friendId))
  }

  const parseEmailInvites = () => {
    return emailInvites
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'))
  }

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group.",
        variant: "destructive"
      })
      return
    }

    const emailList = parseEmailInvites()
    const totalMembers = selectedFriends.length + emailList.length + 1 // +1 for current user

    // Allow creating groups with just the current user for demo purposes
    // In production, you might want to require at least 2 members
    if (totalMembers < 1) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
      return
    }

    const newGroup = {
      id: Date.now().toString(),
      name: groupName.trim(),
      description: groupDescription.trim(),
      members: [
        {
          id: 'current-user',
          name: 'You',
          email: 'you@example.com',
          role: 'admin',
          status: 'active'
        },
        ...selectedFriends.map(friend => ({
          ...friend,
          role: 'member',
          status: 'active'
        })),
        ...emailList.map(email => ({
          id: `invite-${Date.now()}-${Math.random()}`,
          name: email.split('@')[0],
          email,
          role: 'member',
          status: 'invited'
        }))
      ],
      createdAt: new Date().toISOString(),
      totalExpenses: 0,
      totalAmount: 0
    }

    // Reset form
    setGroupName('')
    setGroupDescription('')
    setSelectedFriends([])
    setEmailInvites('')
    setSearchTerm('')
    setIsOpen(false)

    onGroupCreated?.(newGroup)

    toast({
      title: "Group created successfully!",
      description: `Created "${newGroup.name}" with ${totalMembers} member${totalMembers === 1 ? '' : 's'}. ${emailList.length > 0 ? `Invitations sent to ${emailList.length} email${emailList.length === 1 ? '' : 's'}.` : ''}`,
    })
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group to share expenses with friends and family
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Group Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  placeholder="e.g., Roommates, Trip to Paris, Work Team"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="groupDescription">Description (Optional)</Label>
                <Textarea
                  id="groupDescription"
                  placeholder="What's this group for? (e.g., Our apartment expenses, Europe trip 2025)"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </div>

            {/* Add Members */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Add Members</h3>
              </div>
              
              <Tabs defaultValue="friends" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="friends">From Friends</TabsTrigger>
                  <TabsTrigger value="email">Invite by Email</TabsTrigger>
                </TabsList>
                
                <TabsContent value="friends" className="space-y-4">
                  {friends.length > 0 ? (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search friends..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {filteredFriends.map((friend) => (
                          <div
                            key={friend.id}
                            className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleFriendToggle(friend)}
                          >
                            <Checkbox
                              checked={selectedFriends.some(f => f.id === friend.id)}
                              onCheckedChange={() => handleFriendToggle(friend)}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={friend.avatar} />
                              <AvatarFallback>
                                {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{friend.name}</p>
                              <p className="text-xs text-muted-foreground">{friend.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {filteredFriends.length === 0 && searchTerm && (
                        <p className="text-center text-muted-foreground py-4">
                          No friends found matching "{searchTerm}"
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="font-medium mb-2">No friends yet</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add friends first to include them in groups
                      </p>
                      <Button variant="outline" size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Friends
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="email" className="space-y-4">
                  <div>
                    <Label htmlFor="emailInvites">Email Addresses</Label>
                    <Textarea
                      id="emailInvites"
                      placeholder="Enter email addresses (one per line or comma-separated)&#10;alice@example.com&#10;bob@example.com"
                      value={emailInvites}
                      onChange={(e) => setEmailInvites(e.target.value)}
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      These people will receive email invitations to join SplitWise and this group
                    </p>
                  </div>
                  
                  {parseEmailInvites().length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Will invite {parseEmailInvites().length} people:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {parseEmailInvites().map((email, index) => (
                          <Badge key={index} variant="secondary">
                            <Mail className="h-3 w-3 mr-1" />
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Selected Members Preview */}
            {(selectedFriends.length > 0 || parseEmailInvites().length > 0) && (
              <div className="space-y-3">
                <h4 className="font-medium">Group Members Preview</h4>
                <div className="space-y-2">
                  {/* Current User */}
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">You</p>
                      <p className="text-xs text-muted-foreground">Group Admin</p>
                    </div>
                    <Badge variant="outline">Admin</Badge>
                  </div>
                  
                  {/* Selected Friends */}
                  {selectedFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>
                          {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{friend.name}</p>
                        <p className="text-xs text-muted-foreground">{friend.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFriend(friend.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Email Invites */}
                  {parseEmailInvites().map((email, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <Mail className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{email}</p>
                        <p className="text-xs text-muted-foreground">Will be invited</p>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        Invite
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}