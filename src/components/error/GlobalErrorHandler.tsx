"use client";

import { logger } from "@/lib/utils/logger";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useUserActionTracking } from "@/hooks/useUserActionTracking";
import { initializeSession, updateSessionActivity, getCurrentSession } from "@/lib/utils/sentry";

/**
 * Global error handler component that sets up error tracking
 * and provides centralized error reporting
 */
export function GlobalErrorHandler() {
  const { trackAction, trackNavigation } = useUserActionTracking();

  useEffect(() => {
    // Initialize enhanced session tracking
    const sessionInfo = initializeSession();
    
    // Set up comprehensive Sentry context for the session
    Sentry.setContext("session", sessionInfo);

    // Track page load performance
    if (typeof window !== "undefined" && "performance" in window) {
      const loadTime = performance.now();
      logger.performance("Page Load", loadTime, {
        page: window.location.pathname,
      });

      // Track page load with user action tracking
      trackAction('page_view', {
        page: window.location.pathname,
        loadTime,
        referrer: document.referrer,
      });

      // Track navigation performance
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;
            const navigationTime = navEntry.loadEventEnd - navEntry.loadEventStart;
            
            logger.performance("Navigation", navigationTime, {
              type: navEntry.type,
              page: window.location.pathname,
            });

            // Track navigation performance
            trackNavigation(
              document.referrer || 'direct',
              window.location.pathname,
              {
                navigationTime,
                navigationType: navEntry.type,
              }
            );
          }
        }
      });

      try {
        observer.observe({ entryTypes: ["navigation"] });
      } catch {
        // PerformanceObserver not supported
      }

      return () => {
        try {
          observer.disconnect();
        } catch {
          // Observer already disconnected
        }
      };
    }

    return undefined;
  }, []);

  // User interaction tracking is now handled by useUserActionTracking hook

  useEffect(() => {
    // Track Web3 connection status changes
    const handleOnline = () => {
      logger.info("Network Status: Online");
    };

    const handleOffline = () => {
      logger.warn("Network Status: Offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Visibility tracking is now handled by useUserActionTracking hook

  useEffect(() => {
    // Track beforeunload for session analytics
    const handleBeforeUnload = () => {
      trackAction('navigation', {
        type: 'page_unload',
        page: window.location.pathname,
        sessionDuration: performance.now(),
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [trackAction]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook for manual error reporting with Sentry integration
 */
export function useErrorReporting() {
  const reportError = (error: Error, context?: Record<string, any>) => {
    logger.error("Manual Error Report", context, error);
    
    // Get current session information
    const sessionInfo = getCurrentSession();
    
    // Also send directly to Sentry with additional context including session
    Sentry.captureException(error, {
      contexts: {
        manualReport: context || {},
        session: sessionInfo || {},
      },
      tags: {
        reportType: "manual",
        sessionId: sessionInfo?.sessionId,
      },
      extra: {
        sessionDuration: sessionInfo?.duration,
        pageViews: sessionInfo?.pageViews,
        userActions: sessionInfo?.userActions,
      },
    });
  };

  const reportWarning = (message: string, context?: Record<string, any>) => {
    logger.warn(`Manual Warning: ${message}`, context);
    
    // Get current session information
    const sessionInfo = getCurrentSession();
    
    // Send warning to Sentry with session context
    Sentry.captureMessage(`Manual Warning: ${message}`, {
      level: "warning",
      contexts: {
        manualWarning: context || {},
        session: sessionInfo || {},
      },
      tags: {
        sessionId: sessionInfo?.sessionId,
      },
      extra: {
        sessionDuration: sessionInfo?.duration,
        pageViews: sessionInfo?.pageViews,
        userActions: sessionInfo?.userActions,
      },
    });
  };

  const reportInfo = (message: string, context?: Record<string, any>) => {
    logger.info(`Manual Info: ${message}`, context);
    
    // Get current session information
    const sessionInfo = getCurrentSession();
    
    // Send info to Sentry in development or for important events
    if (process.env.NODE_ENV === "development" || context?.important) {
      Sentry.captureMessage(`Manual Info: ${message}`, {
        level: "info",
        contexts: {
          manualInfo: context || {},
          session: sessionInfo || {},
        },
        tags: {
          sessionId: sessionInfo?.sessionId,
        },
        extra: {
          sessionDuration: sessionInfo?.duration,
          pageViews: sessionInfo?.pageViews,
          userActions: sessionInfo?.userActions,
        },
      });
    }
  };

  return {
    reportError,
    reportWarning,
    reportInfo,
  };
}

/**
 * Hook for Web3 error reporting with enhanced Sentry integration
 */
export function useWeb3ErrorReporting() {
  const reportConnectionError = (error: Error, walletType?: string) => {
    const context = {
      walletType,
      category: "web3-connection",
    };
    
    logger.captureWeb3Error(error, {
      action: "connection",
      walletType,
    });
  };

  const reportTransactionError = (
    error: Error, 
    transactionType?: string,
    transactionHash?: string,
    chainId?: number
  ) => {
    logger.captureWeb3Error(error, {
      action: "transaction",
      transactionHash,
      chainId,
    });
  };

  const reportContractError = (
    error: Error,
    contractAddress?: string,
    method?: string,
    chainId?: number,
  ) => {
    logger.captureWeb3Error(error, {
      action: "contract",
      contractAddress,
      method,
      chainId,
    });
  };

  const reportNetworkError = (error: Error, chainId?: number) => {
    logger.captureWeb3Error(error, {
      action: "network",
      chainId,
    });
  };

  const reportWalletError = (error: Error, walletType?: string, action?: string) => {
    logger.captureWeb3Error(error, {
      action: action || "wallet",
      walletType,
    });
  };

  return {
    reportConnectionError,
    reportTransactionError,
    reportContractError,
    reportNetworkError,
    reportWalletError,
  };
}
