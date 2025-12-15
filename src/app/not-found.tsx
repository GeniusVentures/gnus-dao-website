/**
 * Global Not Found Page with Sentry Integration
 * Handles 404 errors and tracks navigation issues
 */

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Home, Search, ArrowLeft } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function NotFoundPage() {
	useEffect(() => {
		// Track 404 errors for analytics
		Sentry.captureMessage(`404 Not Found: ${window.location.pathname}`, 'info');
		
		Sentry.setContext('notFound', {
			path: window.location.pathname,
			referrer: document.referrer,
			userAgent: navigator.userAgent,
		});

		// Add breadcrumb for 404
		Sentry.addBreadcrumb({
			message: `404 Not Found: ${window.location.pathname}`,
			category: 'navigation',
			level: 'info',
			data: {
				path: window.location.pathname,
				referrer: document.referrer,
			},
		});
	}, []);

	const handleGoHome = () => {
		window.location.href = '/';
	};

	const handleGoBack = () => {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			window.location.href = '/';
		}
	};

	const handleSearchProposals = () => {
		window.location.href = '/proposals';
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="max-w-md w-full text-center">
				<div className="text-6xl font-bold text-muted-foreground mb-4">404</div>
				
				<h1 className="text-3xl font-bold text-foreground mb-4">
					Page Not Found
				</h1>
				
				<p className="text-muted-foreground mb-8">
					The page you're looking for doesn't exist or has been moved. 
					Let's get you back on track.
				</p>

				<div className="space-y-4">
					<Button onClick={handleGoHome} className="w-full">
						<Home className="mr-2 h-4 w-4" />
						Go Home
					</Button>

					<Button onClick={handleSearchProposals} variant="outline" className="w-full">
						<Search className="mr-2 h-4 w-4" />
						Browse Proposals
					</Button>

					<Button onClick={handleGoBack} variant="ghost" className="w-full">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Go Back
					</Button>
				</div>

				<div className="mt-8 text-sm text-muted-foreground">
					<p>
						If you believe this is an error, please{' '}
						<a 
							href="mailto:support@gnus.ai" 
							className="text-primary hover:underline"
						>
							contact support
						</a>
						.
					</p>
				</div>
			</div>
		</div>
	);
}