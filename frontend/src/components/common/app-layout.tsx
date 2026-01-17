"use client"

import { AppSidebar } from "./app-sidebar"
import { ReactNode } from "react"
import { MobileSidebarProvider, useMobileSidebar } from "@/contexts/mobile-sidebar-context"

interface AppLayoutProps {
  children: ReactNode
  className?: string
}

function AppLayoutInner({ children, className = "" }: AppLayoutProps) {
  const { isOpen, setIsOpen } = useMobileSidebar()

  return (
    <div
      className={`AppLayout flex min-h-screen w-full bg-background text-foreground overflow-hidden ${className}`}
    >
      {/* Desktop Sidebar */}
      <div className="shrink-0 hidden lg:block h-screen sticky top-0">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <AppSidebar />
      </div>

      {/* Main content column */}
      <main className="flex-1 flex flex-col w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto">
        <div className="w-full flex-1 flex flex-col px-0">
          <div className="w-full max-w-none pl-3 sm:pl-4 lg:pl-6 pr-0 flex-1 flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export function AppLayout({ children, className = "" }: AppLayoutProps) {
  return (
    <MobileSidebarProvider>
      <AppLayoutInner className={className}>{children}</AppLayoutInner>
    </MobileSidebarProvider>
  )
}
