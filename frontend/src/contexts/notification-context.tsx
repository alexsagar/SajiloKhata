"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { notificationAPI } from "@/lib/api"
import { useAuth } from "./auth-context"
import type { Notification } from "@/types/notification"

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  refreshNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const auth = useAuth()
  const isAuthenticated = auth?.isAuthenticated || false
  const [disabled, setDisabled] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!isAuthenticated || !auth || disabled) return
    refreshNotifications()
  }, [isAuthenticated, auth, disabled])

  const refreshNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications()
      const data = response?.data
      const list = data?.notifications || data?.data?.notifications || []
      const normalized = Array.isArray(list)
        ? list.map((n: any) => ({
            ...n,
            id: n?.id || n?._id || String(n?._id || n?.id || ''),
          }))
        : []
      setNotifications(normalized)
    } catch (error: any) {
      // Avoid spamming errors in console if the endpoint is not available
      if (process.env.NODE_ENV !== 'production') {
        console.error("Failed to fetch notifications:", error)
      }
      // Temporarily disable further fetch attempts for this session
      setDisabled(true)
      // Re-enable after 5 minutes
      if (typeof window !== 'undefined') {
        setTimeout(() => setDisabled(false), 5 * 60 * 1000)
      }
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await notificationAPI.deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
