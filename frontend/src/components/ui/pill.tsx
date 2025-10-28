import { cn } from "@/lib/utils"
import React from "react"

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: "slate" | "emerald" | "blue" | "amber" | "fuchsia" | "rose"
  children: React.ReactNode
}

export function Pill({ color = "slate", children, className = "", ...props }: PillProps) {
  const colorMap = {
    slate: "bg-white/5 text-slate-300 ring-white/10",
    emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
    blue: "bg-blue-500/10 text-blue-300 ring-blue-400/20",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-300 ring-fuchsia-400/20",
    rose: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-lg text-xs ring-1 transition-kanban duration-150",
        colorMap[color],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
