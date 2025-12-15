/**
 * Next.js Instrumentation
 * Loads Sentry configuration for different runtimes
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
	try {
		if (process.env.NEXT_RUNTIME === 'nodejs') {
			await import('../sentry.server.config');
			
			// Initialize server-side error tracking
			if (typeof process !== 'undefined') {
				// Setup global error handlers for server-side
				process.on('uncaughtException', (error) => {
					console.error('Uncaught Exception:', error);
					try {
						const Sentry = require('@sentry/nextjs');
						Sentry.captureException(error, {
							tags: { errorType: 'uncaughtException' },
							level: 'fatal',
						});
					} catch (sentryError) {
						console.error('Failed to capture exception in Sentry:', sentryError);
					}
				});

				process.on('unhandledRejection', (reason, _promise) => {
					console.error('Unhandled Rejection:', reason);
					try {
						const Sentry = require('@sentry/nextjs');
						const error = reason instanceof Error ? reason : new Error(String(reason));
						Sentry.captureException(error, {
							tags: { errorType: 'unhandledRejection' },
							level: 'error',
						});
					} catch (sentryError) {
						console.error('Failed to capture rejection in Sentry:', sentryError);
					}
				});
			}
		}

		if (process.env.NEXT_RUNTIME === 'edge') {
			await import('../sentry.edge.config');
		}
	} catch (error) {
		console.error('Failed to initialize instrumentation:', error);
	}
}

export const onRequestError = Sentry.captureRequestError;
