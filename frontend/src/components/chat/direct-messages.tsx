"use client"

import { useState, useRef, useEffect } from "react"
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

export function DirectMessages() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedConversation?.messages])

  const filteredConversations = conversations.filter(conv =>
    conv.friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableFriends = mockFriends.filter(friend =>
    !conversations.some(conv => conv.friend.id === friend.id)
  )

  const handleSendMessage = () => {
    if (!message.trim() || !selectedConversation) return

    const newMessage: DirectMessage = {
      id: Date.now().toString(),
      senderId: 'current',
      senderName: 'You',
      content: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true
    }

    setConversations(prev => prev.map(conv => {
      if (conv.id === selectedConversation.id) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessage: newMessage
        }
      }
      return conv
    }))

    setSelectedConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage],
      lastMessage: newMessage
    } : null)

    setMessage("")
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

  const markAsRead = (conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
    ))
  }

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
                        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all hover:bg-muted/60 hover:shadow-sm group",
                        selectedConversation?.id === conversation.id && "bg-muted ring-1 ring-white/10"
                      )}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={conversation.friend.avatar} />
                          <AvatarFallback>
                            {conversation.friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                          conversation.friend.isOnline ? "bg-green-500" : "bg-gray-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{conversation.friend.name}</p>
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
                        <p className="text-xs text-muted-foreground">
                          {conversation.friend.isOnline ? "Online" : conversation.friend.lastSeen || "Offline"}
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
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedConversation.friend.avatar} />
                        <AvatarFallback>
                          {selectedConversation.friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
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
                            key={msg.id}
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
                                  "rounded-xl px-2 py-1 text-sm shadow-sm ring-1 ring-black/5 dark:ring-white/5",
                                  msg.isCurrentUser
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/70"
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