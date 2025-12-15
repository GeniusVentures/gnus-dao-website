/**
 * API Call Tracking Utilities
 * Provides comprehensive tracking for API calls to correlate with user actions and errors
 */

import { logger } from './logger';
import { captureApiError, addApiCallBreadcrumb } from './sentry';
import { criticalErrorAlerting, CriticalErrorType } from './criticalErrorAlerting';
import * as Sentry from '@sentry/nextjs';

/**
 * API call context interface
 */
export interface ApiCallContext {
  endpoint: string;
  method: string;
  requestId?: string;
  userId?: string;
  userAction?: string;
  component?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  requestSize?: number;
  retryCount?: number;
  cacheHit?: boolean;
  errorMessage?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, any>;
  bodyData?: any;
}

/**
 * API tracking configuration
 */
interface ApiTrackingConfig {
  enableLogging: boolean;
  enableSentryTracking: boolean;
  enablePerformanceTracking: boolean;
  logRequestBodies: boolean;
  logResponseBodies: boolean;
  maxBodySize: number;
  sensitiveHeaders: string[];
  sensitiveParams: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ApiTrackingConfig = {
  enableLogging: true,
  enableSentryTracking: true,
  enablePerformanceTracking: true,
  logRequestBodies: false, // Disabled by default for security
  logResponseBodies: false, // Disabled by default for security
  maxBodySize: 1024, // 1KB max for logged bodies
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-csrf-token',
  ],
  sensitiveParams: [
    'password',
    'token',
    'key',
    'secret',
    'privateKey',
    'mnemonic',
  ],
};

/**
 * Active API calls tracking
 */
const activeApiCalls = new Map<string, ApiCallContext>();

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize sensitive data from objects
 */
function sanitizeData(
  data: any,
  sensitiveKeys: string[],
  maxSize: number
): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  
  // Remove sensitive keys
  sensitiveKeys.forEach(key => {
    if (key in sanitized) {
      sanitized[key] = '[FILTERED]';
    }
  });

  // Truncate if too large
  const serialized = JSON.stringify(sanitized);
  if (serialized.length > maxSize) {
    return `[TRUNCATED: ${serialized.length} bytes, showing first ${maxSize} chars] ${serialized.substring(0, maxSize)}...`;
  }

  return sanitized;
}

/**
 * Track API call start
 */
export function trackApiCallStart(
  endpoint: string,
  method: string,
  options: {
    userId?: string;
    userAction?: string;
    component?: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, any>;
    bodyData?: any;
    config?: Partial<ApiTrackingConfig>;
  } = {}
): string {
  const requestId = generateRequestId();
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const startTime = Date.now();

  // Note: User action context will be available through breadcrumbs
  const lastUserAction = null; // Context will be captured via breadcrumbs

  const context: ApiCallContext = {
    endpoint,
    method: method.toUpperCase(),
    requestId,
    userId: options.userId,
    userAction: options.userAction || 'unknown', // Will be captured via breadcrumbs
    component: options.component,
    startTime,
    headers: config.logRequestBodies 
      ? sanitizeData(options.headers, config.sensitiveHeaders, config.maxBodySize)
      : undefined,
    queryParams: config.logRequestBodies
      ? sanitizeData(options.queryParams, config.sensitiveParams, config.maxBodySize)
      : undefined,
    bodyData: config.logRequestBodies
      ? sanitizeData(options.bodyData, config.sensitiveParams, config.maxBodySize)
      : undefined,
  };

  // Store active call
  activeApiCalls.set(requestId, context);

  // Log API call start
  if (config.enableLogging) {
    logger.info(`API Call Started: ${method.toUpperCase()} ${endpoint}`, {
      requestId,
      userAction: context.userAction,
      component: context.component,
      userId: context.userId,
    });
  }

  // Add Sentry breadcrumb
  if (config.enableSentryTracking) {
    addApiCallBreadcrumb(endpoint, method.toUpperCase());
    
    // Set API call context
    Sentry.setContext('currentApiCall', {
      requestId,
      endpoint,
      method: method.toUpperCase(),
      startTime,
      userAction: context.userAction,
      component: context.component,
    });
  }

  return requestId;
}

/**
 * Track API call completion
 */
export function trackApiCallEnd(
  requestId: string,
  statusCode: number,
  options: {
    responseSize?: number;
    responseData?: any;
    cacheHit?: boolean;
    config?: Partial<ApiTrackingConfig>;
  } = {}
): void {
  const context = activeApiCalls.get(requestId);
  if (!context) {
    logger.warn('API call end tracked for unknown request ID', { requestId });
    return;
  }

  const config = { ...DEFAULT_CONFIG, ...options.config };
  const endTime = Date.now();
  const duration = endTime - context.startTime;

  // Update context
  context.endTime = endTime;
  context.duration = duration;
  context.statusCode = statusCode;
  context.responseSize = options.responseSize;
  context.cacheHit = options.cacheHit;

  // Log API call completion
  if (config.enableLogging) {
    const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    logger[logLevel](`API Call Completed: ${context.method} ${context.endpoint}`, {
      requestId,
      statusCode,
      duration,
      responseSize: options.responseSize,
      cacheHit: options.cacheHit,
      userAction: context.userAction,
      component: context.component,
    });
  }

  // Track performance
  if (config.enablePerformanceTracking) {
    logger.performance(`API: ${context.method} ${context.endpoint}`, duration, {
      requestId,
      statusCode,
      endpoint: context.endpoint,
      method: context.method,
      cacheHit: options.cacheHit,
    });
  }

  // Add Sentry breadcrumb for completion
  if (config.enableSentryTracking) {
    Sentry.addBreadcrumb({
      message: `API Call Completed: ${context.method} ${context.endpoint}`,
      category: 'http',
      level: statusCode >= 400 ? 'error' : 'info',
      data: {
        requestId,
        statusCode,
        duration,
        endpoint: context.endpoint,
        method: context.method,
        userAction: context.userAction,
        component: context.component,
      },
      timestamp: Date.now() / 1000,
    });

    // Clear current API call context
    Sentry.setContext('currentApiCall', null);
  }

  // Remove from active calls
  activeApiCalls.delete(requestId);
}

/**
 * Track API call error
 */
export function trackApiCallError(
  requestId: string,
  error: Error,
  statusCode?: number,
  options: {
    retryCount?: number;
    config?: Partial<ApiTrackingConfig>;
  } = {}
): void {
  const context = activeApiCalls.get(requestId);
  if (!context) {
    logger.warn('API call error tracked for unknown request ID', { requestId, error: error.message });
    return;
  }

  const config = { ...DEFAULT_CONFIG, ...options.config };
  const endTime = Date.now();
  const duration = endTime - context.startTime;

  // Update context
  context.endTime = endTime;
  context.duration = duration;
  context.statusCode = statusCode;
  context.errorMessage = error.message;
  context.retryCount = options.retryCount;

  // Log API error
  if (config.enableLogging) {
    logger.error(`API Call Failed: ${context.method} ${context.endpoint}`, {
      requestId,
      statusCode,
      duration,
      errorMessage: error.message,
      retryCount: options.retryCount,
      userAction: context.userAction,
      component: context.component,
    }, error);
  }

  // Capture API error with Sentry
  if (config.enableSentryTracking) {
    captureApiError(error, {
      endpoint: context.endpoint,
      method: context.method,
      statusCode,
      requestId,
      userId: context.userId,
    });

    // Add error context
    Sentry.setContext('apiError', {
      requestId,
      endpoint: context.endpoint,
      method: context.method,
      statusCode,
      duration,
      userAction: context.userAction,
      component: context.component,
      retryCount: options.retryCount,
    });
  }

  // Check if this is a critical API error
  const isCritical = isCriticalApiError(error, statusCode, context);
  if (isCritical) {
    criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.API_CRITICAL, {
      userId: context.userId,
      endpoint: context.endpoint,
      url: context.endpoint,
      additionalData: {
        method: context.method,
        statusCode,
        duration,
        requestId,
        userAction: context.userAction,
        component: context.component,
        retryCount: options.retryCount
      }
    });
  }

  // Remove from active calls
  activeApiCalls.delete(requestId);
}

/**
 * Enhanced fetch wrapper with automatic tracking
 */
export async function trackedFetch(
  url: string,
  options: RequestInit & {
    component?: string;
    userAction?: string;
    config?: Partial<ApiTrackingConfig>;
  } = {}
): Promise<Response> {
  const { component, userAction, config, ...fetchOptions } = options;
  const method = fetchOptions.method || 'GET';
  
  // Extract endpoint from URL
  const endpoint = url.replace(/^https?:\/\/[^\/]+/, ''); // Remove domain for cleaner logging
  
  // Start tracking
  const requestId = trackApiCallStart(endpoint, method, {
    component,
    userAction,
    headers: fetchOptions.headers as Record<string, string>,
    bodyData: fetchOptions.body,
    config,
  });

  try {
    const response = await fetch(url, fetchOptions);
    
    // Track completion
    trackApiCallEnd(requestId, response.status, {
      responseSize: parseInt(response.headers.get('content-length') || '0'),
      cacheHit: response.headers.get('x-cache') === 'HIT',
      config,
    });

    return response;
  } catch (error) {
    // Track error
    trackApiCallError(requestId, error as Error, undefined, { config });
    throw error;
  }
}

/**
 * Get active API calls for debugging
 */
export function getActiveApiCalls(): ApiCallContext[] {
  return Array.from(activeApiCalls.values());
}

/**
 * Clear all active API calls (useful for cleanup)
 */
export function clearActiveApiCalls(): void {
  activeApiCalls.clear();
}

/**
 * Check if an API error is critical and requires immediate alerting
 */
function isCriticalApiError(error: Error, statusCode?: number, context?: ApiCallContext): boolean {
  // Critical status codes
  const criticalStatusCodes = [500, 502, 503, 504];
  
  // Critical endpoints
  const criticalEndpoints = [
    '/api/proposals',
    '/api/treasury',
    '/api/governance',
    '/api/voting',
    '/api/auth',
    '/api/health'
  ];

  // Critical error messages
  const criticalErrorMessages = [
    'database',
    'connection',
    'timeout',
    'unauthorized',
    'forbidden',
    'internal server error',
    'service unavailable',
    'bad gateway'
  ];

  // Check status code
  if (statusCode && criticalStatusCodes.includes(statusCode)) {
    return true;
  }

  // Check endpoint
  if (context?.endpoint && criticalEndpoints.some(endpoint => 
    context.endpoint.includes(endpoint))) {
    return true;
  }

  // Check error message
  const errorMessage = error.message.toLowerCase();
  if (criticalErrorMessages.some(keyword => errorMessage.includes(keyword))) {
    return true;
  }

  // Check for repeated failures (if retry count is high)
  if (context?.retryCount && context.retryCount >= 3) {
    return true;
  }

  return false;
}

/**
 * Higher-order function to wrap API functions with tracking
 */
export function withApiTracking<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T,
  endpoint: string,
  method: string = 'POST'
): T {
  return (async (...args: Parameters<T>) => {
    const requestId = trackApiCallStart(endpoint, method, {
      bodyData: args[0], // Assume first argument is request data
    });

    try {
      const result = await apiFunction(...args);
      trackApiCallEnd(requestId, 200); // Assume success if no error thrown
      return result;
    } catch (error) {
      trackApiCallError(requestId, error as Error);
      throw error;
    }
  }) as T;
}