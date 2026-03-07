"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileHeaderProps {
    title: string
    showBack?: boolean
    actions?: React.ReactNode
}

export function MobileHeader({ title, showBack = false, actions }: MobileHeaderProps) {
    const router = useRouter()

    return (
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[var(--panel)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--panel)]/80 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center h-12 px-2 gap-1">
                {/* Back button */}
                {showBack && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="h-10 w-10 p-0 flex-shrink-0 hover:bg-white/10"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}

                {/* Title */}
                <h1 className="flex-1 text-base font-semibold text-white truncate px-1">
                    {title}
                </h1>

                {/* Right actions */}
                {actions && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    )
}
