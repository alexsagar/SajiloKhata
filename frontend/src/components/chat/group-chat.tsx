"use client"

import { useState, useRef, useEffect } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Send, Users, Search, MoreVertical, Phone, Video, Plus, MessageSquare, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { EnhancedCreateGroupDialog } from "../groups/enhanced-create-group-dialog"
import { useSocket } from "@/contexts/socket-context"
import { useAuth } from "@/contexts/auth-context"
import { groupAPI, conversationAPI } from "@/lib/api"

interface GroupMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: string
  isCurrentUser: boolean
}

interface GroupMember {
  id: string
  name: string
  username?: string
  avatar?: string
}

interface Group {
  id: string
  name: string
  avatar?: string
  lastMessage?: GroupMessage
  lastMessageTime: string
  unreadCount: number
  memberCount: number
  members: GroupMember[]
  messages: GroupMessage[]
  conversationId?: string
}

function getUserId(value: any) {
  return String(value?._id || value?.id || value || "")
}

function getDisplayName(userLike: any, fallback = "User") {
  if (!userLike) return fallback
  const firstName = String(userLike.firstName || "").trim()
  const lastName = String(userLike.lastName || "").trim()
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName || userLike.username || fallback
}

function toChatMessage(message: any, currentUserId: string, group?: Group | null): GroupMessage {
  const senderId = getUserId(message?.sender)
  const senderFromGroup = group?.members.find((member) => member.id === senderId)
  const senderName =
    getDisplayName(message?.sender, "") ||
    senderFromGroup?.name ||
    senderFromGroup?.username ||
    "User"

  return {
    id: String(message?._id || message?.id || ""),
    senderId,
    senderName,
    senderAvatar: message?.sender?.avatar || senderFromGroup?.avatar,
    content: String(message?.text || message?.content || ""),
    timestamp: new Date(message?.createdAt || message?.timestamp || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isCurrentUser: senderId === currentUserId,
  }
}

export function GroupChat() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const processedMessageIds = useRef<Set<string>>(new Set())
  const { toast } = useToast()
  const { socket, joinGroups, joinConversations, isConnected } = useSocket()
  const { user } = useAuth()
  const currentUserId = getUserId(user)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const appendMessageToGroup = (conversationId: string, newMsg: GroupMessage) => {
    let matchedGroupId: string | null = null

    setGroups((prev) =>
      prev.map((group) => {
        if (group.conversationId !== conversationId) {
          return group
        }

        matchedGroupId = group.id
        const hasMessage = group.messages.some((msg) => msg.id === newMsg.id)
        return {
          ...group,
          messages: hasMessage ? group.messages : [...group.messages, newMsg],
          lastMessage: newMsg,
          lastMessageTime: newMsg.timestamp,
          unreadCount: selectedGroup?.id === group.id ? 0 : group.unreadCount + (hasMessage ? 0 : 1),
        }
      }),
    )

    if (!matchedGroupId || selectedGroup?.id !== matchedGroupId) {
      return
    }

    setSelectedGroup((current) => {
      if (!current || current.id !== matchedGroupId) {
        return current
      }
      const hasMessage = current.messages.some((msg) => msg.id === newMsg.id)
      return {
        ...current,
        messages: hasMessage ? current.messages : [...current.messages, newMsg],
        lastMessage: newMsg,
        lastMessageTime: newMsg.timestamp,
      }
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedGroup?.messages])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Fetch groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await groupAPI.getGroups()
        const groupsData = res.data?.data || []

        const formattedGroups: Group[] = await Promise.all(groupsData.map(async (g: any) => {
          // Try to find conversation for this group to get last message
          let lastMsg: GroupMessage | undefined
          let convId: string | undefined

          // TODO: batch conversation loading or get from the group list API
          //       For now, initialized with empty messages and loaded on select

          return {
            id: g._id,
            name: g.name,
            avatar: undefined, // Group avatar not yet implemented in backend
            lastMessage: lastMsg,
            lastMessageTime: "",
            unreadCount: 0,
            memberCount: g.members?.length || 0,
            members: (g.members || []).map((member: any) => ({
              id: getUserId(member?.user),
              name: getDisplayName(member?.user),
              username: member?.user?.username,
              avatar: member?.user?.avatar,
            })),
            messages: [],
            conversationId: convId
          }
        }))

        setGroups(formattedGroups)

        // Join socket rooms for all groups
        const groupIds = formattedGroups.map(g => g.id)
        if (groupIds.length > 0) {
          joinGroups(groupIds)
        }
      } catch (e) {

        toast({ title: "Error", description: "Failed to load groups", variant: "destructive" })
      }
    }

    if (user) {
      fetchGroups()
    }
  }, [user, toast, joinGroups])

  // Ensure we join groups when socket connects
  useEffect(() => {
    if (isConnected && groups.length > 0) {
      const groupIds = groups.map(g => g.id)
      const conversationIds = groups.map(g => g.conversationId).filter(Boolean) as string[]
      if (groupIds.length > 0) {
        joinGroups(groupIds)
      }
      if (conversationIds.length > 0) {
        joinConversations(conversationIds)
      }
    }
  }, [isConnected, groups, joinGroups, joinConversations])

  // Load messages when a group is selected
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedGroup) return

      try {
        // First ensure we have a conversation for this group
        let convId = selectedGroup.conversationId
        if (!convId) {
          const convRes = await conversationAPI.upsertGroup(selectedGroup.id)
          convId = convRes.data?.data?._id

          setGroups(prev => prev.map(g =>
            g.id === selectedGroup.id ? { ...g, conversationId: convId } : g
          ))
        }

        if (convId) {
          joinConversations([convId])
          const msgsRes = await conversationAPI.listMessages(convId)
          const msgs = msgsRes.data?.data || []
          const formattedMsgs: GroupMessage[] = msgs.map((m: any) => toChatMessage(m, currentUserId, selectedGroup))
          formattedMsgs.forEach((msg) => processedMessageIds.current.add(msg.id))

          setSelectedGroup(prev => prev ? { ...prev, messages: formattedMsgs, conversationId: convId } : null)
        }
      } catch (e) {

      }
    }

    loadMessages()
  }, [selectedGroup?.id, currentUserId, joinConversations])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (e: any) => {
      const detail = e.detail || {}
      const msg = detail.message || {}
      const msgId = String(msg._id || '')

      if (!msgId) return

      if (processedMessageIds.current.has(msgId)) {
        return
      }
      processedMessageIds.current.add(msgId)

      const { conversationId } = detail

      const targetGroup = groups.find((group) => group.conversationId === conversationId) || selectedGroup
      const newMsg = toChatMessage(msg, currentUserId, targetGroup)
      appendMessageToGroup(String(conversationId || ""), newMsg)
    }

    const handleGroupCreated = (newGroup: any) => {
      // Add to list and join room
      const group: Group = {
        id: newGroup._id,
        name: newGroup.name,
        memberCount: newGroup.members.length,
        members: (newGroup.members || []).map((member: any) => ({
          id: getUserId(member?.user),
          name: getDisplayName(member?.user),
          username: member?.user?.username,
          avatar: member?.user?.avatar,
        })),
        messages: [],
        unreadCount: 0,
        lastMessageTime: ""
      }
      setGroups(prev => [group, ...prev])
      joinGroups([group.id])
    }

    // Listen to window events dispatched by socket-context
    const onMessage = (e: any) => handleNewMessage(e)

    window.addEventListener('socket:message:new', onMessage)
    // We might need a specific event for group creation if it comes via socket
    // socket.on('group_created', handleGroupCreated) 
    // But socket-context doesn't dispatch group_created to window yet, let's add it there or use socket directly if exposed.
    // The socket object is exposed, so we can use it directly.

    socket.on('group_created', handleGroupCreated)

    return () => {
      window.removeEventListener('socket:message:new', onMessage)
      socket.off('group_created', handleGroupCreated)
    }
  }, [socket, currentUserId, selectedGroup, selectedGroup?.id, joinGroups, groups])


  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSendMessage = async () => {
    const text = message.trim()
    if (!text || !selectedGroup || !selectedGroup.conversationId || isSending) return

    try {
      setIsSending(true)
      setMessage("")
      const res = await conversationAPI.sendMessage({
        conversationId: selectedGroup.conversationId,
        text
      })

      const msg = res.data?.data
      const newMsg = toChatMessage(msg, currentUserId, selectedGroup)
      processedMessageIds.current.add(newMsg.id)
      appendMessageToGroup(selectedGroup.conversationId, newMsg)
    } catch (e) {
      setMessage(text)
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleGroupCreated = (newGroupData: any) => {
    // This is called by the dialog callback, but we also listen to socket.
    // We can just let the socket handle it to avoid duplication, or handle it here if socket is slow.
    // For now, let's rely on the dialog callback for immediate feedback
    const newGroup: Group = {
      id: newGroupData._id,
      name: newGroupData.name,
      avatar: undefined,
      lastMessageTime: "now",
      unreadCount: 0,
      memberCount: newGroupData.members.length,
      members: (newGroupData.members || []).map((member: any) => ({
        id: getUserId(member?.user),
        name: getDisplayName(member?.user),
        username: member?.user?.username,
        avatar: member?.user?.avatar,
      })),
      messages: []
    }

    // Check if already added by socket
    setGroups(prev => {
      if (prev.find(g => g.id === newGroup.id)) return prev
      return [newGroup, ...prev]
    })
    setSelectedGroup(newGroup)
    joinGroups([newGroup.id])
  }

  const showGroupList = !isMobile || !selectedGroup

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] h-full gap-3 sm:gap-4 min-h-[520px]">
      {/* Groups Sidebar */}
      <div className={cn("flex flex-col", showGroupList ? "block" : "hidden lg:block")}>
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
            <ScrollArea className="h-[55dvh] lg:h-[calc(100vh-18rem)]">
              <div className="space-y-1 p-3">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedGroup?.id === group.id && "bg-muted"
                      )}
                      onClick={() => setSelectedGroup(group)}
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
                          {group.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {group.lastMessageTime}
                            </span>
                          )}
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
      <div className={cn("flex flex-col min-w-0", showGroupList ? "hidden lg:flex" : "flex")}>
        <KanbanCard className="flex-1 flex flex-col">
          {selectedGroup ? (
            <>
              {/* Chat Header */}
              <KanbanCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isMobile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedGroup(null)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    )}
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
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </KanbanCardHeader>

              <Separator />

              {/* Messages Area */}
              <KanbanCardContent className="flex-1 p-0">
                <ScrollArea className="h-[58dvh] lg:h-[calc(100vh-20rem)] p-3 sm:p-4">
                  {selectedGroup.messages.length > 0 ? (
                    <div className="space-y-4">
                      {selectedGroup.messages.map((msg, index) => {
                        const showAvatar = index === 0 || selectedGroup.messages[index - 1].senderId !== msg.senderId

                        return (
                          <div
                            key={`${msg.id}-${index}`}
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
                                    {msg.senderId === 'system' ? 'SYS' : (msg.senderName || "U").split(' ').map(n => n[0]).join('').toUpperCase()}
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
                                    ? "bg-emerald-600 text-emerald-50"
                                    : "bg-blue-900/75 text-blue-50"
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
                  <Button onClick={handleSendMessage} disabled={!message.trim() || isSending}>
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
    </div>
  )
}
