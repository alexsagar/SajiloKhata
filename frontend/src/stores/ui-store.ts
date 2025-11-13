 import { create } from "zustand"

 type UIState = {
   sidebarOpen: boolean
   modalOpen: boolean
   theme: "light" | "dark" | "system"
   setSidebarOpen: (v: boolean) => void
   toggleSidebar: () => void
   openModal: () => void
   closeModal: () => void
   setTheme: (t: UIState["theme"]) => void
 }

 export const useUIStore = create<UIState>((set) => ({
   sidebarOpen: false,
   modalOpen: false,
   theme: "system",
   setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
   toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
   openModal: () => set({ modalOpen: true }),
   closeModal: () => set({ modalOpen: false }),
   setTheme: (theme) => set({ theme }),
 }))

