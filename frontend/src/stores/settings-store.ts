 import { create } from "zustand"

 type SettingsState = {
   theme: "light" | "dark" | "system"
   locale: string
   currency: string
   notificationsEnabled: boolean
   setTheme: (t: SettingsState["theme"]) => void
   setLocale: (l: string) => void
   setCurrency: (c: string) => void
   setNotificationsEnabled: (v: boolean) => void
 }

 export const useSettingsStore = create<SettingsState>((set) => ({
   theme: "system",
   locale: "en",
   currency: "USD",
   notificationsEnabled: true,
   setTheme: (theme) => set({ theme }),
   setLocale: (locale) => set({ locale }),
   setCurrency: (currency) => set({ currency }),
   setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
 }))

