'use client'

import React, { Suspense, lazy } from 'react'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

// Lazy load Web3 components to reduce initial bundle size
const Web3ReduxProvider = lazy(() => import('./Web3ReduxProvider').then(module => ({ default: module.Web3ReduxProvider })))

// Loading component for Web3 provider
function Web3Loading() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2 text-sm text-muted-foreground">Initializing Web3...</span>
    </div>
  )
}

// Error fallback component
function Web3ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
        Web3 Initialization Failed
      </h3>
      <p className="text-sm text-red-600 dark:text-red-300 mb-4 text-center">
        {error.message || 'Failed to initialize Web3 components'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

interface LazyWeb3ProviderProps {
  children: React.ReactNode
}

export function LazyWeb3Provider({ children }: LazyWeb3ProviderProps) {
  return (
    <ErrorBoundary
      fallback={<Web3ErrorFallback error={new Error('Web3 Provider Error')} resetErrorBoundary={() => window.location.reload()} />}
      onError={(error, errorInfo) => {
        console.error('Web3 Provider Error:', error, errorInfo)
        // In production, you might want to send this to an error reporting service
      }}
      level="component"
    >
      <Suspense fallback={<Web3Loading />}>
        <Web3ReduxProvider>
          {children}
        </Web3ReduxProvider>
      </Suspense>
    </ErrorBoundary>
  )
}
