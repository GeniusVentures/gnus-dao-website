/**
 * Next.js Middleware with Sentry Error Tracking
 * Handles request-level error tracking and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function middleware(request: NextRequest) {
	try {
		// Set request context for Sentry
		Sentry.setContext('request', {
			url: request.url,
			method: request.method,
			userAgent: request.headers.get('user-agent'),
			ip: request.ip || request.headers.get('x-forwarded-for'),
			referer: request.headers.get('referer'),
		});

		// Add breadcrumb for request
		Sentry.addBreadcrumb({
			message: `${request.method} ${request.url}`,
			category: 'http',
			level: 'info',
			data: {
				url: request.url,
				method: request.method,
				userAgent: request.headers.get('user-agent'),
			},
		});

		// Continue with the request
		const response = NextResponse.next();

		// Add security headers
		response.headers.set('X-Frame-Options', 'DENY');
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

		return response;
	} catch (error) {
		// Capture middleware errors
		Sentry.captureException(error, {
			contexts: {
				middleware: {
					url: request.url,
					method: request.method,
				},
			},
			tags: {
				errorType: 'middleware',
			},
		});

		// Continue with the request even if middleware fails
		return NextResponse.next();
	}
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		'/((?!api|_next/static|_next/image|favicon.ico).*)',
	],
};
