/**
 * Cloudflare Pages Functions Middleware
 * Applies security headers and request logging to all requests
 * Runs before routing to specific functions
 */

import { captureException, addBreadcrumb, logInfo } from './utils/errorTracking';

interface Env {
	SENTRY_DSN?: string;
	ENVIRONMENT?: string;
}

/**
 * Middleware handler that runs for all requests
 * Adds security headers and request logging
 */
const middleware: PagesFunction<Env> = async (context) => {
	const { request, env, next } = context;
	const startTime = Date.now();

	try {
		// Log request for debugging
		logInfo('Incoming request', {
			url: request.url,
			method: request.method,
			userAgent: request.headers.get('user-agent'),
			referer: request.headers.get('referer'),
		});

		// Add breadcrumb for Sentry tracking
		addBreadcrumb(
			`${request.method} ${new URL(request.url).pathname}`,
			'http',
			'info',
		);

		// Continue to the next handler (specific function or static asset)
		const response = await next();

		// Clone response to modify headers (Response objects are immutable)
		const modifiedResponse = new Response(response.body, response);

		// Add security headers
		modifiedResponse.headers.set('X-Frame-Options', 'DENY');
		modifiedResponse.headers.set('X-Content-Type-Options', 'nosniff');
		modifiedResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
		modifiedResponse.headers.set('X-XSS-Protection', '1; mode=block');

		// Add response time header for monitoring
		const responseTime = Date.now() - startTime;
		modifiedResponse.headers.set('X-Response-Time', `${responseTime}ms`);

		// Log response for debugging
		logInfo('Response sent', {
			url: request.url,
			status: modifiedResponse.status,
			responseTime: `${responseTime}ms`,
		});

		return modifiedResponse;
	} catch (error) {
		// Capture middleware errors with Sentry
		await captureException(error as Error, {
			middleware: {
				url: request.url,
				method: request.method,
				userAgent: request.headers.get('user-agent'),
			},
			errorType: 'middleware',
		}, {
			sentryDsn: env.SENTRY_DSN,
			environment: env.ENVIRONMENT || 'production',
		});

		// Continue with the request even if middleware fails
		// This ensures the application remains functional
		return await next();
	}
};

export const onRequest = middleware;
