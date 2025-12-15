"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/utils/logger';
import { captureError } from '@/lib/utils/sentry';
import { criticalErrorAlerting, CriticalErrorType } from '@/lib/utils/criticalErrorAlerting';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'section';
  componentName?: string;
  showDetails?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

/**
 * Enhanced Error Boundary with comprehensive user action tracking
 */
export class TrackedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', componentName, onError } = this.props;
    
    // User action context will be available through breadcrumbs
    const lastUserAction = null; // Context captured via breadcrumbs
    const userActivity = null; // Context captured via breadcrumbs
    
    // Enhanced error context with user actions
    const errorContext = {
      level,
      componentName: componentName || 'Unknown',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      lastUserAction: lastUserAction || null,
      userActivity: userActivity || null,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: Date.now(),
      errorId: this.state.errorId,
    };

    // Log error with enhanced context
    logger.error(
      `Error Boundary Caught Error in ${componentName || 'Component'}`,
      errorContext,
      error
    );

    // Capture error with Sentry including user action context
    captureError(error, errorContext, 'error');

    // Trigger critical alert for page-level errors or repeated component errors
    if (level === 'page' || error.message.toLowerCase().includes('critical')) {
      criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.SYSTEM_FAILURE, {
        userId: errorContext.userId,
        url: errorContext.url,
        additionalData: {
          componentName: componentName || 'Unknown',
          level,
          errorBoundary: true
        }
      });
    }

    // Add breadcrumb for error boundary activation
    Sentry.addBreadcrumb({
      message: `Error boundary activated in ${componentName || 'component'}`,
      category: 'error',
      level: 'error',
      data: {
        componentName: componentName || 'Unknown',
        level,
        errorMessage: error.message,
        lastUserAction: 'unknown', // Will be captured via breadcrumbs
        userActionTimestamp: Date.now(),
      },
      timestamp: Date.now() / 1000,
    });

    // Set error context for future error correlation
    Sentry.setContext('errorBoundary', {
      componentName: componentName || 'Unknown',
      level,
      errorId: this.state.errorId,
      errorMessage: error.message,
      timestamp: Date.now(),
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Track error boundary activation as user action
    Sentry.addBreadcrumb({
      message: 'Error boundary user action tracking',
      category: 'user',
      level: 'info',
      data: {
        action: 'error_boundary_activation',
        component: componentName || 'Unknown',
        errorId: this.state.errorId,
      },
      timestamp: Date.now() / 1000,
    });
  }

  handleRetry = () => {
    // Track retry attempt
    Sentry.addBreadcrumb({
      message: 'User attempted error recovery',
      category: 'user',
      level: 'info',
      data: {
        action: 'error_boundary_retry',
        component: this.props.componentName || 'Unknown',
        errorId: this.state.errorId,
      },
      timestamp: Date.now() / 1000,
    });

    logger.user('Error Boundary Retry', {
      component: this.props.componentName || 'Unknown',
      errorId: this.state.errorId,
    });

    // Reset error state
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: undefined 
    });
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (error && errorId) {
      // Track error reporting action
      Sentry.addBreadcrumb({
        message: 'User reported error',
        category: 'user',
        level: 'info',
        data: {
          action: 'error_boundary_report',
          component: this.props.componentName || 'Unknown',
          errorId,
        },
        timestamp: Date.now() / 1000,
      });

      logger.user('Error Boundary Report', {
        component: this.props.componentName || 'Unknown',
        errorId,
        errorMessage: error.message,
      });

      // Send additional error report to Sentry with user feedback context
      Sentry.captureException(error, {
        tags: {
          errorType: 'user_reported',
          errorBoundary: true,
          component: this.props.componentName || 'Unknown',
        },
        extra: {
          errorId,
          componentStack: errorInfo?.componentStack,
          userReported: true,
          reportTimestamp: Date.now(),
        },
      });
    }
  };

  override render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = false, level = 'component' } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default error UI with user action tracking
      return (
        <div className="error-boundary-container p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Something went wrong
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>
                  {level === 'page' 
                    ? 'An error occurred while loading this page.' 
                    : 'An error occurred in this component.'}
                </p>
                {showDetails && error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">
                      Error Details
                    </summary>
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-800/50 rounded text-xs font-mono">
                      <p><strong>Error:</strong> {error.message}</p>
                      {errorInfo && (
                        <p><strong>Component Stack:</strong></p>
                      )}
                      {errorInfo && (
                        <pre className="whitespace-pre-wrap text-xs">
                          {errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                )}
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={this.handleRetry}
                  className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReportError}
                  className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Report Error
                </button>
                {level === 'page' && (
                  <button
                    onClick={() => {
                      // Track page reload action
                      Sentry.addBreadcrumb({
                        message: 'User reloaded page after error',
                        category: 'user',
                        level: 'info',
                        data: {
                          action: 'error_boundary_reload',
                          errorId: this.state.errorId,
                        },
                        timestamp: Date.now() / 1000,
                      });
                      
                      window.location.reload();
                    }}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Reload Page
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook version of the error boundary for functional components
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error, errorInfo?: any) => {
    // User action context will be available through breadcrumbs
    const lastUserAction = null; // Context captured via breadcrumbs
    
    const errorContext = {
      hookBased: true,
      lastUserAction: lastUserAction || null,
      errorInfo,
      timestamp: Date.now(),
    };

    logger.error('Hook Error Boundary', errorContext, error);
    
    Sentry.captureException(error, {
      extra: errorContext,
      tags: {
        errorType: 'hook_boundary',
      },
    });

    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}