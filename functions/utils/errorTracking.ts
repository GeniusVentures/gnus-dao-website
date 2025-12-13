/**
 * Error Tracking Utility for Cloudflare Workers
 * Provides error logging and tracking for API endpoints with Sentry integration
 */

import * as Sentry from '@sentry/nextjs';

export interface ErrorContext {
	[key: string]: any;
}

export interface ErrorTrackingConfig {
	sentryDsn?: string;
	environment?: string;
	release?: string;
}

/**
 * Log error to Sentry (Enhanced with @sentry/nextjs integration)
 */
export async function captureException(
	error: Error,
	context?: ErrorContext,
	config?: ErrorTrackingConfig,
): Promise<void> {
	const { sentryDsn, environment = 'production', release } = config || {};

	// Always log to console for debugging
	console.error('Error:', error.message, context);

	try {
		// Use Sentry SDK if available (preferred method)
		if (typeof Sentry !== 'undefined' && Sentry.captureException) {
			Sentry.captureException(error, {
				contexts: {
					cloudflareWorker: context || {},
				},
				tags: {
					runtime: 'cloudflare-workers',
					environment,
					...(release && { release }),
				},
			});
			return;
		}

		// Fallback to direct Sentry API for Cloudflare Workers
		if (!sentryDsn) {
			return;
		}

		// Extract Sentry project info from DSN
		const dsnMatch = sentryDsn.match(/https:\/\/(.+)@(.+)\/(.+)/);
		if (!dsnMatch) {
			console.error('Invalid Sentry DSN');
			return;
		}

		const [, key, host, projectId] = dsnMatch;

		// Create Sentry event
		const event = {
			event_id: crypto.randomUUID().replace(/-/g, ''),
			timestamp: Date.now() / 1000,
			platform: 'javascript',
			environment,
			release,
			exception: {
				values: [
					{
						type: error.name,
						value: error.message,
						stacktrace: {
							frames: parseStackTrace(error.stack || ''),
						},
					},
				],
			},
			contexts: context || {},
			tags: {
				runtime: 'cloudflare-workers',
			},
		};

		// Send to Sentry
		const response = await fetch(`https://${host}/api/${projectId}/store/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=cloudflare-workers/1.0.0`,
			},
			body: JSON.stringify(event),
		});

		if (!response.ok) {
			console.error('Failed to send error to Sentry:', response.statusText);
		}
	} catch (err) {
		console.error('Error sending to Sentry:', err);
	}
}

/**
 * Parse stack trace into Sentry format
 */
function parseStackTrace(stack: string): any[] {
	const lines = stack.split('\n').slice(1); // Skip first line (error message)
	return lines
		.map((line) => {
			const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
			if (match) {
				const [, func, filename, lineno, colno] = match;
				return {
					function: func,
					filename,
					lineno: parseInt(lineno),
					colno: parseInt(colno),
				};
			}
			return null;
		})
		.filter(Boolean);
}

/**
 * Wrap API handler with error tracking (for Cloudflare Pages Functions)
 */
export function withErrorTracking<Env = any>(
	handler: PagesFunction<Env>,
	config?: ErrorTrackingConfig,
): PagesFunction<Env> {
	return async (context) => {
		try {
			// Set Sentry context for this request
			if (typeof Sentry !== 'undefined') {
				Sentry.setContext('request', {
					url: context.request.url,
					method: context.request.method,
					headers: Object.fromEntries(context.request.headers.entries()),
					userAgent: context.request.headers.get('user-agent'),
				});

				// Add breadcrumb for request
				Sentry.addBreadcrumb({
					message: `${context.request.method} ${context.request.url}`,
					category: 'http',
					level: 'info',
				});
			}

			return await handler(context);
		} catch (error) {
			// Enhanced error context
			const errorContext = {
				url: context.request.url,
				method: context.request.method,
				userAgent: context.request.headers.get('user-agent'),
				timestamp: new Date().toISOString(),
				...(context.env && { environment: context.env }),
			};

			// Log error with enhanced context
			await captureException(error as Error, errorContext, config);

			// Return error response
			return new Response(
				JSON.stringify({
					error: 'Internal server error',
					message: 'An unexpected error occurred',
					...(config?.environment === 'development' && {
						details: (error as Error).message,
					}),
				}),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				},
			);
		}
	};
}

/**
 * Log message to console with context
 */
export function logError(message: string, context?: ErrorContext): void {
	console.error(`[ERROR] ${message}`, context || {});
}

export function logWarning(message: string, context?: ErrorContext): void {
	console.warn(`[WARNING] ${message}`, context || {});
}

export function logInfo(message: string, context?: ErrorContext): void {
	console.log(`[INFO] ${message}`, context || {});
}

/**
 * Capture message to Sentry
 */
export function captureMessage(
	message: string,
	level: 'debug' | 'info' | 'warning' | 'error' = 'info',
	context?: ErrorContext,
): void {
	console.log(`[${level.toUpperCase()}] ${message}`, context || {});

	if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
		Sentry.captureMessage(message, level);
		if (context) {
			Sentry.setContext('message', context);
		}
	}
}

/**
 * Set user context for Sentry in Cloudflare Workers
 */
export function setUser(user: {
	id?: string;
	email?: string;
	username?: string;
	address?: string;
}): void {
	if (typeof Sentry !== 'undefined' && Sentry.setUser) {
		Sentry.setUser(user);
	}
}

/**
 * Add breadcrumb for Sentry in Cloudflare Workers
 */
export function addBreadcrumb(
	message: string,
	category?: string,
	level?: 'debug' | 'info' | 'warning' | 'error',
): void {
	if (typeof Sentry !== 'undefined' && Sentry.addBreadcrumb) {
		Sentry.addBreadcrumb({
			message,
			category: category || 'custom',
			level: level || 'info',
			timestamp: Date.now() / 1000,
		});
	}
}
