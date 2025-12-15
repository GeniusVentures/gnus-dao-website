/**
 * Sentry Client Configuration
 * Error tracking and performance monitoring for client-side code
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

// Only initialize Sentry if we have a DSN and we're in the browser
if (SENTRY_DSN && typeof window !== 'undefined') {
	Sentry.init({
		dsn: SENTRY_DSN,
		environment: ENVIRONMENT,

		// Adjust this value in production, or use tracesSampler for greater control
		tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

		// Setting this option to true will print useful information to the console while you're setting up Sentry.
		debug: false, // Disable debug to prevent console spam

		// Replay configuration for session replay
		replaysOnErrorSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0.0,
		replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0.0,

		integrations: [
			Sentry.replayIntegration({
				maskAllText: true,
				blockAllMedia: true,
			}),
			Sentry.browserTracingIntegration({
				// Enhanced performance tracking
				enableLongTask: true,
				enableInp: true,
			}),
		],

		// Filter out sensitive data
		beforeSend(event) {
			// Don't send events in development unless explicitly enabled
			if (ENVIRONMENT === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
				return null;
			}

			// Filter out wallet-related errors that are expected
			if (event.exception?.values?.[0]?.value?.includes('User rejected')) {
				return null;
			}

			// Scrub sensitive data from breadcrumbs
			if (event.breadcrumbs) {
				event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
					if (breadcrumb.data) {
						// Remove private keys, mnemonics, etc.
						const sensitiveKeys = ['privateKey', 'mnemonic', 'seed', 'password', 'token'];
						sensitiveKeys.forEach((key) => {
							if (breadcrumb.data?.[key]) {
								breadcrumb.data[key] = '[Filtered]';
							}
						});
					}
					return breadcrumb;
				});
			}

			return event;
		},

		// Ignore certain errors
		ignoreErrors: [
			// Browser extensions
			'top.GLOBALS',
			'chrome-extension://',
			'moz-extension://',
			// Network errors
			'NetworkError',
			'Failed to fetch',
			// Wallet errors
			'User rejected the request',
			'User denied transaction signature',
			'MetaMask Tx Signature: User denied transaction signature',
		],

		// Don't report errors from certain URLs
		denyUrls: [
			// Browser extensions
			/extensions\//i,
			/^chrome:\/\//i,
			/^moz-extension:\/\//i,
		],
	});
}
