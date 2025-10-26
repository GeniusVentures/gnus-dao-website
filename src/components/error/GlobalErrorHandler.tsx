'use client'

import React, { useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

/**
 * Global error handler component that sets up error tracking
 * and provides centralized error reporting
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    // Track page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      const loadTime = performance.now()
      logger.performance('Page Load', loadTime, { page: window.location.pathname })

      // Track navigation performance
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            logger.performance('Navigation', navEntry.loadEventEnd - navEntry.loadEventStart, {
              type: navEntry.type,
              page: window.location.pathname,
            })
          }
        }
      })

      try {
        observer.observe({ entryTypes: ['navigation'] })
      } catch (error) {
        // PerformanceObserver not supported
      }

      return () => {
        try {
          observer.disconnect()
        } catch (error) {
          // Observer already disconnected
        }
      }
    }

    return undefined
  }, [])

  useEffect(() => {
    // Track user interactions for debugging
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target) {
        logger.user('Click', {
          element: target.tagName,
          className: target.className,
          id: target.id,
          text: target.textContent?.slice(0, 50),
        })
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only log important key events
      if (event.key === 'Enter' || event.key === 'Escape' || event.metaKey || event.ctrlKey) {
        logger.user('Keydown', {
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
        })
      }
    }

    // Add event listeners with throttling
    let clickTimeout: ReturnType<typeof setTimeout>
    let keyTimeout: ReturnType<typeof setTimeout>

    const throttledClick = (event: MouseEvent) => {
      clearTimeout(clickTimeout)
      clickTimeout = setTimeout(() => handleClick(event), 100)
    }

    const throttledKeyDown = (event: KeyboardEvent) => {
      clearTimeout(keyTimeout)
      keyTimeout = setTimeout(() => handleKeyDown(event), 100)
    }

    document.addEventListener('click', throttledClick)
    document.addEventListener('keydown', throttledKeyDown)

    return () => {
      document.removeEventListener('click', throttledClick)
      document.removeEventListener('keydown', throttledKeyDown)
      clearTimeout(clickTimeout)
      clearTimeout(keyTimeout)
    }
  }, [])

  useEffect(() => {
    // Track Web3 connection status changes
    const handleOnline = () => {
      logger.info('Network Status: Online')
    }

    const handleOffline = () => {
      logger.warn('Network Status: Offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    // Track visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logger.user('Tab Hidden')
      } else {
        logger.user('Tab Visible')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    // Track beforeunload for session analytics
    const handleBeforeUnload = () => {
      logger.user('Page Unload', {
        page: window.location.pathname,
        sessionDuration: performance.now(),
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // This component doesn't render anything
  return null
}

/**
 * Hook for manual error reporting
 */
export function useErrorReporting() {
  const reportError = (error: Error, context?: Record<string, any>) => {
    logger.error('Manual Error Report', context, error)
  }

  const reportWarning = (message: string, context?: Record<string, any>) => {
    logger.warn(`Manual Warning: ${message}`, context)
  }

  const reportInfo = (message: string, context?: Record<string, any>) => {
    logger.info(`Manual Info: ${message}`, context)
  }

  return {
    reportError,
    reportWarning,
    reportInfo,
  }
}

/**
 * Hook for Web3 error reporting
 */
export function useWeb3ErrorReporting() {
  const reportConnectionError = (error: Error, walletType?: string) => {
    logger.error('Web3 Connection Error', {
      walletType,
      category: 'web3-connection',
    }, error)
  }

  const reportTransactionError = (error: Error, transactionType?: string) => {
    logger.error('Web3 Transaction Error', {
      transactionType,
      category: 'web3-transaction',
    }, error)
  }

  const reportContractError = (error: Error, contractAddress?: string, method?: string) => {
    logger.error('Web3 Contract Error', {
      contractAddress,
      method,
      category: 'web3-contract',
    }, error)
  }

  const reportNetworkError = (error: Error, chainId?: number) => {
    logger.error('Web3 Network Error', {
      chainId,
      category: 'web3-network',
    }, error)
  }

  return {
    reportConnectionError,
    reportTransactionError,
    reportContractError,
    reportNetworkError,
  }
}
