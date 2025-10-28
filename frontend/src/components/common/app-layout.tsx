"use client"

import { AppSidebar } from "./app-sidebar"
import { ReactNode } from "react"
import { MobileSidebarProvider } from "@/contexts/mobile-sidebar-context"

interface AppLayoutProps {
  children: ReactNode
  className?: string
}

export function AppLayout({ children, className = "" }: AppLayoutProps) {
  return (
    <MobileSidebarProvider>
      <div className={`AppLayout ${className}`}>
        <div>
          <AppSidebar />
        </div>
        <main>
          {children}
        </main>
      </div>
    </MobileSidebarProvider>
  )
}
