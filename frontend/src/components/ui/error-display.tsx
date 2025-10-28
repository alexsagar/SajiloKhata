"use client"

import React from "react"
import { ErrorState } from "@/components/common/error-state"
import { cn } from "@/lib/utils"

interface ErrorDisplayProps {
  title?: string
  message?: string
  fullScreen?: boolean
  showRetry?: boolean
  showHome?: boolean
  onRetry?: () => void
  onHome?: () => void
  className?: string
}

export function ErrorDisplay({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  fullScreen = false,
  showRetry = true,
  showHome = false,
  onRetry,
  onHome,
  className
}: ErrorDisplayProps) {
  const containerClass = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-[#12151c]"
    : ""

  return (
    <div className={cn(containerClass, className)}>
      <ErrorState
        title={title}
        message={message}
        onRetry={onRetry}
        onGoHome={onHome}
        showRetry={showRetry}
        showGoHome={showHome}
        className={className}
      />
    </div>
  )
}

// Specific error components for common use cases
export function PageError({ 
  title, 
  message, 
  onRetry, 
  onHome 
}: { 
  title?: string
  message?: string
  onRetry?: () => void
  onHome?: () => void 
}) {
  return (
    <ErrorDisplay
      title={title}
      message={message}
      fullScreen
      showRetry={!!onRetry}
      showHome={!!onHome}
      onRetry={onRetry}
      onHome={onHome}
    />
  )
}

export function ComponentError({ 
  message, 
  onRetry 
}: { 
  message?: string
  onRetry?: () => void 
}) {
  return (
    <ErrorDisplay
      title="Error"
      message={message}
      showRetry={!!onRetry}
      onRetry={onRetry}
      className="py-8"
    />
  )
}

export function InlineError({ 
  message 
}: { 
  message: string 
}) {
  return (
    <div className="flex items-center justify-center p-2">
      <div className="flex items-center gap-2 text-destructive text-sm">
        <span>{message}</span>
      </div>
    </div>
  )
}
