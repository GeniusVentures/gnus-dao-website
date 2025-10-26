'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  level?: 'page' | 'component' | 'feature'
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props
    
    // Log error with context
    logger.error('React Error Boundary Caught Error', {
      level,
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
    }, error)

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    this.setState({ errorInfo })
  }

  handleRetry = () => {
    logger.user('Error Boundary Retry', {
      errorId: this.state.errorId,
      level: this.props.level,
    })
    
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
  }

  handleGoHome = () => {
    logger.user('Error Boundary Go Home', {
      errorId: this.state.errorId,
      level: this.props.level,
    })
    
    window.location.href = '/'
  }

  handleReportError = () => {
    logger.user('Error Boundary Report Error', {
      errorId: this.state.errorId,
      level: this.props.level,
    })

    // Create error report
    const errorReport = {
      errorId: this.state.errorId,
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    }

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      alert('Error report copied to clipboard. Please share this with the development team.')
    }).catch((error) => {
      // Use logger instead of console.error for proper error handling
      logger.error('Failed to copy error report to clipboard', {}, error)
    })
  }

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { level = 'component', showDetails = false } = this.props
      const { error, errorInfo, errorId } = this.state

      // Different UI based on error level
      if (level === 'page') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full mx-4">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-muted-foreground mb-6">
                  We encountered an unexpected error. Our team has been notified.
                </p>
                
                <div className="space-y-3">
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  
                  <Button 
                    onClick={this.handleGoHome} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                  
                  <Button 
                    onClick={this.handleReportError} 
                    variant="ghost" 
                    size="sm"
                    className="w-full"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    Report Error
                  </Button>
                </div>

                {showDetails && error && (
                  <details className="mt-6 text-left">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      Error Details (ID: {errorId})
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono">
                      <div className="mb-2">
                        <strong>Error:</strong> {error.message}
                      </div>
                      {error.stack && (
                        <div className="mb-2">
                          <strong>Stack:</strong>
                          <pre className="whitespace-pre-wrap">{error.stack}</pre>
                        </div>
                      )}
                      {errorInfo?.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )
      }

      // Component-level error UI
      return (
        <div className="border border-red-200 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Component Error
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                {level === 'feature' 
                  ? 'This feature is temporarily unavailable.' 
                  : 'This component failed to load properly.'
                }
              </p>
              
              <div className="mt-3 flex gap-2">
                <Button 
                  onClick={this.handleRetry} 
                  size="sm" 
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
                
                {showDetails && (
                  <Button 
                    onClick={this.handleReportError} 
                    size="sm" 
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Bug className="mr-1 h-3 w-3" />
                    Report
                  </Button>
                )}
              </div>

              {showDetails && error && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-red-600 hover:text-red-700">
                    Technical Details
                  </summary>
                  <div className="mt-1 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs font-mono">
                    <div><strong>ID:</strong> {errorId}</div>
                    <div><strong>Error:</strong> {error.message}</div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}
