/**
 * Error Tracking Utility for Cloudflare Workers
 * Provides error logging and tracking for API endpoints with Sentry integration
 * 
 * Note: This uses direct Sentry API calls instead of @sentry/nextjs since we're
 * running in Cloudflare Workers environment, not Next.js server.
 */

export interface ErrorContext {
	[key: string]: any;
}

export interface ErrorTrackingConfig {
	sentryDsn?: string;
	environment?: string;
	release?: string;
}

/**
 * Log error to Sentry using direct API (Workers-compatible)
 */
export async function captureException(
	error: Error,
	context?: ErrorContext,
	config?: ErrorTrackingConfig,
): Promise<void> {
	const { sentryDsn, environment = 'production', release } = config || {};

	// Always log to console for debugging
	console.error('Error:', error.message, context);

	// Use direct Sentry API for Cloudflare Workers
	if (!sentryDsn) {
		return;
	}

	try {
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
 * Capture message to Sentry using direct API
 */
export function captureMessage(
	message: string,
	level: 'debug' | 'info' | 'warning' | 'error' = 'info',
	context?: ErrorContext,
): void {
	console.log(`[${level.toUpperCase()}] ${message}`, context || {});
	// Note: For full message capture, implement direct Sentry API call similar to captureException
	// For now, messages are logged to console for Workers debugging
}

/**
 * Set user context (stored for future error reports)
 * Note: In Workers, user context should be passed with each captureException call
 */
export function setUser(user: {
	id?: string;
	email?: string;
	username?: string;
	address?: string;
}): void {
	// In Cloudflare Workers, user context is passed directly with error reports
	// This is a no-op for compatibility with client-side code
	console.log('[Sentry] User context set:', user.id || user.address);
}

/**
 * Add breadcrumb (logged to console in Workers environment)
 * Note: In Workers, breadcrumbs should be collected and sent with error reports
 */
export function addBreadcrumb(
	message: string,
	category?: string,
	level?: 'debug' | 'info' | 'warning' | 'error',
): void {
	// In Cloudflare Workers, breadcrumbs are logged to console
	// For production, consider implementing a breadcrumb buffer
	console.log(`[Breadcrumb] ${category || 'custom'}: ${message}`);
}
