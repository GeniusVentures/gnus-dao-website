/**
 * Server-side Error Tracking Middleware for Next.js
 * Ensures all server-side errors are captured and reported to Sentry
 */

import { NextRequest, NextResponse } from 'next/server';

// Conditional Sentry import to avoid issues in test environment
let Sentry: any;
try {
	Sentry = require('@sentry/nextjs');
} catch (error) {
	// Fallback for test environment or when Sentry is not available
	Sentry = {
		captureException: () => {},
		captureMessage: () => {},
		setContext: () => {},
		setUser: () => {},
		addBreadcrumb: () => {},
	};
}

/**
 * Enhanced error context for server-side errors
 */
export interface ServerErrorContext {
	endpoint?: string;
	method?: string;
	userAgent?: string;
	ip?: string;
	userId?: string;
	sessionId?: string;
	requestId?: string;
	timestamp?: string;
	[key: string]: any;
}

/**
 * Wrap Next.js API route handlers with error tracking
 */
export function withServerErrorTracking<T extends any[], R>(
	handler: (...args: T) => Promise<R>,
	context?: Partial<ServerErrorContext>,
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		const requestId = crypto.randomUUID();
		
		try {
			// Extract request information if available
			const request = args.find(arg => arg && typeof arg === 'object' && 'url' in arg) as NextRequest | undefined;
			
			if (request) {
				// Set Sentry context for this request
				Sentry.setContext('request', {
					url: request.url,
					method: request.method,
					headers: Object.fromEntries(request.headers.entries()),
					userAgent: request.headers.get('user-agent'),
					ip: request.ip || request.headers.get('x-forwarded-for'),
					requestId,
				});

				// Add breadcrumb for request
				Sentry.addBreadcrumb({
					message: `${request.method} ${request.url}`,
					category: 'http',
					level: 'info',
					data: {
						requestId,
						userAgent: request.headers.get('user-agent'),
					},
				});
			}

			// Set additional context if provided
			if (context) {
				Sentry.setContext('serverHandler', {
					...context,
					requestId,
					timestamp: new Date().toISOString(),
				});
			}

			return await handler(...args);
		} catch (error) {
			// Enhanced error context
			const errorContext: ServerErrorContext = {
				requestId,
				timestamp: new Date().toISOString(),
				...context,
			};

			// Extract additional context from request if available
			const request = args.find(arg => arg && typeof arg === 'object' && 'url' in arg) as NextRequest | undefined;
			if (request) {
				errorContext.endpoint = new URL(request.url).pathname;
				errorContext.method = request.method;
				errorContext.userAgent = request.headers.get('user-agent') || undefined;
				errorContext.ip = request.ip || request.headers.get('x-forwarded-for') || undefined;
			}

			// Capture error to Sentry
			Sentry.captureException(error as Error, {
				contexts: {
					serverError: errorContext,
				},
				tags: {
					errorType: 'serverError',
					endpoint: errorContext.endpoint,
					method: errorContext.method,
					requestId,
				},
				level: 'error',
			});

			// Re-throw the error to maintain normal error handling flow
			throw error;
		}
	};
}

/**
 * Add server-side breadcrumb
 */
export function addServerBreadcrumb(
	message: string,
	category: string = 'server',
	level: 'debug' | 'info' | 'warning' | 'error' = 'info',
	data?: Record<string, any>,
): void {
	Sentry.addBreadcrumb({
		message,
		category,
		level,
		data: data || {},
		timestamp: Date.now() / 1000,
	});
}

/**
 * Capture server-side API errors with enhanced context
 */
export function captureServerError(
	error: Error,
	context: ServerErrorContext,
): void {
	Sentry.captureException(error, {
		contexts: {
			serverError: {
				...context,
				timestamp: new Date().toISOString(),
			},
		},
		tags: {
			errorType: 'serverError',
			endpoint: context.endpoint,
			method: context.method,
		},
		level: 'error',
	});
}