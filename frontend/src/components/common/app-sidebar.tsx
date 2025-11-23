"use client"

import { useState, useEffect } from "react"
import { Home, Users, Receipt, BarChart3, Settings, Calendar, MessageSquare, UserPlus, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useMobileSidebar } from "@/contexts/mobile-sidebar-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getInitials, cn } from "@/lib/utils"

const mainItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Friends",
    url: "/friends",
    icon: UserPlus,
  },
  {
    title: "Groups",
    url: "/groups",
    icon: Users,
  },
  {
    title: "Expenses",
    url: "/expenses",
    icon: Receipt,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
  },
]

const settingsItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const { isOpen, setIsOpen } = useMobileSidebar()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className={cn(
      "font-sans bg-[#12151c] text-slate-200 border-r border-white/10 h-screen",
      "touch-manipulation select-none", // Enhanced touch interactions
      isMobile ? "w-full h-screen fixed inset-0 z-50" : "w-[280px]",
      isMobile && !isOpen && "translate-x-[-100%]",
      "transition-transform duration-300 ease-in-out"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 sm:py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-500 text-black shadow-soft">
            <span className="text-sm sm:text-base font-bold">SW</span>
          </div>
          <span className="font-semibold text-slate-100 text-sm sm:text-base">Khutrukey</span>
        </div>
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="lg:hidden min-h-[44px] min-w-[44px] p-2 touch-manipulation"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-4 flex-1">
        {/* Main Navigation */}
        <div className="mb-6">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">
            Main
          </div>
          <nav className="space-y-2">
            {mainItems.map((item) => {
              const isActive = item.url === "/" 
                ? pathname === "/" 
                : pathname.startsWith(item.url)
              return (
                <Link 
                  key={item.title}
                  href={item.url} 
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                    "min-h-[44px] touch-manipulation select-none", // Touch-friendly sizing
                    "active:scale-95 active:bg-emerald-500/10", // Touch feedback with emerald
                    isActive 
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 shadow-sm' 
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => isMobile && setIsOpen(false)} // Auto-close on mobile
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Settings Navigation */}
        <div className="mb-6">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">
            Settings
          </div>
          <nav className="space-y-2">
            {settingsItems.map((item) => {
              const isActive = pathname.startsWith(item.url)
              return (
                <Link 
                  key={item.title}
                  href={item.url} 
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                    "min-h-[44px] touch-manipulation select-none", // Touch-friendly sizing
                    "active:scale-95 active:bg-white/10", // Touch feedback
                    isActive 
                      ? 'bg-white/7 text-white ring-1 ring-white/10 shadow-sm' 
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => isMobile && setIsOpen(false)} // Auto-close on mobile
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 p-4 pb-6">
        {user && (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-white/10 flex-shrink-0">
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-slate-600 text-slate-200 font-medium text-sm">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 leading-tight break-words">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-400 break-words mt-0.5">{user.email}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={logout}
                className="h-10 w-10 min-h-[44px] min-w-[44px] text-slate-400 hover:text-white hover:bg-white/5 touch-manipulation flex-shrink-0"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
