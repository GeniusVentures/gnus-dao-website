/**
 * Cloudflare Worker: Performance Metrics Endpoint
 * Provides performance data for monitoring and health checks
 * GET /api/performance - Returns performance metrics
 * POST /api/performance - Accepts client-side performance data
 */

import { withErrorTracking } from '../utils/errorTracking';

interface Env {
	// Add any environment variables needed for performance monitoring
	SENTRY_DSN?: string;
	ENVIRONMENT?: string;
}

interface CloudflareRequestInfo {
	region?: string;
	colo?: string;
	country?: string;
	city?: string;
}

interface PerformanceData {
	timestamp: string;
	worker: {
		region?: string;
		colo?: string;
		environment: string;
	};
	metrics: {
		webVitals: {
			available: boolean;
			message: string;
		};
		api: {
			responseTime: number;
			status: string;
		};
	};
	health: {
		status: string;
		checks: {
			worker: boolean;
			timestamp: boolean;
		};
	};
}

const handler: PagesFunction<Env> = async (context) => {
	const { request, env } = context;

	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	}

	const startTime = Date.now();

	try {
		if (request.method === 'GET') {
			return await handleGetRequest(request, env, startTime);
		} else if (request.method === 'POST') {
			return await handlePostRequest(request, env, startTime);
		} else {
			return new Response(JSON.stringify({ error: 'Method not allowed' }), {
				status: 405,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
	} catch (error) {
		console.error('Performance API error:', error);

		return new Response(JSON.stringify({
			error: 'Internal server error',
			timestamp: new Date().toISOString(),
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}
};

async function handleGetRequest(request: Request, env: Env, startTime: number): Promise<Response> {
	// Get query parameters
	const url = new URL(request.url);
	const format = url.searchParams.get('format') || 'json';
	const includeDetails = url.searchParams.get('details') === 'true';

	// Get Cloudflare request info safely
	const cfInfo = (request as any).cf as CloudflareRequestInfo | undefined;

	// Simulate performance data collection for Cloudflare Workers
	const performanceData: PerformanceData = {
		timestamp: new Date().toISOString(),
		worker: {
			region: cfInfo?.region || 'unknown',
			colo: cfInfo?.colo || 'unknown',
			environment: env.ENVIRONMENT || 'production',
		},
		metrics: {
			webVitals: {
				// These would be collected from client-side and stored
				available: false,
				message: 'Web Vitals are collected client-side',
			},
			api: {
				responseTime: Date.now() - startTime,
				status: 'healthy',
			},
		},
		health: {
			status: 'healthy',
			checks: {
				worker: true,
				timestamp: Date.now() > 0,
			},
		},
	};

	// Add detailed information if requested
	if (includeDetails) {
		(performanceData as any).details = {
			cf: cfInfo,
			headers: Object.fromEntries(request.headers.entries()),
			environment: env.ENVIRONMENT,
		};
	}

	// Return appropriate format
	if (format === 'prometheus') {
		// Return Prometheus-style metrics
		const prometheusMetrics = `
# HELP gnus_dao_api_response_time API response time in milliseconds
# TYPE gnus_dao_api_response_time gauge
gnus_dao_api_response_time ${performanceData.metrics.api.responseTime}

# HELP gnus_dao_worker_region Cloudflare worker region
# TYPE gnus_dao_worker_region gauge
gnus_dao_worker_region{region="${performanceData.worker.region}",colo="${performanceData.worker.colo}"} 1
		`.trim();

		return new Response(prometheusMetrics, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	return new Response(JSON.stringify(performanceData), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Access-Control-Allow-Origin': '*',
		},
	});
}

async function handlePostRequest(request: Request, env: Env, startTime: number): Promise<Response> {
	try {
		// Parse client-side performance data
		const body = await request.json();
		
		// Validate the performance data
		if (!body || typeof body !== 'object') {
			return new Response(JSON.stringify({ error: 'Invalid performance data' }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Process Web Vitals data from client
		// In a real implementation, you might store this data or send to monitoring service
		const processedMetrics: any = {
			received: true,
			timestamp: new Date().toISOString(),
			source: 'client',
			environment: env.ENVIRONMENT || 'production',
		};

		if (body.webVitals) {
			processedMetrics.webVitals = {};
			Object.entries(body.webVitals).forEach(([metric, data]: [string, any]) => {
				if (data && typeof data.value === 'number') {
					processedMetrics.webVitals[metric] = {
						value: data.value,
						rating: data.rating,
						processed: true,
					};

					// Log performance issues
					if (data.rating === 'poor') {
						console.warn(`Poor Web Vital: ${metric} = ${data.value}ms`);
					}
				}
			});
		}

		// Process custom metrics from client
		if (body.customMetrics) {
			processedMetrics.customMetrics = {};
			Object.entries(body.customMetrics).forEach(([metric, data]: [string, any]) => {
				if (data && typeof data.value === 'number') {
					processedMetrics.customMetrics[metric] = {
						value: data.value,
						processed: true,
					};
				}
			});
		}

		// Record processing time
		const processingTime = Date.now() - startTime;

		return new Response(JSON.stringify({
			status: 'success',
			message: 'Performance data recorded',
			processingTime,
			timestamp: new Date().toISOString(),
			processed: processedMetrics,
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});

	} catch (error) {
		console.error('Performance data processing error:', error);
		
		return new Response(JSON.stringify({
			error: 'Failed to process performance data',
			timestamp: new Date().toISOString(),
			environment: env.ENVIRONMENT || 'production',
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}
}

export const onRequest = withErrorTracking<Env>(handler);