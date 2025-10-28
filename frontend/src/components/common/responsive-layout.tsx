"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "./app-sidebar"
import { ResponsiveHeader } from "./responsive-header"
import { cn } from "@/lib/utils"

interface ResponsiveLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  headerContent?: React.ReactNode
  className?: string
}

export function ResponsiveLayout({ 
  children, 
  title, 
  subtitle, 
  headerContent, 
  className 
}: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {(title || subtitle || headerContent) && (
          <ResponsiveHeader 
            title={title} 
            subtitle={subtitle}
          >
            {headerContent}
          </ResponsiveHeader>
        )}
        
        {/* Page Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          className
        )}>
          <div className="container-responsive py-responsive">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
