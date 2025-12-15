"use client";

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useUserActionTracking, UserActionType, UserActionContext } from '@/hooks/useUserActionTracking';
import { usePathname, useSearchParams } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';

/**
 * User Action Tracking Context
 */
interface UserActionTrackingContextType {
  trackAction: (action: UserActionType, context?: UserActionContext) => void;
  trackClick: (element: HTMLElement, additionalContext?: UserActionContext) => void;
  trackFormSubmit: (formName: string, formData?: Record<string, any>, additionalContext?: UserActionContext) => void;
  trackNavigation: (from: string, to: string, additionalContext?: UserActionContext) => void;
  trackWalletAction: (walletAction: 'connect' | 'disconnect' | 'switch_chain' | 'sign_message' | 'send_transaction', walletAddress?: string, chainId?: number, additionalContext?: UserActionContext) => void;
  trackProposalAction: (proposalAction: 'create' | 'vote' | 'view' | 'edit', proposalId?: string, additionalContext?: UserActionContext) => void;
  trackModalAction: (modalAction: 'open' | 'close', modalName: string, additionalContext?: UserActionContext) => void;
  trackFileUpload: (fileName: string, fileSize: number, uploadResult: 'success' | 'error', additionalContext?: UserActionContext) => void;
  trackApiCall: (endpoint: string, method: string, statusCode?: number, additionalContext?: UserActionContext) => void;
  trackSearchAction: (searchQuery: string, searchType?: string, additionalContext?: UserActionContext) => void;
  trackErrorBoundary: (errorMessage: string, componentStack?: string, additionalContext?: UserActionContext) => void;
}

const UserActionTrackingContext = createContext<UserActionTrackingContextType | null>(null);

/**
 * Provider component for user action tracking
 */
export function UserActionTrackingProvider({ children }: { children: React.ReactNode }) {
  const tracking = useUserActionTracking();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathnameRef = useRef<string>(pathname);
  const sessionStartRef = useRef<number>(Date.now());
  const pageViewCountRef = useRef<number>(0);

  // Track route changes
  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    
    if (previousPathname !== pathname) {
      // Track navigation
      tracking.trackNavigation(previousPathname, pathname, {
        searchParams: searchParams?.toString(),
        pageViewCount: pageViewCountRef.current,
        sessionDuration: Date.now() - sessionStartRef.current,
      });

      // Update previous pathname
      previousPathnameRef.current = pathname;
      pageViewCountRef.current += 1;

      // Set Sentry context for current page
      Sentry.setContext('currentPage', {
        pathname,
        searchParams: searchParams?.toString(),
        pageViewCount: pageViewCountRef.current,
        sessionDuration: Date.now() - sessionStartRef.current,
      });
    }
  }, [pathname, searchParams, tracking]);

  // Track initial page load
  useEffect(() => {
    tracking.trackAction('page_view', {
      page: pathname,
      searchParams: searchParams?.toString(),
      isInitialLoad: true,
      sessionStart: sessionStartRef.current,
    });

    // Set initial Sentry user session context
    Sentry.setContext('userSession', {
      sessionId: `session-${sessionStartRef.current}`,
      startTime: sessionStartRef.current,
      initialPage: pathname,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
  }, []); // Only run once on mount

  // Track session duration periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const sessionDuration = Date.now() - sessionStartRef.current;
      
      // Update session context every 30 seconds
      Sentry.setContext('userSession', {
        sessionId: `session-${sessionStartRef.current}`,
        startTime: sessionStartRef.current,
        currentDuration: sessionDuration,
        currentPage: pathname,
        pageViewCount: pageViewCountRef.current,
      });

      // Track session heartbeat every 5 minutes
      if (sessionDuration % (5 * 60 * 1000) < 30000) { // Within 30 seconds of 5-minute mark
        tracking.trackAction('page_view', {
          type: 'session_heartbeat',
          sessionDuration,
          pageViewCount: pageViewCountRef.current,
          page: pathname,
        });
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [pathname, tracking]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      tracking.trackAction('page_view', {
        type: 'visibility_change',
        visibility: isVisible ? 'visible' : 'hidden',
        page: pathname,
        sessionDuration: Date.now() - sessionStartRef.current,
      });

      // Update Sentry context
      Sentry.setContext('pageVisibility', {
        isVisible,
        lastVisibilityChange: Date.now(),
        page: pathname,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pathname, tracking]);

  // Track window focus/blur
  useEffect(() => {
    const handleFocus = () => {
      tracking.trackAction('page_view', {
        type: 'window_focus',
        page: pathname,
        sessionDuration: Date.now() - sessionStartRef.current,
      });
    };

    const handleBlur = () => {
      tracking.trackAction('page_view', {
        type: 'window_blur',
        page: pathname,
        sessionDuration: Date.now() - sessionStartRef.current,
      });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [pathname, tracking]);

  // Track beforeunload for session end
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionDuration = Date.now() - sessionStartRef.current;
      
      tracking.trackAction('navigation', {
        type: 'session_end',
        sessionDuration,
        pageViewCount: pageViewCountRef.current,
        finalPage: pathname,
      });

      // Send final session data to Sentry
      Sentry.setContext('sessionEnd', {
        sessionId: `session-${sessionStartRef.current}`,
        duration: sessionDuration,
        pageViewCount: pageViewCountRef.current,
        finalPage: pathname,
        endTime: Date.now(),
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname, tracking]);

  // Enhanced tracking functions with session context
  const enhancedTracking: UserActionTrackingContextType = {
    trackAction: (action, context = {}) => {
      tracking.trackAction(action, {
        ...context,
        sessionDuration: Date.now() - sessionStartRef.current,
        pageViewCount: pageViewCountRef.current,
        currentPage: pathname,
      });
    },

    trackClick: (element, additionalContext = {}) => {
      tracking.trackClick(element, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        currentPage: pathname,
      });
    },

    trackFormSubmit: (formName, formData, additionalContext = {}) => {
      tracking.trackFormSubmit(formName, formData, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        currentPage: pathname,
      });
    },

    trackNavigation: (from, to, additionalContext = {}) => {
      tracking.trackNavigation(from, to, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        pageViewCount: pageViewCountRef.current,
      });
    },

    trackWalletAction: (walletAction, walletAddress, chainId, additionalContext = {}) => {
      tracking.trackWalletAction(walletAction, walletAddress, chainId, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        currentPage: pathname,
      });
    },

    trackProposalAction: (proposalAction, proposalId, additionalContext = {}) => {
      tracking.trackProposalAction(proposalAction, proposalId, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        currentPage: pathname,
      });
    },

    trackModalAction: (modalAction, modalName, additionalContext = {}) => {
      tracking.trackModalAction(modalAction, modalName, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        currentPage: pathname,
      });
    },

    trackFileUpload: (fileName, fileSize, uploadResult, additionalContext = {}) => {
      tracking.trackFileUpload(fileName, fileSize, uploadResult, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        currentPage: pathname,
      });
    },

    trackApiCall: (endpoint, method, statusCode, additionalContext = {}) => {
      tracking.trackApiCall(endpoint, method, statusCode, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        currentPage: pathname,
      });
    },

    trackSearchAction: (searchQuery, searchType, additionalContext = {}) => {
      tracking.trackSearchAction(searchQuery, searchType, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        currentPage: pathname,
      });
    },

    trackErrorBoundary: (errorMessage, componentStack, additionalContext = {}) => {
      tracking.trackErrorBoundary(errorMessage, componentStack, {
        ...additionalContext,
        sessionDuration: Date.now() - sessionStartRef.current,
        currentPage: pathname,
        pageViewCount: pageViewCountRef.current,
      });
    },
  };

  return (
    <UserActionTrackingContext.Provider value={enhancedTracking}>
      {children}
    </UserActionTrackingContext.Provider>
  );
}

/**
 * Hook to use user action tracking context
 */
export function useUserActionTrackingContext(): UserActionTrackingContextType {
  const context = useContext(UserActionTrackingContext);
  
  if (!context) {
    throw new Error('useUserActionTrackingContext must be used within a UserActionTrackingProvider');
  }
  
  return context;
}

/**
 * HOC to automatically track component mounting and unmounting
 */
export function withUserActionTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function TrackedComponent(props: P) {
    const { trackAction } = useUserActionTrackingContext();

    useEffect(() => {
      trackAction('page_view', { 
        component: componentName,
        action: 'component_mount',
      });

      return () => {
        trackAction('page_view', { 
          component: componentName,
          action: 'component_unmount',
        });
      };
    }, [trackAction]);

    return <Component {...props} />;
  };
}