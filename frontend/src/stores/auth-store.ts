 import { create } from "zustand"

 type User = {
   id: string
   name: string
   email: string
   avatarUrl?: string
 }

 type AuthState = {
   user: User | null
   accessToken: string | null
   isLoading: boolean
   setUser: (user: User | null) => void
   setAccessToken: (token: string | null) => void
   setLoading: (loading: boolean) => void
   logout: () => void
 }

 export const useAuthStore = create<AuthState>((set) => ({
   user: null,
   accessToken: null,
   isLoading: false,
   setUser: (user) => set({ user }),
   setAccessToken: (accessToken) => set({ accessToken }),
   setLoading: (isLoading) => set({ isLoading }),
   logout: () => set({ user: null, accessToken: null }),
 }))

