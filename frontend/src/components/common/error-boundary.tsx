"use client"

import React from "react"
import { PageError } from "@/components/ui/error-display"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <PageError
          title="Something went wrong"
          message="An unexpected error occurred. Please refresh the page or try again later."
          onRetry={() => window.location.reload()}
        />
      )
    }

    return this.props.children
  }
}
