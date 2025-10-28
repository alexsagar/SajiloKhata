"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface LoadingProps {
  variant?: "spinner" | "dots" | "pulse" | "modern"
  size?: "sm" | "md" | "lg" | "xl"
  fullScreen?: boolean
  className?: string
  text?: string
  subtitle?: string
}

export function Loading({ 
  variant = "modern", 
  size = "lg", 
  fullScreen = false, 
  className,
  text,
  subtitle
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  }

  const containerClass = fullScreen 
    ? "fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/95 backdrop-blur-sm"
    : "flex items-center justify-center"

  const renderModernSpinner = () => (
    <div className="relative">
      {/* Outer ring */}
      <div className={cn(
        "animate-spin rounded-full border-2 border-white/10",
        sizeClasses[size]
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

  const renderSpinner = () => (
    <div className={cn("animate-spin rounded-full border-2 border-white/10 border-t-emerald-500", sizeClasses[size])}>
      <div className="sr-only">Loading...</div>
    </div>
  )

  const renderDots = () => (
    <div className="flex space-x-2">
      <div className={cn("rounded-full bg-emerald-500 animate-bounce", 
        size === "sm" ? "w-2 h-2" : size === "md" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-5 h-5"
      )} style={{ animationDelay: "0ms" }}></div>
      <div className={cn("rounded-full bg-emerald-500 animate-bounce", 
        size === "sm" ? "w-2 h-2" : size === "md" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-5 h-5"
      )} style={{ animationDelay: "150ms" }}></div>
      <div className={cn("rounded-full bg-emerald-500 animate-bounce", 
        size === "sm" ? "w-2 h-2" : size === "md" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-5 h-5"
      )} style={{ animationDelay: "300ms" }}></div>
    </div>
  )

  const renderPulse = () => (
    <div className={cn("rounded-full bg-emerald-500 animate-pulse", sizeClasses[size])}>
      <div className="sr-only">Loading...</div>
    </div>
  )

  const renderAnimation = () => {
    switch (variant) {
      case "dots":
        return renderDots()
      case "pulse":
        return renderPulse()
      case "spinner":
        return renderSpinner()
      case "modern":
      default:
        return renderModernSpinner()
    }
  }

  return (
    <div className={cn(containerClass, className)}>
      <div className="flex flex-col items-center space-y-4 text-center">
        {renderAnimation()}
        {text && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              {text}
            </h3>
            {subtitle && (
              <p className="text-sm text-slate-400 max-w-md">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Specific loading components for common use cases
export function PageLoading({ text = "Loading...", subtitle }: { text?: string, subtitle?: string }) {
  return <Loading variant="modern" size="xl" fullScreen text={text} subtitle={subtitle} />
}

export function ComponentLoading({ text, subtitle, variant = "modern" }: { 
  text?: string, 
  subtitle?: string,
  variant?: "spinner" | "dots" | "pulse" | "modern" 
}) {
  return <Loading variant={variant} size="lg" text={text} subtitle={subtitle} className="py-12" />
}

export function InlineLoading({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  return <Loading variant="modern" size={size} className="inline-flex" />
}

export function CardLoading({ text, subtitle }: { text?: string, subtitle?: string }) {
  return (
    <div className="bg-[#12151c] border border-white/10 rounded-xl p-8">
      <Loading variant="modern" size="lg" text={text} subtitle={subtitle} />
    </div>
  )
}
