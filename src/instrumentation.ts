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
				// Manual handlers removed to prevent interference with Sentry/Next.js native handling
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
