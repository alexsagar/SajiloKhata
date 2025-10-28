import { cn } from "@/lib/utils"
import React from "react"
import { KanbanCard } from "./kanban-card"
import { Pill } from "./pill"

interface BoardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Board({ className = "", children, ...props }: BoardProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 overflow-x-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface BoardColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  count?: number
  children: React.ReactNode
}

export function BoardColumn({ title, count, children, className = "", ...props }: BoardColumnProps) {
  return (
    <div
      className={cn("min-w-[280px] flex flex-col", className)}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-100 font-semibold text-sm uppercase tracking-wide">
          {title}
        </h3>
        {count !== undefined && (
          <Pill color="slate">{count}</Pill>
        )}
      </div>
      <div className="space-y-3 flex-1">
        {children}
      </div>
    </div>
  )
}

interface BoardItemProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  meta?: React.ReactNode
  avatars?: React.ReactNode
  children?: React.ReactNode
}

export function BoardItem({ title, meta, avatars, children, className = "", ...props }: BoardItemProps) {
  return (
    <KanbanCard
      className={cn(
        "p-4 hover:-translate-y-0.5 hover:bg-white/[0.06] cursor-pointer",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-slate-100 font-medium text-sm leading-tight flex-1 pr-2">
          {title}
        </h4>
        {avatars && (
          <div className="flex-shrink-0">
            {avatars}
          </div>
        )}
      </div>
      {children && (
        <div className="text-slate-300 text-sm mb-3">
          {children}
        </div>
      )}
      {meta && (
        <div className="flex items-center gap-2 flex-wrap">
          {meta}
        </div>
      )}
    </KanbanCard>
  )
}

// Avatar component for board items
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: "sm" | "md"
}

export function Avatar({ src, alt, fallback, size = "sm", className = "", ...props }: AvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
  }

  return (
    <div
      className={cn(
        "rounded-full bg-slate-600 flex items-center justify-center text-slate-200 font-medium ring-2 ring-white/10",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span>{fallback || "?"}</span>
      )}
    </div>
  )
}

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  max?: number
}

export function AvatarGroup({ children, max = 3, className = "", ...props }: AvatarGroupProps) {
  const avatars = React.Children.toArray(children)
  const visibleAvatars = avatars.slice(0, max)
  const remainingCount = avatars.length - max

  return (
    <div
      className={cn("flex -space-x-1", className)}
      {...props}
    >
      {visibleAvatars}
      {remainingCount > 0 && (
        <Avatar fallback={`+${remainingCount}`} />
      )}
    </div>
  )
}
