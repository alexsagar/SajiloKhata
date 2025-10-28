"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"

type MobileSidebarContextType = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  toggleSidebar: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextType | undefined>(undefined)

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Check if we're on mobile on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 1024
      setIsOpen(!isMobile) // Only open by default on desktop
    }
  }, [])
  
  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <MobileSidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>
      {children}
    </MobileSidebarContext.Provider>
  )
}

export function useMobileSidebar() {
  const context = useContext(MobileSidebarContext)
  if (context === undefined) {
    throw new Error("useMobileSidebar must be used within a MobileSidebarProvider")
  }
  return context
}