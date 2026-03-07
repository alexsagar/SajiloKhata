"use client"

import { MobileHeader } from "@/components/mobile/mobile-header"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import {
    User,
    Settings,
    ClipboardCheck,
    LogOut,
    ChevronRight,
    Shield,
    CreditCard,
    HelpCircle,
    UserPlus,
    BarChart3,
    CalendarDays,
} from "lucide-react"

const menuSections = [
    {
        title: "Features",
        items: [
            { label: "Friends", href: "/m/friends", icon: UserPlus },
            { label: "Analytics", href: "/m/analytics", icon: BarChart3 },
            { label: "Calendar", href: "/m/calendar", icon: CalendarDays },
            { label: "OCR Review Queue", href: "/m/expenses/review-queue", icon: ClipboardCheck },
        ],
    },
    {
        title: "Account",
        items: [
            { label: "Profile", href: "/settings/profile", icon: User },
            { label: "Settings", href: "/settings", icon: Settings },
            { label: "Security", href: "/settings/security", icon: Shield },
        ],
    },
    {
        title: "Other",
        items: [
            { label: "Premium", href: "/premium", icon: CreditCard },
            { label: "Help & Support", href: "#", icon: HelpCircle },
        ],
    },
]

export default function MobileSettingsPage() {
    const { user, logout } = useAuth()
    const router = useRouter()

    const handleLogout = () => {
        logout()
        router.push("/login")
    }

    return (
        <>
            <MobileHeader title="More" />

            <div className="flex flex-col gap-4 px-3 py-4">
                {/* User card */}
                <div className="rounded-xl border border-white/5 bg-[var(--card)] p-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-blue-500/20 text-blue-400 text-sm font-medium">
                            {getInitials(user?.firstName || "", user?.lastName || "")}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                            {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                            {user?.email}
                        </p>
                    </div>
                </div>

                {/* Menu sections */}
                {menuSections.map((section) => (
                    <div key={section.title}>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wider px-1 mb-2">
                            {section.title}
                        </p>
                        <div className="rounded-xl border border-white/5 bg-[var(--card)] overflow-hidden divide-y divide-white/5">
                            {section.items.map(({ label, href, icon: Icon }) => (
                                <button
                                    key={label}
                                    onClick={() => router.push(href)}
                                    className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-white/5 active:bg-white/10 transition-colors min-h-[44px]"
                                >
                                    <Icon className="h-5 w-5 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                                    <span className="flex-1 text-sm text-white">{label}</span>
                                    <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-left hover:bg-red-500/10 active:bg-red-500/15 transition-colors min-h-[44px]"
                >
                    <LogOut className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-red-400 font-medium">Log Out</span>
                </button>
            </div>
        </>
    )
}
