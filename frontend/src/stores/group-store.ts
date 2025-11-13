 import { create } from "zustand"

 export type Group = {
   id: string
   name: string
   description?: string
   avatarUrl?: string
   memberCount?: number
 }

 type GroupState = {
   groups: Group[]
   currentGroupId: string | null
   isLoading: boolean
   setGroups: (groups: Group[]) => void
   setCurrent: (id: string | null) => void
   upsert: (group: Group) => void
   remove: (id: string) => void
   setLoading: (v: boolean) => void
 }

 export const useGroupStore = create<GroupState>((set) => ({
   groups: [],
   currentGroupId: null,
   isLoading: false,
   setGroups: (groups) => set({ groups }),
   setCurrent: (id) => set({ currentGroupId: id }),
   upsert: (group) =>
     set((s) => ({
       groups: s.groups.some((g) => g.id === group.id)
         ? s.groups.map((g) => (g.id === group.id ? { ...g, ...group } : g))
         : [group, ...s.groups],
     })),
   remove: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
   setLoading: (v) => set({ isLoading: v }),
 }))

