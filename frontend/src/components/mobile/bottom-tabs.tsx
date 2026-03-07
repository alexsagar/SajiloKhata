"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Receipt, Bell, MoreHorizontal } from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"

const tabs = [
    { href: "/m/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/m/groups", label: "Groups", icon: Users },
    { href: "/m/expenses", label: "Expenses", icon: Receipt },
    { href: "/m/notifications", label: "Alerts", icon: Bell },
    { href: "/m/settings", label: "More", icon: MoreHorizontal },
] as const

export function BottomTabs() {
    const pathname = usePathname()
    const { unreadCount } = useNotifications()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[var(--panel)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--panel)]/80 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-14">
                {tabs.map(({ href, label, icon: Icon }) => {
                    const isActive =
                        pathname === href || pathname.startsWith(href + "/")
                    const isNotifications = href === "/m/notifications"

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-2 py-1 rounded-lg transition-colors ${isActive
                                    ? "text-[hsl(var(--primary))]"
                                    : "text-[hsl(var(--muted-foreground))] active:text-white"
                                }`}
                        >
                            <span className="relative">
                                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                                {isNotifications && unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </span>
                            <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                                {label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
