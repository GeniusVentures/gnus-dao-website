"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import { addUserActionBreadcrumb, incrementUserAction, getCurrentSession } from '@/lib/utils/sentry';
import { logger } from '@/lib/utils/logger';
import * as Sentry from '@sentry/nextjs';

/**
 * User action types for tracking
 */
export type UserActionType = 
  | 'click'
  | 'form_submit'
  | 'form_input'
  | 'navigation'
  | 'wallet_connect'
  | 'wallet_disconnect'
  | 'proposal_create'
  | 'proposal_vote'
  | 'modal_open'
  | 'modal_close'
  | 'file_upload'
  | 'search'
  | 'filter'
  | 'sort'
  | 'page_view'
  | 'error_boundary'
  | 'web3_transaction'
  | 'api_call';

/**
 * User action context interface
 */
export interface UserActionContext {
  element?: string;
  elementId?: string;
  elementClass?: string;
  elementText?: string;
  page?: string;
  component?: string;
  proposalId?: string;
  walletAddress?: string;
  chainId?: number;
  transactionHash?: string;
  errorMessage?: string;
  formData?: Record<string, any>;
  searchQuery?: string;
  filterValue?: string;
  sortBy?: string;
  fileSize?: number;
  fileName?: string;
  apiEndpoint?: string;
  httpMethod?: string;
  statusCode?: number;
  [key: string]: any;
}

/**
 * User action tracking configuration
 */
interface UserActionTrackingConfig {
  enableBreadcrumbs: boolean;
  enableLogging: boolean;
  enableSentryContext: boolean;
  maxBreadcrumbs: number;
  throttleMs: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: UserActionTrackingConfig = {
  enableBreadcrumbs: true,
  enableLogging: true,
  enableSentryContext: true,
  maxBreadcrumbs: 50,
  throttleMs: 100,
};

/**
 * Hook for comprehensive user action tracking
 */
export function useUserActionTracking(config: Partial<UserActionTrackingConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const throttleRef = useRef<Map<string, number>>(new Map());
  const actionSequenceRef = useRef<number>(0);

  /**
   * Track a user action with context
   */
  const trackAction = useCallback((
    action: UserActionType,
    context: UserActionContext = {}
  ) => {
    const now = Date.now();
    const throttleKey = `${action}-${context.element || 'unknown'}`;
    const lastTracked = throttleRef.current.get(throttleKey) || 0;

    // Throttle rapid actions
    if (now - lastTracked < finalConfig.throttleMs) {
      return;
    }

    throttleRef.current.set(throttleKey, now);
    actionSequenceRef.current += 1;

    // Get current session information
    const sessionInfo = getCurrentSession();
    
    const enrichedContext = {
      ...context,
      timestamp: now,
      sequence: actionSequenceRef.current,
      page: context.page || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      sessionId: sessionInfo?.sessionId,
      sessionDuration: sessionInfo?.duration,
      totalPageViews: sessionInfo?.pageViews,
      totalUserActions: sessionInfo?.userActions,
    };

    // Add Sentry breadcrumb
    if (finalConfig.enableBreadcrumbs) {
      addUserActionBreadcrumb(action, enrichedContext);
    }

    // Log action
    if (finalConfig.enableLogging) {
      logger.user(`Action: ${action}`, enrichedContext);
    }

    // Set Sentry context for error correlation
    if (finalConfig.enableSentryContext) {
      Sentry.setContext('lastUserAction', {
        action,
        context: enrichedContext,
        timestamp: now,
        sessionInfo: sessionInfo,
      });

      // Update user activity context with session information
      Sentry.setContext('userActivity', {
        lastAction: action,
        actionCount: actionSequenceRef.current,
        lastActiveTime: now,
        sessionId: sessionInfo?.sessionId,
        sessionDuration: sessionInfo?.duration,
        totalPageViews: sessionInfo?.pageViews,
        totalUserActions: sessionInfo?.userActions,
      });
    }
  }, [finalConfig]);

  /**
   * Track click events with enhanced context
   */
  const trackClick = useCallback((
    element: HTMLElement,
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      element: element.tagName.toLowerCase(),
      elementId: element.id || undefined,
      elementClass: element.className || undefined,
      elementText: element.textContent?.slice(0, 100) || undefined,
      ...additionalContext,
    };

    trackAction('click', context);
  }, [trackAction]);

  /**
   * Track form submissions
   */
  const trackFormSubmit = useCallback((
    formName: string,
    formData?: Record<string, any>,
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      component: formName,
      formData: formData ? Object.keys(formData).reduce((acc, key) => {
        // Sanitize sensitive data
        const sensitiveKeys = ['password', 'privateKey', 'mnemonic', 'secret'];
        acc[key] = sensitiveKeys.some(sk => key.toLowerCase().includes(sk)) 
          ? '[FILTERED]' 
          : formData[key];
        return acc;
      }, {} as Record<string, any>) : undefined,
      ...additionalContext,
    };

    trackAction('form_submit', context);
  }, [trackAction]);

  /**
   * Track navigation events
   */
  const trackNavigation = useCallback((
    from: string,
    to: string,
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      from,
      to,
      ...additionalContext,
    };

    trackAction('navigation', context);
  }, [trackAction]);

  /**
   * Track wallet interactions
   */
  const trackWalletAction = useCallback((
    walletAction: 'connect' | 'disconnect' | 'switch_chain' | 'sign_message' | 'send_transaction',
    walletAddress?: string,
    chainId?: number,
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      walletAddress,
      chainId,
      ...additionalContext,
    };

    const actionType = walletAction === 'connect' ? 'wallet_connect' : 
                      walletAction === 'disconnect' ? 'wallet_disconnect' : 
                      'web3_transaction';

    trackAction(actionType, context);
  }, [trackAction]);

  /**
   * Track proposal-related actions
   */
  const trackProposalAction = useCallback((
    proposalAction: 'create' | 'vote' | 'view' | 'edit',
    proposalId?: string,
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      proposalId,
      ...additionalContext,
    };

    const actionType = proposalAction === 'create' ? 'proposal_create' : 
                      proposalAction === 'vote' ? 'proposal_vote' : 
                      'click';

    trackAction(actionType, context);
  }, [trackAction]);

  /**
   * Track modal interactions
   */
  const trackModalAction = useCallback((
    modalAction: 'open' | 'close',
    modalName: string,
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      component: modalName,
      ...additionalContext,
    };

    const actionType = modalAction === 'open' ? 'modal_open' : 'modal_close';
    trackAction(actionType, context);
  }, [trackAction]);

  /**
   * Track file upload actions
   */
  const trackFileUpload = useCallback((
    fileName: string,
    fileSize: number,
    uploadResult: 'success' | 'error',
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      fileName,
      fileSize,
      uploadResult,
      ...additionalContext,
    };

    trackAction('file_upload', context);
  }, [trackAction]);

  /**
   * Track API calls for error correlation
   */
  const trackApiCall = useCallback((
    endpoint: string,
    method: string,
    statusCode?: number,
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      apiEndpoint: endpoint,
      httpMethod: method,
      statusCode,
      ...additionalContext,
    };

    trackAction('api_call', context);
  }, [trackAction]);

  /**
   * Track search and filter actions
   */
  const trackSearchAction = useCallback((
    searchQuery: string,
    searchType: string = 'general',
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      searchQuery: searchQuery.slice(0, 100), // Limit query length
      searchType,
      ...additionalContext,
    };

    trackAction('search', context);
  }, [trackAction]);

  /**
   * Track error boundary activations
   */
  const trackErrorBoundary = useCallback((
    errorMessage: string,
    componentStack?: string,
    additionalContext: UserActionContext = {}
  ) => {
    const context: UserActionContext = {
      errorMessage: errorMessage.slice(0, 200),
      componentStack: componentStack?.slice(0, 500),
      ...additionalContext,
    };

    trackAction('error_boundary', context);
  }, [trackAction]);

  /**
   * Set up automatic DOM event tracking
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target) {
        trackClick(target);
      }
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      if (form) {
        const formData = new FormData(form);
        const formObject = Object.fromEntries(formData.entries());
        trackFormSubmit(form.name || form.id || 'unnamed-form', formObject);
      }
    };

    // Throttled event listeners
    let clickTimeout: ReturnType<typeof setTimeout>;
    let submitTimeout: ReturnType<typeof setTimeout>;

    const throttledClick = (event: MouseEvent) => {
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => handleClick(event), finalConfig.throttleMs);
    };

    const throttledSubmit = (event: SubmitEvent) => {
      clearTimeout(submitTimeout);
      submitTimeout = setTimeout(() => handleSubmit(event), finalConfig.throttleMs);
    };

    document.addEventListener('click', throttledClick);
    document.addEventListener('submit', throttledSubmit);

    return () => {
      document.removeEventListener('click', throttledClick);
      document.removeEventListener('submit', throttledSubmit);
      clearTimeout(clickTimeout);
      clearTimeout(submitTimeout);
    };
  }, [trackClick, trackFormSubmit, finalConfig.throttleMs]);

  /**
   * Track page visibility changes
   */
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      trackAction('page_view', {
        visibility: document.hidden ? 'hidden' : 'visible',
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [trackAction]);

  return {
    trackAction,
    trackClick,
    trackFormSubmit,
    trackNavigation,
    trackWalletAction,
    trackProposalAction,
    trackModalAction,
    trackFileUpload,
    trackApiCall,
    trackSearchAction,
    trackErrorBoundary,
  };
}

/**
 * Higher-order component for automatic action tracking
 */
export function withUserActionTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function TrackedComponent(props: P) {
    const { trackAction } = useUserActionTracking();

    useEffect(() => {
      trackAction('page_view', { component: componentName });
    }, [trackAction]);

    return <Component {...props} />;
  };
}