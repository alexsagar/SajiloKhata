"use client"

import type { ReactNode } from "react"

interface MobileCardListProps<T> {
    data: T[]
    renderItem: (item: T, index: number) => ReactNode
    keyExtractor: (item: T, index: number) => string
    className?: string
}

export function MobileCardList<T>({
    data,
    renderItem,
    keyExtractor,
    className = "",
}: MobileCardListProps<T>) {
    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {data.map((item, index) => (
                <div key={keyExtractor(item, index)}>
                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    )
}
