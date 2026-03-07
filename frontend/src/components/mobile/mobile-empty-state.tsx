"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileEmptyStateProps {
    icon: LucideIcon
    title: string
    description?: string
    actionLabel?: string
    onAction?: () => void
}

export function MobileEmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
}: MobileEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Icon className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-[260px]">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <Button size="sm" className="mt-5 min-h-[44px]" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}
