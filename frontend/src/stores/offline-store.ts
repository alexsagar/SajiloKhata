 import { create } from "zustand"

 export type QueuedRequest = {
   id: string
   url: string
   method: string
   body?: unknown
   headers?: Record<string, string>
   createdAt: number
 }

 type OfflineState = {
   isOnline: boolean
   queue: QueuedRequest[]
   setOnline: (v: boolean) => void
   enqueue: (req: QueuedRequest) => void
   dequeue: (id: string) => void
   clear: () => void
 }

 export const useOfflineStore = create<OfflineState>((set) => ({
   isOnline: true,
   queue: [],
   setOnline: (v) => set({ isOnline: v }),
   enqueue: (req) => set((s) => ({ queue: [...s.queue, req] })),
   dequeue: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),
   clear: () => set({ queue: [] }),
 }))

