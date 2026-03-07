"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "./auth-context"
import { toast } from "@/hooks/use-toast"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  onlineUsers: string[]
  joinGroups: (groupIds: string[]) => void
  leaveGroup: (groupId: string) => void
  sendMessage: (groupId: string, message: string) => void
  joinConversations: (conversationIds: string[]) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {


    if (isAuthenticated && user && typeof window !== 'undefined') {


      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
        transports: ["websocket", "polling"],
        withCredentials: true,
        extraHeaders: {}
      })

      newSocket.on("connect", () => {

        setIsConnected(true)
        // Emit presence when connected
        newSocket.emit('presence:online')
        // Request current online users
        newSocket.emit('presence:request')
      })

      newSocket.on("disconnect", () => {

        setIsConnected(false)
        setOnlineUsers([])
      })

      newSocket.on("connect_error", (error) => {

        setIsConnected(false)
        setOnlineUsers([])
      })

      // Listen for notifications
      newSocket.on("notification", (notification) => {
        toast({
          title: notification.title,
          description: notification.message,
        })
        window.dispatchEvent(new CustomEvent("socket:notification", { detail: notification }))
      })

      // Listen for reminder notifications
      newSocket.on("notification:reminder", (payload) => {
        toast({
          title: "Reminder",
          description: payload?.message || "You have an upcoming reminder",
        })
      })

      // Chat message relay for UI to subscribe to
      newSocket.on("message:new", (payload) => {
        window.dispatchEvent(new CustomEvent("socket:message:new", { detail: payload }))
      })

      // Read receipt relay
      newSocket.on("conversation:read", (payload) => {
        window.dispatchEvent(new CustomEvent("socket:conversation:read", { detail: payload }))
      })

      // Typing indicator relay
      newSocket.on("typing:start", (payload) => {
        window.dispatchEvent(new CustomEvent("socket:typing:start", { detail: payload }))
      })
      newSocket.on("typing:stop", (payload) => {
        window.dispatchEvent(new CustomEvent("socket:typing:stop", { detail: payload }))
      })

      // Presence handling - Update local state AND dispatch events
      newSocket.on("presence:online", (payload) => {
        const userId = String(payload.userId)

        setOnlineUsers(prev => {
          if (prev.includes(userId)) return prev
          return [...prev, userId]
        })
        window.dispatchEvent(new CustomEvent("socket:presence:online", { detail: payload }))
      })

      newSocket.on("presence:offline", (payload) => {
        const userId = String(payload.userId)

        setOnlineUsers(prev => prev.filter(id => id !== userId))
        window.dispatchEvent(new CustomEvent("socket:presence:offline", { detail: payload }))
      })

      newSocket.on("presence:state", (payload) => {

        const ids = (payload.onlineUserIds || []).map((id: any) => String(id))
        setOnlineUsers(ids)
        window.dispatchEvent(new CustomEvent("socket:presence:state", { detail: payload }))
      })

      // Friend invite received (recipient sees new pending invite)
      newSocket.on("friend:invited", (payload) => {
        window.dispatchEvent(new CustomEvent("socket:friend:invited", { detail: payload }))
        toast({
          title: "New Friend Invite",
          description: `${payload?.inviter?.firstName || "Someone"} sent you a friend invite!`,
        })
      })

      // Friend invite accepted (inviter sees new friend)
      newSocket.on("friend:accepted", (payload) => {
        window.dispatchEvent(new CustomEvent("socket:friend:accepted", { detail: payload }))
      })

      // Listen for expense updates
      newSocket.on("expense_added", (data) => {
        toast({
          title: "New Expense",
          description: `${data.paidBy.firstName} added "${data.description}" for $${data.amount}`,
        })
      })

      // Listen for expense updates
      newSocket.on("expense_updated", (data) => {
        toast({
          title: "Expense Updated",
          description: `"${data.description}" has been updated`,
        })
      })

      // Listen for group updates
      newSocket.on("group_updated", (data) => {
        toast({
          title: "Group Updated",
          description: `Group "${data.name}" has been updated`,
        })
      })

      // Listen for settlement updates
      newSocket.on("settlement_created", (data) => {
        toast({
          title: "Settlement Created",
          description: `${data.from.firstName} owes ${data.to.firstName} $${data.amount}`,
        })
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
        setSocket(null)
        setIsConnected(false)
        setOnlineUsers([])
      }
    }
  }, [isAuthenticated, user])

  const joinGroups = useCallback((groupIds: string[]) => {
    if (socket && isConnected) {
      socket.emit("join_groups", groupIds)
    }
  }, [socket, isConnected])

  const leaveGroup = useCallback((groupId: string) => {
    if (socket && isConnected) {
      socket.emit("leave_group", groupId)
    }
  }, [socket, isConnected])

  const sendMessage = useCallback((groupId: string, message: string) => {
    if (socket && isConnected) {
      socket.emit("send_message", { groupId, message })
    }
  }, [socket, isConnected])

  const joinConversations = useCallback((conversationIds: string[]) => {
    if (!socket || !isConnected) {
      return
    }
    // Backend expects 'join_conversations' event with array of IDs
    socket.emit("join_conversations", conversationIds)
  }, [socket, isConnected])

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, joinGroups, leaveGroup, sendMessage, joinConversations }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
