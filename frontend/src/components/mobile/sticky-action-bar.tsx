"use client"

interface StickyActionBarProps {
    children: React.ReactNode
    className?: string
}

export function StickyActionBar({ children, className = "" }: StickyActionBarProps) {
    return (
        <div
            className={`fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-white/5 bg-[var(--panel)]/95 backdrop-blur px-4 py-2 ${className}`}
        >
            <div className="flex items-center gap-2">
                {children}
            </div>
        </div>
    )
}
