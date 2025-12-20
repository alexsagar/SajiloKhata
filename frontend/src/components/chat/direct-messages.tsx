"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  MessageSquare,
  UserPlus,
  Plus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { friendsAPI, conversationAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useSocket } from "@/contexts/socket-context"

interface Friend {
  id: string
  name: string
  email: string
  avatar?: string
  isOnline: boolean
  lastSeen?: string
}

interface DirectMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: string
  isCurrentUser: boolean
}

interface Conversation {
  id: string
  friend: Friend
  lastMessage?: DirectMessage
  unreadCount: number
  messages: DirectMessage[]
}

// Empty initial data - will be populated from API
const mockFriends: Friend[] = []
const mockConversations: Conversation[] = []

// Keep track of processed message IDs across component remounts (React Strict Mode)
const processedMessageIds = new Set<string>()

// Track messages currently being added to prevent React Strict Mode double-invocation from creating duplicates
const messagesBeingAdded = new Set<string>()

export function DirectMessages() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [friends, setFriends] = useState<Friend[]>(mockFriends)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Component mount effect
    return () => {
      // Cleanup
    }
  }, [])

  // Deduplicate messages in conversations on mount
  useEffect(() => {
    setConversations(prev => prev.map(conv => ({
      ...conv,
      messages: Array.from(new Map(conv.messages.map(m => [m.id, m])).values())
    })))
  }, [])

  const { toast } = useToast()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const { socket, isConnected, onlineUsers, joinConversations } = useSocket()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedConversation?.messages])

  // Load friends and conversations, and optionally open a specific DM from query (?dm=<userId>)
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [friendsRes, convsRes] = await Promise.all([
          friendsAPI.list(),
          conversationAPI.list(),
        ])

        if (!mounted) return

        const friendsData = Array.isArray(friendsRes.data?.data) ? friendsRes.data.data : []
        const mappedFriends: Friend[] = friendsData.map((u: any) => ({
          id: u._id,
          name: [u.firstName, u.lastName].filter(Boolean).join(" "),
          email: u.email,
          avatar: u.avatar || undefined,
          isOnline: false,
        }))
        setFriends(mappedFriends)

        const convs = Array.isArray(convsRes.data?.data) ? convsRes.data.data : []
        const myId = (user as any)?.id || (user as any)?._id
        const dmConvs = convs
          .filter((c: any) => c.type === "dm")
          .map((c: any) => {
            const otherId = (c.participants || []).map((p: any) => String(p)).find((id: string) => id !== String(myId))
            const friend = mappedFriends.find((f) => f.id === otherId)
            const friendFallback: Friend = friend || {
              id: otherId || "unknown",
              name: "Friend",
              email: "",
              avatar: undefined,
              isOnline: false,
            }
            const conv: Conversation = {
              id: String(c._id),
              friend: friendFallback,
              unreadCount: 0,
              messages: [],
            }
            return conv
          })

        // Also list friends without existing conv as empty conversations to show them
        const conversationsMerged: Conversation[] = [
          ...dmConvs,
          ...mappedFriends
            .filter((f) => !dmConvs.some((c: any) => c.friend.id === f.id))
            .map((f) => ({ id: `local-${f.id}`, friend: f, unreadCount: 0, messages: [] })),
        ]

        setConversations(conversationsMerged)
        // Join all existing DM conversations for real-time messages
        const idsToJoin = dmConvs.map((c: any) => c.id).filter((id: any) => !String(id).startsWith("local-"))
        joinConversations(idsToJoin)

        // If ?dm is present, ensure/upsert and select that DM
        const dmUserId = searchParams.get("dm")
        if (dmUserId) {
          try {
            const upsert = await conversationAPI.upsertDM(dmUserId)
            const convId = String(upsert.data?.data?._id || upsert.data?.data?.id)
            const friend = mappedFriends.find((f) => f.id === dmUserId)
            const ensured: Conversation = {
              id: convId || `local-${dmUserId}`,
              friend: friend || {
                id: dmUserId,
                name: "Friend",
                email: "",
                isOnline: false,
              },
              unreadCount: 0,
              messages: [],
            }
            setConversations((prev) => {
              const exists = prev.some((c) => c.id === ensured.id)
              return exists ? prev : [ensured, ...prev]
            })
            // join this conversation's room
            if (convId) joinConversations([convId])
            setSelectedConversation(ensured)
          } catch {
            // ignore
          }
        }
      } catch (e: any) {
        // ignore for now; UI will show empty state
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [searchParams, user])

  // Ensure we join conversations when socket connects
  useEffect(() => {
    if (isConnected && conversations.length > 0) {
      const idsToJoin = conversations.map((c) => c.id).filter((id) => !String(id).startsWith("local-"))
      
      if (idsToJoin.length > 0) {
        joinConversations(idsToJoin)
      }
    }
  }, [isConnected, conversations.length, joinConversations])

  // Use refs for stable event handler references
  const handleNewMessageRef = useRef<((e: any) => void) | undefined>(undefined)
  const handleOnlineRef = useRef<((e: any) => void) | undefined>(undefined)
  const handleOfflineRef = useRef<((e: any) => void) | undefined>(undefined)
  const handlePresenceStateRef = useRef<((e: any) => void) | undefined>(undefined)

  // Update the handler refs when dependencies change
  useEffect(() => {
    handleNewMessageRef.current = (e: any) => {
      
      const detail = e.detail || {}
      const convId = String(detail.conversationId || '')
      const msg = detail.message || {}
      const msgId = String(msg._id || '')
      if (!convId || !msgId) return

      if (processedMessageIds.has(msgId)) {
        
        return
      }
      processedMessageIds.add(msgId)

      

      // Determine if this message is from the current user
      const currentUserId = String((user as any)?._id || (user as any)?.id || '')
      const senderId = String(msg.sender || '')
      const isFromCurrentUser = !!(currentUserId && senderId === currentUserId)

      const newMsg: DirectMessage = {
        id: String(msg._id || Date.now()),
        senderId: senderId,
        senderName: isFromCurrentUser ? 'You' : '',
        content: msg.text || '',
        timestamp: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: isFromCurrentUser,
      }

      setConversations((prev) => {
        // Guard against React Strict Mode calling updater twice
        if (messagesBeingAdded.has(msgId)) {
          return prev
        }

        const existingIndex = prev.findIndex((c) => String(c.id) === convId)

        if (existingIndex === -1) {
          // Remove any local placeholder conversation for this friend
          const friendId = String(msg.sender)
          const withoutLocal = prev.filter((c) => c.id !== `local-${friendId}`)

          const friend = friends.find((f) => f.id === friendId) || {
            id: friendId || 'unknown',
            name: 'Friend',
            email: '',
            isOnline: false,
          } as Friend
          const created: Conversation = { id: convId, friend, unreadCount: 0, messages: [newMsg], lastMessage: newMsg as any }

          messagesBeingAdded.add(msgId)
          setTimeout(() => messagesBeingAdded.delete(msgId), 100) // Cleanup after React finishes

          return [created, ...withoutLocal]
        }

        // Update only the first matching conversation
        const existing = prev[existingIndex]
        if (existing.messages.some(m => String(m.id) === String(newMsg.id))) {
          return prev
        }

        messagesBeingAdded.add(msgId)
        setTimeout(() => messagesBeingAdded.delete(msgId), 100) // Cleanup after React finishes

        const updated = [...prev]
        updated[existingIndex] = {
          ...existing,
          messages: [...existing.messages, newMsg],
          lastMessage: newMsg
        }

        // Also remove any duplicate conversations with the same ID (cleanup)
        return updated.filter((c, idx) => idx === existingIndex || String(c.id) !== convId)
      })

      setSelectedConversation((prev) => {
        if (prev && String(prev.id) === convId) {
          if (prev.messages.some(m => String(m.id) === String(newMsg.id))) return prev
          return { ...prev, messages: [...prev.messages, newMsg], lastMessage: newMsg }
        }
        return prev
      })
    }
  }, [friends, user])

  // Sync online status from SocketContext
  useEffect(() => {
    // Always run this, even if onlineUsers is empty, to ensure we clear status if needed
    setConversations(prev => prev.map(c => {
      const isOnline = onlineUsers.includes(String(c.friend.id))
      return {
        ...c,
        friend: {
          ...c.friend,
          isOnline: isOnline
        }
      }
    }))

    setFriends(prev => prev.map(f => ({
      ...f,
      isOnline: onlineUsers.includes(String(f.id))
    })))

    setSelectedConversation(prev => {
      if (!prev) return null
      return {
        ...prev,
        friend: {
          ...prev.friend,
          isOnline: onlineUsers.includes(String(prev.friend.id))
        }
      }
    })
  }, [onlineUsers, friends.length, conversations.length])

  // Register event listeners ONCE with stable wrapper functions
  useEffect(() => {
    const handleNewMessage = (e: any) => handleNewMessageRef.current?.(e)

    window.addEventListener("socket:message:new", handleNewMessage)

    return () => {
      window.removeEventListener("socket:message:new", handleNewMessage)
    }
  }, []) // Only run once!

  const filteredConversations = conversations.filter(conv =>
    conv.friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableFriends = friends.filter(friend =>
    !conversations.some(conv => conv.friend.id === friend.id)
  )

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversation) return
    try {
      const res = await conversationAPI.sendMessage({ conversationId: selectedConversation.id, text: message.trim() })
      const msgData = res.data?.data || {}
      const msgId = String(msgData._id || Date.now())

      const newMessage: DirectMessage = {
        id: msgId,
        senderId: String(msgData.sender || 'current'),
        senderName: 'You',
        senderAvatar: (user as any)?.avatar || '',
        content: msgData.text || message.trim(),
        timestamp: new Date(msgData.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: true,
      }

      // Add to processed IDs immediately to prevent echo duplication
      if (msgData._id) {
        processedMessageIds.add(String(msgData._id))
      }

      setConversations(prev => prev.map(conv => {
        if (conv.id === selectedConversation.id) {
          // Check if message already exists
          if (conv.messages.some(m => String(m.id) === msgId)) {
            return conv
          }
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: newMessage,
          }
        }
        return conv
      }))

      setSelectedConversation(prev => {
        if (!prev) return null
        // Check if message already exists
        if (prev.messages.some(m => String(m.id) === msgId)) {
          return prev
        }
        return { ...prev, messages: [...prev.messages, newMessage], lastMessage: newMessage }
      })

      setMessage("")
    } catch (e: any) {
      toast({ title: "Failed to send", description: e?.response?.data?.message || "", variant: "destructive" })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startNewConversation = (friend: Friend) => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      friend,
      unreadCount: 0,
      messages: []
    }

    setConversations(prev => [newConversation, ...prev])
    setSelectedConversation(newConversation)
    setIsNewChatOpen(false)

    toast({
      title: "New conversation started",
      description: `You can now chat with ${friend.name}`,
    })
  }

  const markConversationAsRead = (conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
    ))
  }

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation || selectedConversation.id.startsWith('local-')) return

    const loadMessages = async () => {
      try {
        
        const res = await conversationAPI.getMessages(selectedConversation.id)
        const messagesData = res.data?.data || []

        const loadedMessages: DirectMessage[] = messagesData.map((msg: any) => ({
          id: String(msg._id),
          senderId: String(msg.sender),
          senderName: String(msg.sender) === String((user as any)?._id || (user as any)?.id) ? 'You' : selectedConversation.friend.name,
          senderAvatar: selectedConversation.friend.avatar,
          content: msg.text || '',
          timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCurrentUser: String(msg.sender) === String((user as any)?._id || (user as any)?.id),
        }))

        

        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: loadedMessages
        } : null)

        setConversations(prev => prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, messages: loadedMessages }
            : conv
        ))
      } catch (error) {
        
      }
    }

    loadMessages()
  }, [selectedConversation?.id, user])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Conversations List */}
      <div className="lg:col-span-1">
        <KanbanCard className="h-full">
          <KanbanCardHeader className="pb-3">
            <div className="flex items-center justify-between mb-3">
              <KanbanCardTitle className="text-lg">Direct Messages</KanbanCardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search friends..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-full bg-muted/40 border-0 focus-visible:ring-2 focus-visible:ring-primary h-8 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsNewChatOpen(true)}
                  className="h-8 px-3"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </KanbanCardHeader>
          <KanbanCardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-24rem)]">
              <div className="space-y-1 p-2">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-muted/80 group",
                        selectedConversation?.id === conversation.id && "bg-primary/10 ring-2 ring-primary/20"
                      )}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="relative">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={conversation.friend.avatar} />
                          <AvatarFallback>
                            {conversation.friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                          conversation.friend.isOnline ? "bg-green-500" : "bg-gray-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-xs truncate">{conversation.friend.name}</p>
                          {conversation.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {conversation.lastMessage.timestamp}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastMessage?.content || "No messages yet"}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            conversation.friend.isOnline ? "bg-green-500" : "bg-gray-400"
                          )} />
                          {conversation.friend.isOnline ? "Online" : "Offline"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : conversations.length === 0 ? (
                  <div className="text-center py-6">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-base font-medium mb-2">No conversations yet</h3>
                    <p className="text-muted-foreground mb-3 text-sm">
                      Start a conversation with your friends to begin messaging
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setIsNewChatOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Start New Chat
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-base font-medium mb-2">No friends found</h3>
                    <p className="text-muted-foreground text-sm">
                      No friends match your search "{searchTerm}"
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </KanbanCardContent>
        </KanbanCard>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-2 flex flex-col">
        <KanbanCard className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <KanbanCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedConversation.friend.avatar} />
                        <AvatarFallback>
                          {selectedConversation.friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                        selectedConversation.friend.isOnline ? "bg-green-500" : "bg-gray-400"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{selectedConversation.friend.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.friend.isOnline ? "Online" : selectedConversation.friend.lastSeen || "Offline"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Phone className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Video className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </KanbanCardHeader>

              <Separator />

              {/* Messages Area */}
              <KanbanCardContent className="flex-1 p-0">
                <ScrollArea className="h-[calc(100vh-26rem)] p-3 bg-gradient-to-b from-transparent via-muted/10 to-transparent">
                  {selectedConversation.messages.length > 0 ? (
                    <div className="space-y-3">
                      {selectedConversation.messages.map((msg, index) => {
                        const showAvatar =
                          index === 0 || selectedConversation.messages[index - 1].senderId !== msg.senderId

                        return (
                          <div
                            key={`${msg.id}-${index}`}
                            className={cn("flex gap-2", msg.isCurrentUser && "flex-row-reverse")}
                          >
                            <div className="flex flex-col items-center">
                              {showAvatar ? (
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={msg.senderAvatar} />
                                  <AvatarFallback>
                                    {msg.senderName.split(" ").map((n) => n[0]).join("").toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-6 w-6" />
                              )}
                            </div>
                            <div
                              className={cn(
                                "flex flex-col max-w-[70%]",
                                msg.isCurrentUser && "items-end"
                              )}
                            >
                              {showAvatar && (
                                <div
                                  className={cn(
                                    "flex items-center gap-2 mb-1",
                                    msg.isCurrentUser && "flex-row-reverse"
                                  )}
                                >
                                  <span className="text-xs font-medium">{msg.senderName}</span>
                                  <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                                </div>
                              )}
                              <div
                                className={cn(
                                  "px-4 py-2.5 rounded-2xl text-sm max-w-md",
                                  msg.isCurrentUser
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted rounded-bl-md"
                                )}
                              >
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
                        <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-base font-medium mb-2">Start the conversation</h3>
                        <p className="text-muted-foreground text-sm">
                          Send your first message to {selectedConversation.friend.name}
                        </p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </KanbanCardContent>

              <Separator />

              {/* Message Input */}
              <div className="p-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 rounded-full bg-muted/40 border-0 focus-visible:ring-2 focus-visible:ring-primary h-8 text-sm"
                  />
                  <Button onClick={handleSendMessage} disabled={!message.trim()} size="sm" className="h-8 px-3">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">Select a conversation to start chatting</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Choose a friend from the sidebar or start a new conversation to begin messaging
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsNewChatOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </KanbanCard>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="max-w-sm w-auto max-h-[85vh] mx-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-semibold">Start New Conversation</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose a friend to start a direct conversation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {availableFriends.length > 0 ? (
              <div className="space-y-1">
                {availableFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => startNewConversation(friend)}
                  >
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>
                          {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {friend.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-xs">{friend.name}</p>
                      <p className="text-xs text-muted-foreground">{friend.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {friend.isOnline ? (
                          <span className="text-green-600">Online</span>
                        ) : (
                          `Last seen ${friend.lastSeen}`
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <h4 className="font-medium mb-1 text-sm">No available friends</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  You're already chatting with all your friends or haven't added any yet
                </p>
                <Button variant="outline" size="sm" className="h-7 px-2">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Invite Friends
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end pt-1">
            <Button variant="outline" onClick={() => setIsNewChatOpen(false)} size="sm" className="h-8 px-3">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}