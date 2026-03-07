"use client"

import { BottomTabs } from "./bottom-tabs"

interface MobileShellProps {
    children: React.ReactNode
}

export function MobileShell({ children }: MobileShellProps) {
    return (
        <div className="flex flex-col min-h-[100dvh] max-h-[100dvh] w-full bg-background text-foreground overflow-hidden">
            {/* Scrollable content area — header is rendered per-page inside children */}
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
                {children}
            </main>

            {/* Bottom navigation */}
            <BottomTabs />
        </div>
    )
}
