 import { create } from "zustand"

 export type UINotification = {
   id: string
   title: string
   message?: string
   createdAt: number
   read?: boolean
   type?: "info" | "success" | "warning" | "error"
 }

 type NotificationsState = {
   items: UINotification[]
   unreadCount: number
   add: (n: UINotification) => void
   markRead: (id: string) => void
   markAllRead: () => void
   remove: (id: string) => void
   clear: () => void
 }

 export const useNotificationsStore = create<NotificationsState>((set) => ({
   items: [],
   unreadCount: 0,
   add: (n) =>
     set((s) => ({ items: [n, ...s.items], unreadCount: s.unreadCount + (n.read ? 0 : 1) })),
   markRead: (id) =>
     set((s) => ({
       items: s.items.map((x) => (x.id === id ? { ...x, read: true } : x)),
       unreadCount: Math.max(0, s.items.filter((x) => !x.read && x.id !== id).length),
     })),
   markAllRead: () =>
     set((s) => ({ items: s.items.map((x) => ({ ...x, read: true })), unreadCount: 0 })),
   remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
   clear: () => set({ items: [], unreadCount: 0 }),
 }))

