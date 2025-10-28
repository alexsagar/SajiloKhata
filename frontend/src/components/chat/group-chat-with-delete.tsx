"use client"

import { useState, useRef, useEffect } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Send, Users, Search, MoreVertical, Phone, Video, Plus, MessageSquare, Trash2, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { EnhancedCreateGroupDialog } from "../groups/enhanced-create-group-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface GroupMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: string
  isCurrentUser: boolean
}

interface Group {
  id: string
  name: string
  avatar?: string
  lastMessage?: GroupMessage
  lastMessageTime: string
  unreadCount: number
  memberCount: number
  messages: GroupMessage[]
}

// Empty initial data - will be populated from API
const mockGroups: Group[] = []

export function GroupChatWithDelete() {
  const [groups, setGroups] = useState<Group[]>(mockGroups)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedGroup?.messages])

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSendMessage = () => {
    if (!message.trim() || !selectedGroup) return

    const newMessage: GroupMessage = {
      id: Date.now().toString(),
      senderId: 'current',
      senderName: 'You',
      content: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true
    }

    setGroups(prev => prev.map(group => {
      if (group.id === selectedGroup.id) {
        return {
          ...group,
          messages: [...group.messages, newMessage],
          lastMessage: newMessage,
          lastMessageTime: 'now'
        }
      }
      return group
    }))

    setSelectedGroup(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage],
      lastMessage: newMessage,
      lastMessageTime: 'now'
    } : null)

    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleGroupCreated = (newGroupData: any) => {
    const newGroup: Group = {
      id: newGroupData.id,
      name: newGroupData.name,
      avatar: "",
      lastMessageTime: "now",
      unreadCount: 0,
      memberCount: newGroupData.members.length,
      messages: []
    }

    setGroups(prev => [newGroup, ...prev])
    setSelectedGroup(newGroup)

    // Send welcome message
    const welcomeMessage: GroupMessage = {
      id: Date.now().toString(),
      senderId: 'system',
      senderName: 'System',
      content: `Welcome to ${newGroup.name}! Start sharing expenses and chatting with your group members.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: false
    }

    setTimeout(() => {
      setGroups(prev => prev.map(group => {
        if (group.id === newGroup.id) {
          return {
            ...group,
            messages: [welcomeMessage],
            lastMessage: welcomeMessage
          }
        }
        return group
      }))

      setSelectedGroup(prev => prev ? {
        ...prev,
        messages: [welcomeMessage],
        lastMessage: welcomeMessage
      } : null)
    }, 500)
  }

  const handleDeleteGroup = (group: Group) => {
    setGroupToDelete(group)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      setGroups(prev => prev.filter(g => g.id !== groupToDelete.id))
      
      // If the deleted group was selected, clear selection
      if (selectedGroup?.id === groupToDelete.id) {
        setSelectedGroup(null)
      }
      
      toast({
        title: "Group deleted",
        description: `"${groupToDelete.name}" has been deleted successfully.`,
      })
      
      setGroupToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const markAsRead = (groupId: string) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, unreadCount: 0 } : group
    ))
  }

  return (
    <div className="flex h-full gap-4">
      {/* Groups Sidebar */}
      <div className="w-80 flex flex-col">
        <KanbanCard className="flex-1">
          <KanbanCardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <KanbanCardTitle className="text-lg">Group Chats</KanbanCardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Search className="h-4 w-4" />
                </Button>
                <EnhancedCreateGroupDialog onGroupCreated={handleGroupCreated}>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </EnhancedCreateGroupDialog>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </KanbanCardHeader>
          <KanbanCardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-18rem)]">
              <div className="space-y-1 p-3">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors group",
                        selectedGroup?.id === group.id && "bg-muted"
                      )}
                      onClick={() => {
                        setSelectedGroup(group)
                        markAsRead(group.id)
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={group.avatar} />
                        <AvatarFallback>
                          {group.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{group.name}</p>
                          <div className="flex items-center gap-1">
                            {group.lastMessage && (
                              <span className="text-xs text-muted-foreground">
                                {group.lastMessageTime}
                              </span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedGroup(group)
                                }}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Open Chat
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  // Add group settings functionality
                                  toast({
                                    title: "Group Settings",
                                    description: "Group settings coming soon!",
                                  })
                                }}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Group Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteGroup(group)
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Group
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {group.lastMessage?.content || "No messages yet"}
                          </p>
                          {group.unreadCount > 0 && (
                            <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                              {group.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : groups.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No groups yet</h3>
                    <p className="text-muted-foreground mb-4 text-sm">
                      Create your first group to start chatting with your expense-sharing partners
                    </p>
                    <EnhancedCreateGroupDialog onGroupCreated={handleGroupCreated}>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Group
                      </Button>
                    </EnhancedCreateGroupDialog>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No groups found</h3>
                    <p className="text-muted-foreground text-sm">
                      No groups match your search "{searchTerm}"
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </KanbanCardContent>
        </KanbanCard>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <KanbanCard className="flex-1 flex flex-col">
          {selectedGroup ? (
            <>
              {/* Chat Header */}
              <KanbanCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedGroup.avatar} />
                      <AvatarFallback>
                        {selectedGroup.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedGroup.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {selectedGroup.memberCount} member{selectedGroup.memberCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          toast({
                            title: "Group Settings",
                            description: "Group settings coming soon!",
                          })
                        }}>
                          <Settings className="h-4 w-4 mr-2" />
                          Group Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          toast({
                            title: "Group Info",
                            description: "Group information coming soon!",
                          })
                        }}>
                          <Users className="h-4 w-4 mr-2" />
                          Group Info
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteGroup(selectedGroup)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </KanbanCardHeader>

              <Separator />

              {/* Messages Area */}
              <KanbanCardContent className="flex-1 p-0">
                <ScrollArea className="h-[calc(100vh-20rem)] p-4">
                  {selectedGroup.messages.length > 0 ? (
                    <div className="space-y-4">
                      {selectedGroup.messages.map((msg, index) => {
                        const showAvatar = index === 0 || selectedGroup.messages[index - 1].senderId !== msg.senderId
                        
                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex gap-3",
                              msg.isCurrentUser && "flex-row-reverse"
                            )}
                          >
                            <div className="flex flex-col items-center">
                              {showAvatar ? (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={msg.senderAvatar} />
                                  <AvatarFallback>
                                    {msg.senderId === 'system' ? 'SYS' : msg.senderName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-8 w-8" />
                              )}
                            </div>
                            <div className={cn(
                              "flex flex-col max-w-[70%]",
                              msg.isCurrentUser && "items-end"
                            )}>
                              {showAvatar && (
                                <div className={cn(
                                  "flex items-center gap-2 mb-1",
                                  msg.isCurrentUser && "flex-row-reverse"
                                )}>
                                  <span className="text-sm font-medium">{msg.senderName}</span>
                                  <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                                </div>
                              )}
                              <div className={cn(
                                "rounded-lg px-3 py-2 text-sm",
                                msg.senderId === 'system' 
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : msg.isCurrentUser 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-muted"
                              )}>
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
                        <p className="text-muted-foreground text-sm">
                          Send your first message to {selectedGroup.name}
                        </p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </KanbanCardContent>

              <Separator />

              {/* Message Input */}
              <div className="p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">Select a group to start chatting</h3>
                <p className="text-muted-foreground mb-6">
                  Choose a group from the sidebar or create a new one to begin messaging
                </p>
                <EnhancedCreateGroupDialog onGroupCreated={handleGroupCreated}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Group
                  </Button>
                </EnhancedCreateGroupDialog>
              </div>
            </div>
          )}
        </KanbanCard>
      </div>

      {/* Delete Group Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{groupToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </div>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-red-800 mb-1">This action cannot be undone</p>
                  <ul className="text-red-700 space-y-1">
                    <li>• All chat messages will be permanently deleted</li>
                    <li>• Group members will be removed from the group</li>
                    <li>• Shared expense history will be preserved</li>
                    <li>• You can create a new group with the same members later</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteGroup}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}