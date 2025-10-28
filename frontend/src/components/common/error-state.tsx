"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  onGoHome?: () => void
  showRetry?: boolean
  showGoHome?: boolean
  className?: string
}

export function ErrorState({
  title = "Something went wrong!",
  message = "An unexpected error occurred. Please try again or contact support if the problem persists.",
  onRetry,
  onGoHome,
  showRetry = true,
  showGoHome = true,
  className = ""
}: ErrorStateProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome()
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className={`error-responsive flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className="text-red-500 mb-4">
          <AlertCircle className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-responsive-lg font-semibold mb-2">{title}</h3>
        <p className="text-responsive-sm text-muted-foreground mb-4">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showRetry && (
            <Button 
              variant="outline" 
              onClick={handleRetry} 
              className="touch-friendly"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          {showGoHome && (
            <Button 
              onClick={handleGoHome} 
              className="touch-friendly"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
