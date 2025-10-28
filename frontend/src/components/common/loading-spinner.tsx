import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  }

  return (
    <div className="relative">
      {/* Outer ring */}
      <div className={cn(
        "animate-spin rounded-full border-2 border-white/10",
        sizeClasses[size],
        className
      )}>
        <div className="sr-only">Loading...</div>
      </div>
      {/* Inner ring with gradient */}
      <div className={cn(
        "absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-500",
        sizeClasses[size]
      )}></div>
      {/* Center dot */}
      <div className={cn(
        "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500",
        size === "sm" ? "w-1 h-1" : size === "md" ? "w-1.5 h-1.5" : size === "lg" ? "w-2 h-2" : "w-3 h-3"
      )}></div>
    </div>
  )
}
