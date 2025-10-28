"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ResponsiveHeaderProps {
  title?: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function ResponsiveHeader({ title, subtitle, children, className }: ResponsiveHeaderProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = () => {
    const sidebar = document.querySelector('[data-radix-sidebar]')
    if (sidebar) {
      const currentState = sidebar.getAttribute('data-state')
      sidebar.setAttribute('data-state', currentState === 'open' ? 'closed' : 'open')
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b border-white/5 bg-[var(--panel)] backdrop-blur supports-[backdrop-filter]:bg-[var(--panel)]/80",
      className
    )}>
      <div className="container-responsive flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="lg:hidden touch-friendly"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Title Section */}
          {(title || subtitle) && (
            <div className="hidden sm:block">
              {title && (
                <h1 className="text-responsive-lg font-semibold text-foreground">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-responsive-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Side Content */}
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </header>
  )
}
