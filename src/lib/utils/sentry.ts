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
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
	Sentry.setUser(null);
	Sentry.setContext('wallet', null);
}

/**
 * Capture JavaScript errors with enhanced context
 */
export function captureError(
	error: Error,
	context?: ErrorContext,
	level: 'error' | 'warning' | 'info' = 'error',
): void {
	Sentry.captureException(error, {
		level,
		contexts: {
			custom: context || {},
		},
		tags: {
			errorType: 'javascript',
			environment: process.env.NODE_ENV,
		},
	});
}

/**
 * Capture Web3 specific errors
 */
export function captureWeb3Error(error: Error, context: Web3ErrorContext): void {
	Sentry.captureException(error, {
		level: 'error',
		contexts: {
			web3: context,
		},
		tags: {
			errorType: 'web3',
			action: context.action,
			chainId: context.chainId?.toString(),
			walletType: context.walletType,
		},
		fingerprint: ['web3-error', context.action || 'unknown', context.method || 'unknown'],
	});
}

/**
 * Capture API errors
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
	Sentry.captureException(error, {
		level: 'error',
		contexts: {
			api: context,
		},
		tags: {
			errorType: 'api',
			endpoint: context.endpoint,
			method: context.method,
			statusCode: context.statusCode?.toString(),
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
	Sentry.setContext('performance', context);

	// Add breadcrumb for performance tracking
	Sentry.addBreadcrumb({
		message: `Performance: ${context.metric} = ${context.value}ms`,
		category: 'performance',
		level: 'warning',
		data: context,
	});
}

/**
 * Add breadcrumb for user actions
 */
export function addUserActionBreadcrumb(action: string, data?: Record<string, any>): void {
	Sentry.addBreadcrumb({
		message: `User Action: ${action}`,
		category: 'user',
		level: 'info',
		data: data || {},
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
 * Create a Sentry transaction for performance monitoring
 */
export function createTransaction(
	name: string,
	operation: string,
	data?: Record<string, any>,
): Sentry.Transaction | undefined {
	if (!isProduction()) {
		return undefined;
	}

	return Sentry.startTransaction({
		name,
		op: operation,
		data,
	});
}

/**
 * Finish a Sentry transaction
 */
export function finishTransaction(
	transaction: Sentry.Transaction | undefined,
	status?:
		| 'ok'
		| 'cancelled'
		| 'unknown'
		| 'invalid_argument'
		| 'deadline_exceeded'
		| 'not_found'
		| 'already_exists'
		| 'permission_denied'
		| 'resource_exhausted'
		| 'failed_precondition'
		| 'aborted'
		| 'out_of_range'
		| 'unimplemented'
		| 'internal_error'
		| 'unavailable'
		| 'data_loss'
		| 'unauthenticated',
): void {
	if (transaction) {
		transaction.setStatus(status || 'ok');
		transaction.finish();
	}
}

/**
 * Initialize comprehensive error tracking
 */
export function initializeErrorTracking(): void {
	setupUnhandledRejectionTracking();
	setupConsoleErrorTracking();

	// Set initial application context
	setApplicationContext({
		version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
		page: typeof window !== 'undefined' ? window.location.pathname : undefined,
	});
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
	initializeErrorTracking();
}
