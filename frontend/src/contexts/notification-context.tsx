"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { notificationAPI } from "@/lib/api"
import { useAuth } from "./auth-context"
import type { Notification } from "@/types/notification"

type NotificationsEnvelope = {
  notifications?: Notification[]
  data?: {
    notifications?: Notification[]
  }
}

type UnreadCountEnvelope = {
  unreadCount?: number
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const auth = useAuth()
  const isAuthenticated = auth?.isAuthenticated || false
  const [disabled, setDisabled] = useState(false)
  const inflightRef = useRef<Promise<void> | null>(null)

  const refreshNotifications = useCallback(async () => {
    if (inflightRef.current) return inflightRef.current

    const request = (async () => {
      try {
        const [listResponse, unreadResponse] = await Promise.all([
          notificationAPI.getNotifications({ page: 1, limit: 20 }),
          notificationAPI.getUnreadCount(),
        ])
        const data = listResponse?.data as NotificationsEnvelope | undefined
        const list = data?.notifications || data?.data?.notifications || []
        const normalized = Array.isArray(list)
          ? list.map((n) => {
              const raw = n as Notification & { _id?: string }
              return {
                ...n,
                id: raw.id || raw._id || "",
                read: Boolean(raw.isRead ?? raw.read),
              }
            })
          : []
        setNotifications(normalized)
        setUnreadCount(Number((unreadResponse?.data as UnreadCountEnvelope | undefined)?.unreadCount || 0))
      } catch {
        if (process.env.NODE_ENV !== "production") {
        }
        setDisabled(true)
        if (typeof window !== "undefined") {
          setTimeout(() => setDisabled(false), 5 * 60 * 1000)
        }
      } finally {
        inflightRef.current = null
      }
    })()

    inflightRef.current = request
    return request
  }, [])

  useEffect(() => {
    if (!isAuthenticated || disabled) return
    refreshNotifications()
  }, [isAuthenticated, disabled, refreshNotifications])

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      
    }
  }

  useEffect(() => {
    const onSocketNotification = () => {
      void refreshNotifications()
    }
    window.addEventListener("socket:notification", onSocketNotification)
    return () => window.removeEventListener("socket:notification", onSocketNotification)
  }, [refreshNotifications])

  const deleteNotification = async (id: string) => {
    try {
      const deletingUnread = notifications.find((n) => n.id === id && !n.read)
      await notificationAPI.deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (deletingUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      
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
