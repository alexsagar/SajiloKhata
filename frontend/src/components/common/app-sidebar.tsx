"use client"

import { Home, Users, Receipt, BarChart3, Settings, Calendar, MessageSquare, UserPlus, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useMobileSidebar } from "@/contexts/mobile-sidebar-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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
  const { setIsOpen } = useMobileSidebar()

  return (
    <div className="font-sans bg-[#12151c] text-slate-200 border-r border-white/10 h-screen w-[280px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="/images/logo.png" 
            alt="SajiloKhata Logo" 
            width={56} 
            height={56}
            className="rounded-xl"
          />
          <span className="text-lg font-semibold text-slate-100">SajiloKhata</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="lg:hidden h-10 w-10 p-2"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-3 py-4 flex-1">
        {/* Main Navigation */}
        <div className="mb-6">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">
            Main
          </div>
          <nav className="space-y-1">
            {mainItems.map((item) => {
              const isActive = item.url === "/" 
                ? pathname === "/" 
                : pathname.startsWith(item.url)
              return (
                <Link 
                  key={item.title}
                  href={item.url} 
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive 
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' 
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.title}</span>
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
          <nav className="space-y-1">
            {settingsItems.map((item) => {
              const isActive = pathname.startsWith(item.url)
              return (
                <Link 
                  key={item.title}
                  href={item.url} 
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive 
                      ? 'bg-white/7 text-white ring-1 ring-white/10' 
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 p-4 mt-auto">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-white/10 shrink-0">
              <AvatarImage src={user.avatar || "/placeholder.svg"} />
              <AvatarFallback className="bg-slate-600 text-slate-200 font-medium text-sm">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/5 shrink-0"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
