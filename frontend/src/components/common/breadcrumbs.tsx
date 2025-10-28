"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

// Path name mapping for better breadcrumb labels
const pathNameMap: Record<string, string> = {
  "": "Dashboard",
  "expenses": "Expenses", 
  "groups": "Groups",
  "friends": "Friends",
  "analytics": "Analytics",

  "calendar": "Calendar",
  "chat": "Chat",
  "settings": "Settings",
  "notifications": "Notifications",
  "premium": "Premium",
  "admin": "Admin",
  "auth": "Authentication",
  "login": "Sign In",
  "register": "Sign Up"
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  // Don't show breadcrumbs on auth pages
  if (segments[0] === "auth" || segments.includes("login") || segments.includes("register")) {
    return null
  }

  // Always show home for non-dashboard pages
  const showHome = segments.length > 0

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-sm">
      {showHome && (
        <Button 
          variant="ghost" 
          size="sm" 
          asChild 
          className="h-7 px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          <Link href="/" className="flex items-center gap-1">
            <Home className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Dashboard</span>
          </Link>
        </Button>
      )}
      
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/")
        const label = pathNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
        const isLast = index === segments.length - 1

        return (
          <div key={segment} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            {isLast ? (
              <span className="text-slate-200 font-medium px-2 py-1 text-sm">
                {label}
              </span>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                asChild 
                className="h-7 px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                <Link href={href}>{label}</Link>
              </Button>
            )}
          </div>
        )
      })}
    </nav>
  )
}
