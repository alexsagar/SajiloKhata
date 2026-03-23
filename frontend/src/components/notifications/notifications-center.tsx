"use client"

import type React from "react"

import { useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Bell, Check, CheckCheck, Trash2, Settings } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { useNotifications } from "@/contexts/notification-context"
import type { Notification } from "@/types/notification"

interface NotificationsCenterProps {
  children: React.ReactNode
}

export function NotificationsCenter({ children }: NotificationsCenterProps) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const notificationsList = notifications || []

  const handleMarkAsRead = (id: string) => {
    void markAsRead(id)
  }

  const handleMarkAllAsRead = () => {
    void markAllAsRead()
    toast({
      title: "All notifications marked as read",
    })
  }

  const handleDelete = (id: string) => {
    void deleteNotification(id)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expense_added':
        return '💰'
      case 'expense_updated':
        return '✏️'
      case 'payment_reminder':
        return '⏰'
      case 'group_invite':
        return '👥'
      case 'settlement_request':
        return '🤝'
      case 'expense_approved':
        return '✅'
      default:
        return '📢'
    }
  }

  const getNotificationAction = (notification: Notification) => {
    if (notification.data?.actionUrl) {
      return notification.data.actionUrl
    }
    
    switch (notification.type) {
      case 'expense_added':
      case 'expense_updated':
        return `/expenses/${notification.data?.expenseId}`
      case 'group_invite':
        return `/groups/${notification.data?.groupId}`
      default:
        return null
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          {children}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notifications">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notificationsList.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificationsList.map((notification) => {
                const actionUrl = getNotificationAction(notification)
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm leading-tight">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 leading-tight">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatRelativeTime(notification.createdAt)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(notification.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {actionUrl && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 mt-2 text-xs"
                            asChild
                          >
                            <Link href={actionUrl} onClick={() => setOpen(false)}>
                              View Details →
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {notificationsList.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/notifications" onClick={() => setOpen(false)}>
                  View All Notifications
                </Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
