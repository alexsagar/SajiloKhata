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
    console.log("[SOCKET] useEffect triggered - isAuthenticated:", isAuthenticated, "user:", !!user, "window:", typeof window !== 'undefined')

    if (isAuthenticated && user && typeof window !== 'undefined') {
      console.log("[SOCKET] Initializing socket connection with cookie authentication...")

      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
        transports: ["websocket", "polling"],
        withCredentials: true,
        extraHeaders: {}
      })

      newSocket.on("connect", () => {
        console.log("[SOCKET] ✅ Connected to server! Socket ID:", newSocket.id)
        setIsConnected(true)
        // Emit presence when connected
        newSocket.emit('presence:online')
        // Request current online users
        newSocket.emit('presence:request')
      })

      newSocket.on("disconnect", () => {
        console.log("[SOCKET] ❌ Disconnected from server")
        setIsConnected(false)
        setOnlineUsers([])
      })

      newSocket.on("connect_error", (error) => {
        console.error("[SOCKET] ⚠️ Connection error:", error.message, error)
        setIsConnected(false)
        setOnlineUsers([])
      })

      // Listen for notifications
      newSocket.on("notification", (notification) => {
        toast({
          title: notification.title,
          description: notification.message,
        })
      })

      // Chat message relay for UI to subscribe to
      newSocket.on("message:new", (payload) => {
        window.dispatchEvent(new CustomEvent("socket:message:new", { detail: payload }))
      })

      // Presence handling - Update local state AND dispatch events
      newSocket.on("presence:online", (payload) => {
        const userId = String(payload.userId)
        console.log("[SOCKET] User online:", userId)
        setOnlineUsers(prev => {
          if (prev.includes(userId)) return prev
          return [...prev, userId]
        })
        window.dispatchEvent(new CustomEvent("socket:presence:online", { detail: payload }))
      })

      newSocket.on("presence:offline", (payload) => {
        const userId = String(payload.userId)
        console.log("[SOCKET] User offline:", userId)
        setOnlineUsers(prev => prev.filter(id => id !== userId))
        window.dispatchEvent(new CustomEvent("socket:presence:offline", { detail: payload }))
      })

      newSocket.on("presence:state", (payload) => {
        console.log("[SOCKET] Received presence state:", payload)
        const ids = (payload.onlineUserIds || []).map((id: any) => String(id))
        setOnlineUsers(ids)
        window.dispatchEvent(new CustomEvent("socket:presence:state", { detail: payload }))
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
      console.log("[SOCKET] Cannot join - socket:", !!socket, "isConnected:", isConnected, "ids:", conversationIds)
      return
    }
    console.log("[SOCKET] Joining conversations:", conversationIds)
    conversationIds.forEach(id => socket.emit("conversation:join", { conversationId: id }))
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
