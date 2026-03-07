"use client"

import { Skeleton } from "@/components/ui/skeleton"

interface MobileSkeletonProps {
    count?: number
}

export function MobileListSkeleton({ count = 5 }: MobileSkeletonProps) {
    return (
        <div className="flex flex-col gap-3 px-4 py-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-[var(--card)] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                </div>
            ))}
        </div>
    )
}

export function MobileDetailSkeleton() {
    return (
        <div className="px-4 py-4 space-y-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="rounded-xl border border-white/5 bg-[var(--card)] p-4 space-y-3 mt-4">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="rounded-xl border border-white/5 bg-[var(--card)] p-4 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        </div>
    )
}
