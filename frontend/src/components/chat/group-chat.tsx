"use client"

import { useState, useRef, useEffect } from "react"
import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Send, Users, Search, MoreVertical, Phone, Video, Plus, MessageSquare } from "lucide-react"
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

interface Group {
  id: string
  name: string
  avatar?: string
  lastMessage?: GroupMessage
  lastMessageTime: string
  unreadCount: number
  memberCount: number
  messages: GroupMessage[]
  conversationId?: string
}

export function GroupChat() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const processedMessageIds = useRef<Set<string>>(new Set())
  const { toast } = useToast()
  const { socket, joinGroups, isConnected } = useSocket()
  const { user } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedGroup?.messages])

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

          try {
            // We might need a better way to batch this or get it from the group list API
            // For now, we'll initialize with empty messages and load on select
          } catch (e) { }

          return {
            id: g._id,
            name: g.name,
            avatar: undefined, // Group avatar not yet implemented in backend
            lastMessage: lastMsg,
            lastMessageTime: "",
            unreadCount: 0,
            memberCount: g.members?.length || 0,
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
        console.error("Failed to fetch groups", e)
        toast({ title: "Error", description: "Failed to load groups", variant: "destructive" })
      }
    }

    if (user) {
      fetchGroups()
    }
  }, [user, toast])

  // Ensure we join groups when socket connects
  useEffect(() => {
    if (isConnected && groups.length > 0) {
      const groupIds = groups.map(g => g.id)
      if (groupIds.length > 0) {
        joinGroups(groupIds)
      }
    }
  }, [isConnected, groups.length, joinGroups])

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
          const msgsRes = await conversationAPI.listMessages(convId)
          const msgs = msgsRes.data?.data || []

          const formattedMsgs: GroupMessage[] = msgs.map((m: any) => ({
            id: m._id,
            senderId: m.sender,
            senderName: "User", // We need to populate this, backend sends ID
            senderAvatar: undefined,
            content: m.text,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isCurrentUser: m.sender === (user as any)._id || m.sender === (user as any).id
          }))

          // We need to fetch sender details if not populated. 
          // For optimization, backend should populate sender.
          // For now, let's assume basic display.

          setSelectedGroup(prev => prev ? { ...prev, messages: formattedMsgs, conversationId: convId } : null)
        }
      } catch (e) {
        console.error("Failed to load messages", e)
      }
    }

    loadMessages()
  }, [selectedGroup?.id, user])

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

      // Find which group this conversation belongs to
      // This is tricky if we don't have the mapping. 
      // Ideally the socket event should include groupId or we map conversationId to groupId.
      // For now, we'll check if the current selected group matches the conversationId

      // Add to processed IDs immediately to prevent echo duplication
      if (msgData._id) {
        processedMessageIds.current.add(String(msgData._id))
      }

      setGroups(prev => prev.map(g => {
        if (g.conversationId === conversationId) {
          if (g.messages.some(m => String(m.id) === String(msg._id))) return g
          const newMsg: GroupMessage = {
            id: msg._id,
            senderId: msg.sender,
            senderName: "User", // Placeholder
            content: msg.text,
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isCurrentUser: msg.sender === (user as any)._id
          }

          // Update selected group if it matches
          if (selectedGroup?.id === g.id) {
            setSelectedGroup(curr => curr ? {
              ...curr,
              messages: [...curr.messages, newMsg],
              lastMessage: newMsg,
              lastMessageTime: newMsg.timestamp
            } : null)
          }

          return {
            ...g,
            messages: [...g.messages, newMsg],
            lastMessage: newMsg,
            lastMessageTime: newMsg.timestamp,
            unreadCount: selectedGroup?.id === g.id ? 0 : g.unreadCount + 1
          }
        }
        return g
      }))
    }

    const handleGroupCreated = (newGroup: any) => {
      // Add to list and join room
      const group: Group = {
        id: newGroup._id,
        name: newGroup.name,
        memberCount: newGroup.members.length,
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
      window.removeEventListener('group_created', handleGroupCreated)
    }
  }, [socket, user, selectedGroup, selectedGroup?.id, joinGroups])


  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedGroup || !selectedGroup.conversationId) return

    try {
      const res = await conversationAPI.sendMessage({
        conversationId: selectedGroup.conversationId,
        text: message.trim()
      })

      const msg = res.data?.data
      const newMsg: GroupMessage = {
        id: msg._id,
        senderId: msg.sender,
        senderName: "You",
        content: msg.text,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: true
      }

      // Optimistic update
      setSelectedGroup(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMsg],
        lastMessage: newMsg,
        lastMessageTime: newMsg.timestamp
      } : null)

      setGroups(prev => prev.map(g =>
        g.id === selectedGroup.id ? {
          ...g,
          messages: [...g.messages, newMsg],
          lastMessage: newMsg,
          lastMessageTime: newMsg.timestamp
        } : g
      ))

      setMessage("")
    } catch (e) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" })
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
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
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
    </div>
  )
}