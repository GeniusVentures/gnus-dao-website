/**
 * Sentry Server Configuration
 * Error tracking and performance monitoring for server-side code
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';

Sentry.init({
	dsn: SENTRY_DSN,
	environment: ENVIRONMENT,

	// Adjust this value in production, or use tracesSampler for greater control
	tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: ENVIRONMENT === 'development',

	integrations: [Sentry.httpIntegration()],

	// Filter out sensitive data
	beforeSend(event, hint) {
		// Don't send events in development unless explicitly enabled
		if (ENVIRONMENT === 'development' && !process.env.SENTRY_DEBUG) {
			return null;
		}

		// Scrub sensitive data from request
		if (event.request) {
			// Remove sensitive headers
			const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
			if (event.request.headers) {
				sensitiveHeaders.forEach((header) => {
					if (event.request?.headers?.[header]) {
						event.request.headers[header] = '[Filtered]';
					}
				});
			}

			// Remove sensitive query params
			if (event.request.query_string) {
				const sensitiveParams = ['token', 'key', 'secret', 'password'];
				sensitiveParams.forEach((param) => {
					if (event.request?.query_string?.includes(param)) {
						event.request.query_string = '[Filtered]';
					}
				});
			}
		}

		return event;
	},

	// Ignore certain errors
	ignoreErrors: [
		// Rate limiting errors (expected)
		'Rate limit exceeded',
		'Too many requests',
	],
});
