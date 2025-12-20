import { cn } from "@/lib/utils"
import React from "react"

interface KanbanCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

export function KanbanCard({ className = "", children, ...props }: KanbanCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-[var(--card)] ring-1 ring-white/5 shadow-soft transition-kanban duration-150 w-full min-w-0 overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

interface KanbanCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function KanbanCardHeader({ className = "", children, ...props }: KanbanCardHeaderProps) {
  return (
    <div
      className={cn("p-4 md:p-5", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface KanbanCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function KanbanCardContent({ className = "", children, ...props }: KanbanCardContentProps) {
  return (
    <div
      className={cn("p-4 md:p-5 pt-0 w-full min-w-0 overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface KanbanCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

export function KanbanCardTitle({ className = "", children, ...props }: KanbanCardTitleProps) {
  return (
    <h3
      className={cn("text-slate-100 font-semibold text-base leading-tight", className)}
      {...props}
    >
      {children}
    </h3>
  )
}

interface KanbanCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export function KanbanCardDescription({ className = "", children, ...props }: KanbanCardDescriptionProps) {
  return (
    <p
      className={cn("text-slate-300 text-sm mt-1", className)}
      {...props}
    >
      {children}
    </p>
  )
}

interface KanbanCardMetaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function KanbanCardMeta({ className = "", children, ...props }: KanbanCardMetaProps) {
  return (
    <div
      className={cn("text-slate-400 text-xs", className)}
      {...props}
    >
      {children}
    </div>
  )
}
