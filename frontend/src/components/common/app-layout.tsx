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
      className={`AppLayout flex h-[100dvh] max-h-[100dvh] min-h-0 w-full bg-background text-foreground overflow-hidden ${className}`}
    >
      {/* Desktop Sidebar */}
      <div className="shrink-0 hidden lg:block h-[100dvh] sticky top-0 self-start">
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
      <main className="flex-1 flex flex-col w-full min-w-0 min-h-0 max-w-full overflow-hidden">
        <div className="w-full flex-1 min-h-0 flex flex-col">
          <div className="w-full max-w-none px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-4 lg:px-6 flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
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
