"use client"

import { ReactNode, useState } from "react"
import { AppSidebar } from "@/components/common/app-sidebar"
import { Header } from "@/components/common/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface AppShellProps {
  children: ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
  showSearch?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
}

export function AppShell({ 
  children, 
  title, 
  description, 
  actions, 
  showSearch = true,
  searchPlaceholder = "Search...",
  onSearch 
}: AppShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const handleMobileMenuToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
  }

  return (
    <ProtectedRoute>
      <div className="app-shell flex min-h-screen bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside className="app-sidebar sticky top-0 h-svh w-64 shrink-0 border-r border-white/10 overflow-y-auto hidden lg:block">
          <AppSidebar />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50" 
              onClick={closeMobileSidebar}
            />
            
            {/* Sidebar */}
            <aside className="absolute left-0 top-0 h-full w-64 bg-[var(--panel)] border-r border-white/10 overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <span className="font-semibold text-white">Menu</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeMobileSidebar}
                  className="p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <AppSidebar />
            </aside>
          </div>
        )}

        {/* Main content column */}
        <div className="app-main flex-1 min-w-0 flex flex-col">
          {/* Topbar/Header */}
          {title && (
            <Header 
              title={title}
              description={description}
              actions={actions}
              showSearch={showSearch}
              searchPlaceholder={searchPlaceholder}
              onSearch={onSearch}
              onMobileMenuToggle={handleMobileMenuToggle}
            />
          )}
          
          {/* Main content area */}
          <main className="app-main-content flex-1 min-w-0 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-4 w-full max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
