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
  const [unreadCount, setUnreadCount] = useState(0)
  const auth = useAuth()
  const isAuthenticated = auth?.isAuthenticated || false
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !auth || disabled) return
    refreshNotifications()
  }, [isAuthenticated, auth, disabled])

  const refreshNotifications = async () => {
    try {
      const [listResponse, unreadResponse] = await Promise.all([
        notificationAPI.getNotifications({ page: 1, limit: 20 }),
        notificationAPI.getUnreadCount(),
      ])
      const data = listResponse?.data
      const list = data?.notifications || data?.data?.notifications || []
      const normalized = Array.isArray(list)
        ? list.map((n: any) => ({
            ...n,
            id: n?.id || n?._id || String(n?._id || n?.id || ''),
            read: Boolean(n?.isRead ?? n?.read),
          }))
        : []
      setNotifications(normalized)
      setUnreadCount(Number(unreadResponse?.data?.unreadCount || 0))
    } catch (error: any) {
      // Avoid spamming errors in console if the endpoint is not available
      if (process.env.NODE_ENV !== 'production') {
        
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
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      
    }
  }

  useEffect(() => {
    const onSocketNotification = () => {
      refreshNotifications()
    }
    window.addEventListener("socket:notification", onSocketNotification)
    return () => window.removeEventListener("socket:notification", onSocketNotification)
  }, [])

  const deleteNotification = async (id: string) => {
    try {
      const deletingUnread = notifications.find((n) => n.id === id && !n.read)
      await notificationAPI.deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (deletingUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      
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
