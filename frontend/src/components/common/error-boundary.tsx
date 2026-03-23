"use client"

import React from "react"
import { PageError } from "@/components/ui/error-display"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

type ErrorBoundaryProps = React.PropsWithChildren

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    void error
    void errorInfo
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
