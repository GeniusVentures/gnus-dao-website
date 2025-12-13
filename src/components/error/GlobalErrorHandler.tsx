"use client";

import { logger } from "@/lib/utils/logger";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Global error handler component that sets up error tracking
 * and provides centralized error reporting
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    // Set up Sentry context for the session
    Sentry.setContext("session", {
      startTime: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
    });

    // Track page load performance
    if (typeof window !== "undefined" && "performance" in window) {
      const loadTime = performance.now();
      logger.performance("Page Load", loadTime, {
        page: window.location.pathname,
      });

      // Add Sentry breadcrumb for page load
      Sentry.addBreadcrumb({
        message: `Page loaded: ${window.location.pathname}`,
        category: "navigation",
        level: "info",
        data: {
          loadTime,
          page: window.location.pathname,
        },
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

            // Add Sentry breadcrumb for navigation performance
            Sentry.addBreadcrumb({
              message: `Navigation completed: ${navigationTime}ms`,
              category: "performance",
              level: "info",
              data: {
                type: navEntry.type,
                page: window.location.pathname,
                navigationTime,
              },
            });
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

  useEffect(() => {
    // Track user interactions for debugging
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target) {
        logger.user("Click", {
          element: target.tagName,
          className: target.className,
          id: target.id,
          text: target.textContent?.slice(0, 50),
        });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only log important key events
      if (
        event.key === "Enter" ||
        event.key === "Escape" ||
        event.metaKey ||
        event.ctrlKey
      ) {
        logger.user("Keydown", {
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
        });
      }
    };

    // Add event listeners with throttling
    let clickTimeout: ReturnType<typeof setTimeout>;
    let keyTimeout: ReturnType<typeof setTimeout>;

    const throttledClick = (event: MouseEvent) => {
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => handleClick(event), 100);
    };

    const throttledKeyDown = (event: KeyboardEvent) => {
      clearTimeout(keyTimeout);
      keyTimeout = setTimeout(() => handleKeyDown(event), 100);
    };

    document.addEventListener("click", throttledClick);
    document.addEventListener("keydown", throttledKeyDown);

    return () => {
      document.removeEventListener("click", throttledClick);
      document.removeEventListener("keydown", throttledKeyDown);
      clearTimeout(clickTimeout);
      clearTimeout(keyTimeout);
    };
  }, []);

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

  useEffect(() => {
    // Track visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logger.user("Tab Hidden");
      } else {
        logger.user("Tab Visible");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Track beforeunload for session analytics
    const handleBeforeUnload = () => {
      logger.user("Page Unload", {
        page: window.location.pathname,
        sessionDuration: performance.now(),
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * Hook for manual error reporting with Sentry integration
 */
export function useErrorReporting() {
  const reportError = (error: Error, context?: Record<string, any>) => {
    logger.error("Manual Error Report", context, error);
    
    // Also send directly to Sentry with additional context
    Sentry.captureException(error, {
      contexts: {
        manualReport: context || {},
      },
      tags: {
        reportType: "manual",
      },
    });
  };

  const reportWarning = (message: string, context?: Record<string, any>) => {
    logger.warn(`Manual Warning: ${message}`, context);
    
    // Send warning to Sentry
    Sentry.captureMessage(`Manual Warning: ${message}`, "warning");
    if (context) {
      Sentry.setContext("manualWarning", context);
    }
  };

  const reportInfo = (message: string, context?: Record<string, any>) => {
    logger.info(`Manual Info: ${message}`, context);
    
    // Send info to Sentry in development or for important events
    if (process.env.NODE_ENV === "development" || context?.important) {
      Sentry.captureMessage(`Manual Info: ${message}`, "info");
      if (context) {
        Sentry.setContext("manualInfo", context);
      }
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
