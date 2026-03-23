"use client"

import { useState, useRef, useEffect, useCallback } from "react"
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
  RefreshCw,
  Loader2,
  ChevronLeft
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
  _status?: 'sending' | 'sent' | 'error'  // optimistic send status
  _tempId?: string                          // for reconciliation
}

interface Conversation {
  id: string
  friend: Friend
  lastMessage?: DirectMessage
  unreadCount: number
  messages: DirectMessage[]
}

interface UserLike {
  _id?: string
  id?: string
  firstName?: string
  lastName?: string
  username?: string
  email?: string
  avatar?: string
}

interface FriendApiRecord extends UserLike {
  _id: string
  email: string
}

interface ConversationApiRecord {
  _id?: string
  id?: string
  type?: string
  participants?: Array<UserLike | string>
  unreadCount?: number
}

interface MessageApiRecord {
  _id?: string
  id?: string
  sender?: UserLike | string
  text?: string
  createdAt?: string
}

interface ConversationEventDetail {
  conversationId?: string
}

interface MessageEventDetail extends ConversationEventDetail {
  message?: MessageApiRecord
}

interface TypingEventDetail extends ConversationEventDetail {
  userId?: string
}

interface WindowSocketEvent<T> extends Event {
  detail?: T
}

interface ApiErrorLike {
  message?: string
  response?: {
    data?: {
      message?: string
    }
  }
}

// Empty initial data - will be populated from API
const mockFriends: Friend[] = []
const mockConversations: Conversation[] = []

// Keep track of processed message IDs across component remounts (React Strict Mode)
const processedMessageIds = new Set<string>()

// Track messages currently being added to prevent React Strict Mode double-invocation from creating duplicates
const messagesBeingAdded = new Set<string>()
const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i

function getSenderId(sender: UserLike | string | null | undefined) {
  if (typeof sender === "string") {
    return sender
  }
  return String(sender?._id || sender?.id || "")
}

function formatMessageTime(value?: string) {
  return new Date(value || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function DirectMessages() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [friends, setFriends] = useState<Friend[]>(mockFriends)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({})
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({})
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTypingEmitRef = useRef<number>(0)

  useEffect(() => {
    // Component mount effect
    return () => {
      // Cleanup
    }
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
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
  const isServerConversationId = useCallback((id: string) => MONGO_OBJECT_ID_REGEX.test(String(id || "")), [])
  const currentUserId = getSenderId(user as UserLike | undefined)

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
        const mappedFriends: Friend[] = friendsData.map((u: FriendApiRecord) => ({
          id: u._id,
          name: [u.firstName, u.lastName].filter(Boolean).join(" "),
          email: u.email,
          avatar: u.avatar || undefined,
          isOnline: false,
        }))
        setFriends(mappedFriends)

        const convs = Array.isArray(convsRes.data?.data) ? convsRes.data.data : []
        const dmConvs: Conversation[] = convs
          .filter((c: ConversationApiRecord) => c.type === "dm")
          .map((c: ConversationApiRecord) => {
            // Participants may be populated objects (with firstName etc.) or plain ObjectId strings
            const participants = c.participants || []
            const otherParticipant = participants.find((p) => {
              const pid = typeof p === 'object' ? String(p._id) : String(p)
              return pid !== currentUserId
            })
            const otherId = typeof otherParticipant === 'object'
              ? String(otherParticipant._id)
              : String(otherParticipant || '')

            // Derive friend name: populated participant data → friends list → fallback
            let friendName = 'Friend'
            let friendEmail = ''
            let friendAvatar: string | undefined

            if (typeof otherParticipant === 'object' && otherParticipant) {
              const p = otherParticipant
              friendName = [p.firstName, p.lastName].filter(Boolean).join(' ')
                || p.username || p.email || 'Friend'
              friendEmail = p.email || ''
              friendAvatar = p.avatar || undefined
            }

            // Also try friends list as enrichment (may have fresher data)
            const friendFromList = mappedFriends.find((f) => f.id === otherId)
            if (friendFromList) {
              friendName = friendFromList.name || friendName
              friendEmail = friendFromList.email || friendEmail
              friendAvatar = friendFromList.avatar || friendAvatar
            }

            const friendFallback: Friend = {
              id: otherId || 'unknown',
              name: friendName,
              email: friendEmail,
              avatar: friendAvatar,
              isOnline: false,
            }
            const conv: Conversation = {
              id: String(c._id),
              friend: friendFallback,
              unreadCount: c.unreadCount || 0,  // from server
              messages: [],
            }
            return conv
          })

        // Also list friends without existing conv as empty conversations to show them
        const conversationsMerged: Conversation[] = [
          ...dmConvs,
          ...mappedFriends
            .filter((f) => !dmConvs.some((c) => c.friend.id === f.id))
            .map((f) => ({ id: `local-${f.id}`, friend: f, unreadCount: 0, messages: [] })),
        ]

        setConversations(conversationsMerged)
        // Join all existing DM conversations for real-time messages
        const idsToJoin = dmConvs.map((c) => c.id).filter((id) => !String(id).startsWith("local-"))
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
          } catch (e: unknown) {
            const error = e as ApiErrorLike
            console.error('[Chat] DM upsert error:', error?.message)
            toast({ title: 'Could not open conversation', variant: 'destructive' })
          }
        }
      } catch (e: unknown) {
        const error = e as ApiErrorLike
        console.error('[Chat] Failed to load conversations:', error?.message)
        toast({ title: 'Failed to load chats', description: 'Please refresh the page.', variant: 'destructive' })
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [currentUserId, joinConversations, searchParams, toast])

  // Ensure we join conversations when socket connects
  useEffect(() => {
    if (isConnected && conversations.length > 0) {
      const idsToJoin = conversations.map((c) => c.id).filter((id) => !String(id).startsWith("local-"))

      if (idsToJoin.length > 0) {
        joinConversations(idsToJoin)
      }
    }
  }, [isConnected, conversations, conversations.length, joinConversations])

  // Use refs for stable event handler references
  const handleNewMessageRef = useRef<((e: WindowSocketEvent<MessageEventDetail>) => void) | undefined>(undefined)

  // Update the handler refs when dependencies change
  useEffect(() => {
    handleNewMessageRef.current = (e: WindowSocketEvent<MessageEventDetail>) => {

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
      const senderId = getSenderId(msg.sender)
      const isFromCurrentUser = !!(currentUserId && senderId === currentUserId)

      const newMsg: DirectMessage = {
        id: String(msg._id || Date.now()),
        senderId: senderId,
        senderName: isFromCurrentUser ? 'You' : '',
        content: msg.text || '',
        timestamp: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: isFromCurrentUser,
        _status: 'sent',
      }

      setConversations((prev) => {
        // Guard against React Strict Mode calling updater twice
        if (messagesBeingAdded.has(msgId)) {
          return prev
        }

        const existingIndex = prev.findIndex((c) => String(c.id) === convId)

        if (existingIndex === -1) {
          // Remove any local placeholder conversation for this friend
          const friendId = senderId
          const withoutLocal = prev.filter((c) => c.id !== `local-${friendId}`)

          const friend = friends.find((f) => f.id === friendId) || {
            id: friendId || 'unknown',
            name: 'Friend',
            email: '',
            isOnline: false,
          } as Friend
          const created: Conversation = { id: convId, friend, unreadCount: 0, messages: [newMsg], lastMessage: newMsg }

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
        const pendingIndex = existing.messages.findIndex(
          (m) =>
            m.isCurrentUser &&
            m._status === 'sending' &&
            m.content === newMsg.content
        )
        const nextMessages =
          pendingIndex >= 0
            ? existing.messages.map((m, idx) => (idx === pendingIndex ? newMsg : m))
            : [...existing.messages, newMsg]

        updated[existingIndex] = {
          ...existing,
          messages: nextMessages,
          lastMessage: newMsg
        }

        // Also remove any duplicate conversations with the same ID (cleanup)
        return updated.filter((c, idx) => idx === existingIndex || String(c.id) !== convId)
      })

      setSelectedConversation((prev) => {
        if (prev && String(prev.id) === convId) {
          if (prev.messages.some(m => String(m.id) === String(newMsg.id))) return prev
          const pendingIndex = prev.messages.findIndex(
            (m) =>
              m.isCurrentUser &&
              m._status === 'sending' &&
              m.content === newMsg.content
          )
          const nextMessages =
            pendingIndex >= 0
              ? prev.messages.map((m, idx) => (idx === pendingIndex ? newMsg : m))
              : [...prev.messages, newMsg]
          return { ...prev, messages: nextMessages, lastMessage: newMsg }
        }
        return prev
      })
    }
  }, [currentUserId, friends])

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
    const handleNewMessage = (e: Event) => handleNewMessageRef.current?.(e as WindowSocketEvent<MessageEventDetail>)

    // Listen for read receipts
    const handleReadReceipt = (e: Event) => {
      const event = e as WindowSocketEvent<ConversationEventDetail>
      const detail = event.detail || {}
      const convId = String(detail.conversationId || '')
      if (!convId) return
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, unreadCount: 0 } : c
      ))
    }

    // Listen for typing indicators
    const handleTypingStart = (e: Event) => {
      const event = e as WindowSocketEvent<TypingEventDetail>
      const { conversationId, userId } = event.detail || {}
      if (!conversationId || !userId) return
      setTypingUsers(prev => {
        const current = prev[conversationId] || []
        if (current.includes(userId)) return prev
        return { ...prev, [conversationId]: [...current, userId] }
      })
    }
    const handleTypingStop = (e: Event) => {
      const event = e as WindowSocketEvent<TypingEventDetail>
      const { conversationId, userId } = event.detail || {}
      if (!conversationId || !userId) return
      setTypingUsers(prev => {
        const current = prev[conversationId] || []
        return { ...prev, [conversationId]: current.filter(id => id !== userId) }
      })
    }

    window.addEventListener("socket:message:new", handleNewMessage)
    window.addEventListener("socket:conversation:read", handleReadReceipt)
    window.addEventListener("socket:typing:start", handleTypingStart)
    window.addEventListener("socket:typing:stop", handleTypingStop)

    return () => {
      window.removeEventListener("socket:message:new", handleNewMessage)
      window.removeEventListener("socket:conversation:read", handleReadReceipt)
      window.removeEventListener("socket:typing:start", handleTypingStart)
      window.removeEventListener("socket:typing:stop", handleTypingStop)
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

    const selectedConvId = String(selectedConversation.id)
    let convId = selectedConvId
    const friendId = String(selectedConversation.friend?.id || "")
    if (!isServerConversationId(convId) && friendId) {
      try {
        const upsert = await conversationAPI.upsertDM(friendId)
        const ensuredId = String(upsert.data?.data?._id || upsert.data?.data?.id || "")
        if (!ensuredId) {
          throw new Error("Unable to create conversation")
        }
        convId = ensuredId
        joinConversations([convId])
        setConversations((prev) =>
          prev.map((c) => (String(c.id) === selectedConvId ? { ...c, id: convId } : c))
        )
        setSelectedConversation((prev) =>
          prev && String(prev.id) === selectedConvId ? { ...prev, id: convId } : prev
        )
      } catch (e: unknown) {
        const error = e as ApiErrorLike
        toast({
          title: "Failed to open chat",
          description: error?.response?.data?.message || error?.message || "",
          variant: "destructive",
        })
        return
      }
    }

    const text = message.trim()
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Optimistic: show message immediately
    const optimisticMsg: DirectMessage = {
      id: tempId,
      senderId: currentUserId || "current",
      senderName: 'You',
      senderAvatar: (user as UserLike | undefined)?.avatar || '',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true,
      _status: 'sending',
      _tempId: tempId,
    }

    setConversations(prev => prev.map(conv =>
      conv.id === convId
        ? { ...conv, messages: [...conv.messages, optimisticMsg], lastMessage: optimisticMsg }
        : conv
    ))
    setSelectedConversation(prev =>
      prev && prev.id === convId
        ? { ...prev, messages: [...prev.messages, optimisticMsg], lastMessage: optimisticMsg }
        : prev
    )
    setMessage("")

    const startTime = Date.now()

    try {
      const res = await conversationAPI.sendMessage({ conversationId: convId, text })
      const duration = Date.now() - startTime
      console.log(`[Metrics] Message send latency: ${duration}ms`)

      const msgData = res.data?.data || {}
      const serverId = String(msgData._id || Date.now())

      // Pre-register to prevent echo duplication
      if (msgData._id) processedMessageIds.add(String(msgData._id))

      // Reconcile: replace temp message with server message
      const reconciledMsg: DirectMessage = {
        id: serverId,
        senderId: getSenderId(msgData.sender) || optimisticMsg.senderId,
        senderName: 'You',
        senderAvatar: (user as UserLike | undefined)?.avatar || '',
        content: msgData.text || text,
        timestamp: new Date(msgData.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: true,
        _status: 'sent',
      }

      setConversations(prev => prev.map(conv =>
        conv.id === convId
          ? { ...conv, messages: conv.messages.map(m => m.id === tempId ? reconciledMsg : m), lastMessage: reconciledMsg }
          : conv
      ))
      setSelectedConversation(prev =>
        prev && prev.id === convId
          ? { ...prev, messages: prev.messages.map(m => m.id === tempId ? reconciledMsg : m), lastMessage: reconciledMsg }
          : prev
      )
    } catch (e: unknown) {
      const error = e as ApiErrorLike
      // Mark as failed — user can retry
      setConversations(prev => prev.map(conv =>
        conv.id === convId
          ? { ...conv, messages: conv.messages.map(m => m.id === tempId ? { ...m, _status: 'error' as const } : m) }
          : conv
      ))
      setSelectedConversation(prev =>
        prev && prev.id === convId
          ? { ...prev, messages: prev.messages.map(m => m.id === tempId ? { ...m, _status: 'error' as const } : m) }
          : prev
      )
      toast({ title: "Failed to send", description: error?.response?.data?.message || "", variant: "destructive" })
    }
  }

  // Retry a failed message
  const handleRetryMessage = async (failedMsg: DirectMessage) => {
    if (!selectedConversation) return
    const selectedConvId = String(selectedConversation.id)
    let convId = selectedConvId
    const friendId = String(selectedConversation.friend?.id || "")
    if (!isServerConversationId(convId) && friendId) {
      try {
        const upsert = await conversationAPI.upsertDM(friendId)
        const ensuredId = String(upsert.data?.data?._id || upsert.data?.data?.id || "")
        if (!ensuredId) {
          throw new Error("Unable to create conversation")
        }
        convId = ensuredId
        joinConversations([convId])
        setConversations((prev) =>
          prev.map((c) => (String(c.id) === selectedConvId ? { ...c, id: convId } : c))
        )
        setSelectedConversation((prev) =>
          prev && String(prev.id) === selectedConvId ? { ...prev, id: convId } : prev
        )
      } catch (e: unknown) {
        const error = e as ApiErrorLike
        toast({
          title: 'Retry failed',
          description: error?.response?.data?.message || error?.message || '',
          variant: 'destructive',
        })
        return
      }
    }

    const tempId = failedMsg.id

    // Mark as sending again
    const updateStatus = (status: 'sending' | 'sent' | 'error') => {
      setConversations(prev => prev.map(conv =>
        conv.id === convId
          ? { ...conv, messages: conv.messages.map(m => m.id === tempId ? { ...m, _status: status } : m) }
          : conv
      ))
      setSelectedConversation(prev =>
        prev && prev.id === convId
          ? { ...prev, messages: prev.messages.map(m => m.id === tempId ? { ...m, _status: status } : m) }
          : prev
      )
    }

    updateStatus('sending')
    try {
      const res = await conversationAPI.sendMessage({ conversationId: convId, text: failedMsg.content })
      const msgData = res.data?.data || {}
      if (msgData._id) processedMessageIds.add(String(msgData._id))

      const reconciledMsg: DirectMessage = {
        id: String(msgData._id || Date.now()),
        senderId: getSenderId(msgData.sender) || failedMsg.senderId,
        senderName: 'You',
        senderAvatar: failedMsg.senderAvatar,
        content: msgData.text || failedMsg.content,
        timestamp: new Date(msgData.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: true,
        _status: 'sent',
      }

      setConversations(prev => prev.map(conv =>
        conv.id === convId
          ? { ...conv, messages: conv.messages.map(m => m.id === tempId ? reconciledMsg : m) }
          : conv
      ))
      setSelectedConversation(prev =>
        prev && prev.id === convId
          ? { ...prev, messages: prev.messages.map(m => m.id === tempId ? reconciledMsg : m) }
          : prev
      )
    } catch (e: unknown) {
      const error = e as ApiErrorLike
      updateStatus('error')
      toast({ title: 'Retry failed', description: error?.response?.data?.message || '', variant: 'destructive' })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Throttled typing emit
  const emitTyping = useCallback(() => {
    if (!socket || !isConnected || !selectedConversation) return
    const now = Date.now()
    if (now - lastTypingEmitRef.current < 2000) return  // throttle 2s
    lastTypingEmitRef.current = now
    socket.emit('typing:start', { conversationId: selectedConversation.id })

    // Auto-stop after 3s of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: selectedConversation.id })
    }, 3000)
  }, [socket, isConnected, selectedConversation])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    emitTyping()
  }

  // Infinite scroll: load older messages
  const loadOlderMessages = async () => {
    if (!selectedConversation || loadingMore) return
    const convId = selectedConversation.id
    if (!isServerConversationId(String(convId)) || hasMore[convId] === false) return
    const msgs = selectedConversation.messages
    if (msgs.length === 0) return

    // oldestCreatedAt unused — we use API cursor instead
    // const oldestCreatedAt = msgs[0]?.timestamp
    // Use the oldest message ID to find cursor — we stored ISO string in load
    // Better: use the raw createdAt from the original data
    // For now, use the API cursor param
    const oldestMsg = msgs.find(m => !m.id.startsWith('temp-'))
    if (!oldestMsg) return

    setLoadingMore(true)
    try {
      const scrollEl = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null
      const prevScrollHeight = scrollEl?.scrollHeight || 0

      const res = await conversationAPI.getMessages(convId, { limit: 30 })
      const allData = res.data?.data || []
      const nextCursor = res.data?.nextCursor

      if (!nextCursor) setHasMore(prev => ({ ...prev, [convId]: false }))

      const olderMsgs: DirectMessage[] = allData.map((msg: MessageApiRecord) => ({
        id: String(msg._id),
        senderId: getSenderId(msg.sender),
        senderName: getSenderId(msg.sender) === currentUserId ? 'You' : selectedConversation.friend.name,
        senderAvatar: selectedConversation.friend.avatar,
        content: msg.text || '',
        timestamp: formatMessageTime(msg.createdAt),
        isCurrentUser: getSenderId(msg.sender) === currentUserId,
        _status: 'sent' as const,
      }))

      // Merge: deduplicate by ID, replace entire message list
      const existingIds = new Set(msgs.map(m => m.id))
      const uniqueOlder = olderMsgs.filter(m => !existingIds.has(m.id))
      const merged = [...uniqueOlder, ...msgs]

      setSelectedConversation(prev =>
        prev && prev.id === convId ? { ...prev, messages: merged } : prev
      )
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: merged } : c
      ))

      // Restore scroll position
      requestAnimationFrame(() => {
        if (scrollEl) {
          const newScrollHeight = scrollEl.scrollHeight
          scrollEl.scrollTop = newScrollHeight - prevScrollHeight
        }
      })
    } catch (e: unknown) {
      const error = e as ApiErrorLike
      console.error('[Chat] Load older messages error:', error?.message)
    } finally {
      setLoadingMore(false)
    }
  }

  const startNewConversation = (friend: Friend) => {
    const newConversation: Conversation = {
      id: `local-${friend.id}`,
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

  const markConversationAsRead = async (conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
    ))
    // Fire API call (non-blocking)
    if (isServerConversationId(conversationId)) {
      conversationAPI.markAsRead(conversationId).catch(err => {
        console.error('[Chat] markAsRead error:', err?.message)
      })
    }
  }

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation || !isServerConversationId(String(selectedConversation.id))) return

    const loadMessages = async () => {
      try {

        const res = await conversationAPI.getMessages(selectedConversation.id)
        const messagesData = res.data?.data || []

        const loadedMessages: DirectMessage[] = messagesData.map((msg: MessageApiRecord) => ({
          id: String(msg._id),
          senderId: getSenderId(msg.sender),
          senderName: getSenderId(msg.sender) === currentUserId ? 'You' : selectedConversation.friend.name,
          senderAvatar: selectedConversation.friend.avatar,
          content: msg.text || '',
          timestamp: formatMessageTime(msg.createdAt),
          isCurrentUser: getSenderId(msg.sender) === currentUserId,
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
      } catch (error: unknown) {
        const apiError = error as ApiErrorLike
        console.error('[Chat] Load messages error:', apiError?.message)
        toast({ title: 'Failed to load messages', description: 'Tap to retry.', variant: 'destructive' })
      }
    }

    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, isServerConversationId, selectedConversation?.friend.avatar, selectedConversation?.friend.name, selectedConversation?.id, toast])

  const showConversationList = !isMobile || !selectedConversation

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 h-full min-h-[520px]">
      {/* Conversations List */}
      <div className={cn("lg:col-span-1", showConversationList ? "block" : "hidden lg:block")}>
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
            <ScrollArea className="h-[55dvh] lg:h-[calc(100vh-24rem)]">
              <div className="space-y-1 p-2">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-muted/80 group",
                        selectedConversation?.id === conversation.id && "bg-primary/10 ring-2 ring-primary/20"
                      )}
                      onClick={() => {
                        setSelectedConversation(conversation)
                        markConversationAsRead(conversation.id)
                      }}
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
                      No friends match your search &quot;{searchTerm}&quot;
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </KanbanCardContent>
        </KanbanCard>
      </div>

      {/* Chat Area */}
      <div className={cn("lg:col-span-2 flex flex-col", showConversationList ? "hidden lg:flex" : "flex")}>
        <KanbanCard className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <KanbanCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isMobile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    )}
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
                        {selectedConversation.friend.lastSeen || "Direct message"}
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
                <ScrollArea ref={scrollAreaRef} className="h-[58dvh] lg:h-[calc(100vh-26rem)] p-3 bg-gradient-to-b from-transparent via-muted/10 to-transparent"
                  onScrollCapture={(e: React.UIEvent<HTMLDivElement>) => {
                    const el = e.target as HTMLElement
                    if (el.scrollTop < 60 && !loadingMore) {
                      loadOlderMessages()
                    }
                  }}
                >
                  {loadingMore && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
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
                                    ? msg._status === 'error'
                                      ? "bg-destructive/80 text-destructive-foreground rounded-br-md"
                                      : msg._status === 'sending'
                                        ? "bg-emerald-600/55 text-emerald-50 rounded-br-md"
                                        : "bg-emerald-600 text-emerald-50 rounded-br-md"
                                    : "bg-blue-900/75 text-blue-50 rounded-bl-md"
                                )}
                              >
                                {msg.content}
                              </div>
                              {/* Status indicator */}
                              {msg.isCurrentUser && msg._status === 'sending' && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                  <span className="text-[10px] text-muted-foreground">Sending...</span>
                                </div>
                              )}
                              {msg.isCurrentUser && msg._status === 'error' && (
                                <button
                                  className="flex items-center gap-1 mt-0.5 text-destructive hover:underline cursor-pointer"
                                  onClick={() => handleRetryMessage(msg)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  <span className="text-[10px]">Failed — tap to retry</span>
                                </button>
                              )}
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

              {/* Typing Indicator */}
              {selectedConversation && (typingUsers[selectedConversation.id] || []).length > 0 && (
                <div className="px-4 py-1 text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </span>
                  <span>{selectedConversation.friend.name} is typing...</span>
                </div>
              )}

              {/* Message Input */}
              <div className="p-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    onBlur={() => {
                      if (socket && isConnected && selectedConversation) {
                        socket.emit('typing:stop', { conversationId: selectedConversation.id })
                      }
                    }}
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
                      <p className="text-xs text-muted-foreground">{friend.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <h4 className="font-medium mb-1 text-sm">No available friends</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  You&apos;re already chatting with all your friends or haven&apos;t added any yet
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
