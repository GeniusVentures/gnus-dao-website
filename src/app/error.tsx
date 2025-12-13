'use client';

/**
 * Global Error Page with Sentry Integration
 * Handles application-level errors and provides user-friendly error reporting
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Home, RefreshCw, Bug } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

interface ErrorPageProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
	useEffect(() => {
		// Capture the error to Sentry
		Sentry.captureException(error, {
			contexts: {
				errorPage: {
					digest: error.digest,
					message: error.message,
					stack: error.stack,
				},
			},
			tags: {
				errorType: 'pageError',
				errorBoundary: 'global',
			},
		});
	}, [error]);

	const handleReportError = () => {
		// Create detailed error report
		const errorReport = {
			message: error.message,
			stack: error.stack,
			digest: error.digest,
			userAgent: navigator.userAgent,
			url: window.location.href,
			timestamp: new Date().toISOString(),
		};

		// Copy to clipboard
		navigator.clipboard
			.writeText(JSON.stringify(errorReport, null, 2))
			.then(() => {
				alert('Error report copied to clipboard. Please share this with our support team.');
			})
			.catch(() => {
				alert('Failed to copy error report. Please manually report this issue.');
			});
	};

	const handleGoHome = () => {
		window.location.href = '/';
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="max-w-md w-full text-center">
				<AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-6" />
				
				<h1 className="text-3xl font-bold text-foreground mb-4">
					Something went wrong
				</h1>
				
				<p className="text-muted-foreground mb-8">
					We encountered an unexpected error. Our team has been automatically notified 
					and is working to fix the issue.
				</p>

				<div className="space-y-4">
					<Button onClick={reset} className="w-full">
						<RefreshCw className="mr-2 h-4 w-4" />
						Try Again
					</Button>

					<Button onClick={handleGoHome} variant="outline" className="w-full">
						<Home className="mr-2 h-4 w-4" />
						Go Home
					</Button>

					<Button 
						onClick={handleReportError} 
						variant="ghost" 
						size="sm" 
						className="w-full"
					>
						<Bug className="mr-2 h-4 w-4" />
						Copy Error Report
					</Button>
				</div>

				{process.env.NODE_ENV === 'development' && (
					<details className="mt-8 text-left">
						<summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-2">
							Error Details (Development Only)
						</summary>
						<div className="p-4 bg-muted rounded-md text-xs font-mono text-left">
							<div className="mb-2">
								<strong>Message:</strong> {error.message}
							</div>
							{error.digest && (
								<div className="mb-2">
									<strong>Digest:</strong> {error.digest}
								</div>
							)}
							{error.stack && (
								<div>
									<strong>Stack:</strong>
									<pre className="whitespace-pre-wrap mt-1">
										{error.stack}
									</pre>
								</div>
							)}
						</div>
					</details>
				)}
			</div>
		</div>
	);
}