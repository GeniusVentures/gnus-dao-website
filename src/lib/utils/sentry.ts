/**
 * Centralized Sentry Error Tracking Utilities
 * Provides comprehensive error tracking and monitoring for GNUS DAO
 */

import * as Sentry from '@sentry/nextjs';
import { isProduction, isDevelopment } from '@/lib/config/env';

/**
 * Enhanced error context interface
 */
export interface ErrorContext {
	[key: string]: any;
}

/**
 * Web3 specific error context
 */
export interface Web3ErrorContext {
	action?: string;
	chainId?: number;
	contractAddress?: string;
	method?: string;
	walletType?: string;
	transactionHash?: string;
	blockNumber?: number;
	gasUsed?: string;
	gasPrice?: string;
	[key: string]: any; // Allow additional properties for Sentry context compatibility
}

/**
 * User context for Sentry
 */
export interface UserContext {
	id?: string;
	email?: string;
	username?: string;
	walletAddress?: string;
	chainId?: number;
	walletType?: string;
}

/**
 * Enhanced session information interface
 */
export interface SessionInfo {
	sessionId: string;
	startTime: string;
	lastActivity: string;
	pageViews: number;
	userActions: number;
	currentPage: string;
	referrer?: string;
	userAgent: string;
	viewport: {
		width: number;
		height: number;
	};
	connectionType?: string;
	language: string;
	timezone: string;
	duration: number;
	[key: string]: any; // Index signature for Sentry compatibility
}

/**
 * Session tracking state
 */
let sessionInfo: SessionInfo | null = null;

/**
 * Initialize session tracking
 */
export function initializeSession(): SessionInfo {
	if (typeof window === 'undefined') {
		// Server-side fallback
		return {
			sessionId: `server-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
			startTime: new Date().toISOString(),
			lastActivity: new Date().toISOString(),
			pageViews: 0,
			userActions: 0,
			currentPage: 'server',
			userAgent: 'server',
			viewport: { width: 0, height: 0 },
			language: 'en',
			timezone: 'UTC',
			duration: 0,
		};
	}

	// Ensure error tracking is initialized before session tracking
	ensureErrorTrackingInitialized();

	const now = new Date();
	sessionInfo = {
		sessionId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
		startTime: now.toISOString(),
		lastActivity: now.toISOString(),
		pageViews: 1,
		userActions: 0,
		currentPage: window.location.pathname,
		referrer: document.referrer || undefined,
		userAgent: navigator.userAgent,
		viewport: {
			width: window.innerWidth,
			height: window.innerHeight,
		},
		connectionType: (navigator as any).connection?.effectiveType || undefined,
		language: navigator.language,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		duration: 0,
	};

	// Set initial session context in Sentry
	Sentry.setContext('session', sessionInfo);

	// Update session on page visibility change
	document.addEventListener('visibilitychange', updateSessionActivity);
	
	// Update session on page unload
	window.addEventListener('beforeunload', updateSessionActivity);

	// Update viewport on resize
	window.addEventListener('resize', () => {
		if (sessionInfo) {
			sessionInfo.viewport = {
				width: window.innerWidth,
				height: window.innerHeight,
			};
			updateSessionContext();
		}
	});

	return sessionInfo;
}

/**
 * Update session activity timestamp and context
 */
export function updateSessionActivity(): void {
	if (!sessionInfo) return;

	const now = new Date();
	sessionInfo.lastActivity = now.toISOString();
	sessionInfo.duration = now.getTime() - new Date(sessionInfo.startTime).getTime();
	
	updateSessionContext();
}

/**
 * Update session context in Sentry
 */
function updateSessionContext(): void {
	if (sessionInfo) {
		Sentry.setContext('session', sessionInfo);
	}
}

/**
 * Increment page view count
 */
export function incrementPageView(page?: string): void {
	if (!sessionInfo) {
		initializeSession();
	}
	
	if (sessionInfo) {
		sessionInfo.pageViews += 1;
		sessionInfo.currentPage = page || (typeof window !== 'undefined' ? window.location.pathname : sessionInfo.currentPage);
		updateSessionActivity();
	}
}

/**
 * Increment user action count
 */
export function incrementUserAction(): void {
	if (!sessionInfo) {
		initializeSession();
	}
	
	if (sessionInfo) {
		sessionInfo.userActions += 1;
		updateSessionActivity();
	}
}

/**
 * Get current session information
 */
export function getCurrentSession(): SessionInfo | null {
	return sessionInfo;
}

/**
 * Initialize Sentry with user context
 */
export function initializeSentryUser(user: UserContext): void {
	Sentry.setUser({
		id: user.id || user.walletAddress,
		email: user.email,
		username: user.username || user.walletAddress,
		walletAddress: user.walletAddress,
	});

	// Set additional context
	Sentry.setContext('wallet', {
		address: user.walletAddress,
		chainId: user.chainId,
		type: user.walletType,
	});

	// Ensure session is initialized when user context is set
	if (!sessionInfo) {
		initializeSession();
	}
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
	Sentry.setUser(null);
	Sentry.setContext('wallet', null);
	// Keep session context as it's independent of user authentication
}

/**
 * Capture JavaScript errors with enhanced context including session information
 */
export function captureError(
	error: Error,
	context?: ErrorContext,
	level: 'error' | 'warning' | 'info' = 'error',
): void {
	// Ensure session is initialized
	if (!sessionInfo) {
		initializeSession();
	}

	// Update session activity
	updateSessionActivity();

	Sentry.captureException(error, {
		level,
		contexts: {
			custom: context || {},
			session: sessionInfo || {},
		},
		tags: {
			errorType: 'javascript',
			environment: process.env.NODE_ENV,
			sessionId: sessionInfo?.sessionId,
		},
		extra: {
			sessionDuration: sessionInfo?.duration,
			pageViews: sessionInfo?.pageViews,
			userActions: sessionInfo?.userActions,
		},
	});
}

/**
 * Capture Web3 specific errors with session information
 */
export function captureWeb3Error(error: Error, context: Web3ErrorContext): void {
	// Ensure session is initialized
	if (!sessionInfo) {
		initializeSession();
	}

	// Update session activity
	updateSessionActivity();

	Sentry.captureException(error, {
		level: 'error',
		contexts: {
			web3: context,
			session: sessionInfo || {},
		},
		extra: {
			web3Context: context,
			sessionDuration: sessionInfo?.duration,
			pageViews: sessionInfo?.pageViews,
			userActions: sessionInfo?.userActions,
		},
		tags: {
			errorType: 'web3',
			action: context.action,
			chainId: context.chainId?.toString(),
			walletType: context.walletType,
			sessionId: sessionInfo?.sessionId,
		},
		fingerprint: ['web3-error', context.action || 'unknown', context.method || 'unknown'],
	});
}

/**
 * Capture API errors with session information
 */
export function captureApiError(
	error: Error,
	context: {
		endpoint?: string;
		method?: string;
		statusCode?: number;
		requestId?: string;
		userId?: string;
	},
): void {
	// Ensure session is initialized
	if (!sessionInfo) {
		initializeSession();
	}

	// Update session activity
	updateSessionActivity();

	Sentry.captureException(error, {
		level: 'error',
		contexts: {
			api: context,
			session: sessionInfo || {},
		},
		extra: {
			apiContext: context,
			sessionDuration: sessionInfo?.duration,
			pageViews: sessionInfo?.pageViews,
			userActions: sessionInfo?.userActions,
		},
		tags: {
			errorType: 'api',
			endpoint: context.endpoint,
			method: context.method,
			statusCode: context.statusCode?.toString(),
			sessionId: sessionInfo?.sessionId,
		},
	});
}

/**
 * Capture performance issues
 */
export function capturePerformanceIssue(
	message: string,
	context: {
		metric: string;
		value: number;
		threshold?: number;
		page?: string;
		component?: string;
	},
): void {
	Sentry.captureMessage(`Performance Issue: ${message}`, 'warning');
	
	// Add breadcrumb for performance tracking
	Sentry.addBreadcrumb({
		message: `Performance: ${context.metric} = ${context.value}ms`,
		category: 'performance',
		level: 'warning',
		data: context,
		timestamp: Date.now() / 1000,
	});
}

/**
 * Add breadcrumb for user actions with enhanced context including session information
 */
export function addUserActionBreadcrumb(action: string, data?: Record<string, any>): void {
	// Ensure session is initialized
	if (!sessionInfo) {
		initializeSession();
	}

	// Increment user action count
	incrementUserAction();

	const enrichedData = {
		...data,
		timestamp: Date.now(),
		url: typeof window !== 'undefined' ? window.location.href : undefined,
		userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
		sessionId: sessionInfo?.sessionId,
		sessionDuration: sessionInfo?.duration,
		actionSequence: sessionInfo?.userActions,
	};

	Sentry.addBreadcrumb({
		message: `User Action: ${action}`,
		category: 'user',
		level: 'info',
		data: enrichedData,
		timestamp: Date.now() / 1000,
	});

	// Also set as context for error correlation
	Sentry.setContext('lastUserAction', {
		action,
		data: enrichedData,
		timestamp: Date.now(),
		sessionInfo: sessionInfo,
	});
}

/**
 * Add breadcrumb for Web3 actions
 */
export function addWeb3ActionBreadcrumb(action: string, data?: Web3ErrorContext): void {
	Sentry.addBreadcrumb({
		message: `Web3 Action: ${action}`,
		category: 'web3',
		level: 'info',
		data: data || {},
	});
}

/**
 * Add breadcrumb for API calls
 */
export function addApiCallBreadcrumb(
	endpoint: string,
	method: string,
	statusCode?: number,
): void {
	Sentry.addBreadcrumb({
		message: `API Call: ${method} ${endpoint}`,
		category: 'http',
		level: statusCode && statusCode >= 400 ? 'error' : 'info',
		data: {
			endpoint,
			method,
			statusCode,
		},
	});
}

/**
 * Set application context
 */
export function setApplicationContext(context: {
	version?: string;
	feature?: string;
	page?: string;
	component?: string;
}): void {
	Sentry.setContext('application', context);
}

/**
 * Capture unhandled promise rejections
 */
export function setupUnhandledRejectionTracking(): void {
	if (typeof window !== 'undefined') {
		window.addEventListener('unhandledrejection', (event) => {
			const error = new Error(`Unhandled Promise Rejection: ${event.reason}`);

			Sentry.captureException(error, {
				contexts: {
					promise: {
						reason: event.reason,
					},
				},
				tags: {
					errorType: 'unhandledRejection',
				},
			});
		});
	}
}

/**
 * Capture console errors
 */
export function setupConsoleErrorTracking(): void {
	if (typeof window !== 'undefined' && isDevelopment()) {
		const originalError = console.error;
		console.error = (...args) => {
			// Call original console.error
			originalError.apply(console, args);

			// Capture to Sentry if it's an actual error
			const firstArg = args[0];
			if (firstArg instanceof Error) {
				Sentry.captureException(firstArg, {
					contexts: {
						console: {
							arguments: args.slice(1),
						},
					},
					tags: {
						errorType: 'consoleError',
					},
				});
			} else if (typeof firstArg === 'string' && firstArg.toLowerCase().includes('error')) {
				const syntheticError = new Error(firstArg);
				Sentry.captureException(syntheticError, {
					contexts: {
						console: {
							arguments: args,
						},
					},
					tags: {
						errorType: 'consoleError',
					},
				});
			}
		};
	}
}

/**
 * Wrap async functions with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	context?: ErrorContext,
): T {
	return (async (...args: Parameters<T>) => {
		try {
			return await fn(...args);
		} catch (error) {
			captureError(error as Error, {
				...context,
				functionName: fn.name,
				arguments: args,
			});
			throw error;
		}
	}) as T;
}

/**
 * Start a Sentry span for performance monitoring
 */
export function startSpan<T>(
	name: string,
	operation: string,
	callback: () => T,
	attributes?: Record<string, any>,
): T {
	return Sentry.startSpan(
		{
			name,
			op: operation,
			attributes,
		},
		callback
	);
}

/**
 * Start an async Sentry span for performance monitoring
 */
export async function startAsyncSpan<T>(
	name: string,
	operation: string,
	callback: () => Promise<T>,
	attributes?: Record<string, any>,
): Promise<T> {
	return Sentry.startSpan(
		{
			name,
			op: operation,
			attributes,
		},
		callback
	);
}

/**
 * Initialize comprehensive error tracking with session management
 */
export function initializeErrorTracking(): void {
	setupUnhandledRejectionTracking();
	setupConsoleErrorTracking();

	// Initialize session tracking
	initializeSession();

	// Set initial application context
	setApplicationContext({
		version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
		page: typeof window !== 'undefined' ? window.location.pathname : undefined,
	});

	// Track page navigation for session context
	if (typeof window !== 'undefined') {
		// Listen for navigation events
		const originalPushState = history.pushState;
		const originalReplaceState = history.replaceState;

		history.pushState = function(...args) {
			originalPushState.apply(history, args);
			incrementPageView(window.location.pathname);
		};

		history.replaceState = function(...args) {
			originalReplaceState.apply(history, args);
			incrementPageView(window.location.pathname);
		};

		window.addEventListener('popstate', () => {
			incrementPageView(window.location.pathname);
		});
	}
}

// Lazy initialization flag
let isErrorTrackingInitialized = false;

/**
 * Ensure error tracking is initialized (lazy loading)
 */
function ensureErrorTrackingInitialized(): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return;
	}

	if (!isErrorTrackingInitialized) {
		try {
			initializeErrorTracking();
			isErrorTrackingInitialized = true;
		} catch (error) {
			console.warn('Failed to initialize error tracking:', error);
		}
	}
}
