"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "./auth-context"
import { toast } from "@/hooks/use-toast"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinGroups: (groupIds: string[]) => void
  leaveGroup: (groupId: string) => void
  sendMessage: (groupId: string, message: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user && typeof window !== 'undefined') {
      const token = localStorage.getItem("accessToken")
      if (!token) return

      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
        auth: { token: undefined },
        transports: ["websocket", "polling"],
        withCredentials: true,
        extraHeaders: {
          // nothing; cookies will be sent due to withCredentials
        }
      })

      newSocket.on("connect", () => {
        console.log("Connected to server")
        setIsConnected(true)
      })

      newSocket.on("disconnect", () => {
        console.log("Disconnected from server")
        setIsConnected(false)
      })

      newSocket.on("connect_error", (error) => {
        console.error("Connection error:", error)
        setIsConnected(false)
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
      }
    }
  }, [isAuthenticated, user])

  const joinGroups = (groupIds: string[]) => {
    if (socket && isConnected) {
      socket.emit("join_groups", groupIds)
    }
  }

  const leaveGroup = (groupId: string) => {
    if (socket && isConnected) {
      socket.emit("leave_group", groupId)
    }
  }

  const sendMessage = (groupId: string, message: string) => {
    if (socket && isConnected) {
      socket.emit("send_message", { groupId, message })
    }
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinGroups,
        leaveGroup,
        sendMessage,
      }}
    >
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
