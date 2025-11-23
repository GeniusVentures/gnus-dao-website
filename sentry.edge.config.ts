/**
 * Sentry Edge Configuration
 * Error tracking for Edge Runtime (Middleware, Edge API Routes)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';

Sentry.init({
	dsn: SENTRY_DSN,
	environment: ENVIRONMENT,

	// Adjust this value in production
	tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: ENVIRONMENT === 'development',

	// Filter out sensitive data
	beforeSend(event, hint) {
		// Don't send events in development unless explicitly enabled
		if (ENVIRONMENT === 'development' && !process.env.SENTRY_DEBUG) {
			return null;
		}

		return event;
	},
});
