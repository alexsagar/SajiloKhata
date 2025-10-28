import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-slate-100",
        "placeholder:text-slate-400 transition-kanban duration-150 outline-none",
        "focus:ring-2 focus:ring-emerald-400/40 focus:bg-white/7",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
