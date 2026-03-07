"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal } from "lucide-react"

interface MobileFilterSheetProps {
    title?: string
    children: React.ReactNode
    triggerLabel?: string
}

export function MobileFilterSheet({
    title = "Filters",
    children,
    triggerLabel = "Filters",
}: MobileFilterSheetProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px]">
                    <SlidersHorizontal className="h-4 w-4" />
                    {triggerLabel}
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-2xl">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    )
}
