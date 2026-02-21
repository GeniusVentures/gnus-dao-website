/**
 * Cloudflare Worker: Performance Metrics API Endpoint
 * Provides performance data for monitoring and health checks
 * Migrated from Next.js API route to Cloudflare Pages Function
 * 
 * GET /api/performance - Retrieve performance metrics
 * POST /api/performance - Submit Web Vitals data from client
 */

import { withErrorTracking, captureException, addBreadcrumb, captureMessage } from '../utils/errorTracking';

interface Env {
	APP_CACHE?: KVNamespace;
	AUTH_SESSIONS?: KVNamespace;
	IPFS_CACHE?: KVNamespace;
	SENTRY_DSN?: string;
	ENVIRONMENT?: string;
}

interface PerformanceData {
	timestamp: string;
	server: {
		responseTime: number;
		status: string;
	};
	metrics: {
		webVitals: {
			available: boolean;
			message: string;
			aggregated?: AggregatedMetrics;
		};
		api: {
			responseTime: number;
			status: string;
		};
	};
	health: {
		status: string;
		checks: {
			kvStorage: boolean;
		};
	};
	details?: {
		environment: string;
		timestamp: number;
	};
}

interface AggregatedMetrics {
	count: number;
	averages: {
		[key: string]: number;
	};
	lastUpdated: string;
}

interface WebVitalsData {
	webVitals?: {
		[metric: string]: {
			value: number;
			rating?: 'good' | 'needs-improvement' | 'poor';
			delta?: number;
			id?: string;
		};
	};
	customMetrics?: {
		[metric: string]: {
			value: number;
			unit?: string;
		};
	};
	url?: string;
	userAgent?: string;
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

	if (request.method === 'GET') {
		return handleGetPerformance(request, env);
	} else if (request.method === 'POST') {
		return handlePostPerformance(request, env);
	} else {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}
};

/**
 * GET handler - Retrieve performance metrics
 */
async function handleGetPerformance(request: Request, env: Env): Promise<Response> {
	const startTime = Date.now();

	try {
		// Parse query parameters
		const url = new URL(request.url);
		const format = url.searchParams.get('format') || 'json';
		const includeDetails = url.searchParams.get('details') === 'true';

		// Retrieve aggregated Web Vitals from KV storage
		let aggregatedMetrics: AggregatedMetrics | null = null;
		if (env.APP_CACHE) {
			try {
				const stored = await env.APP_CACHE.get('performance:webvitals:aggregated');
				if (stored) {
					aggregatedMetrics = JSON.parse(stored);
				}
			} catch (error) {
				console.error('Failed to retrieve aggregated metrics:', error);
			}
		}

		// Build performance data using Workers-compatible APIs
		const performanceData: PerformanceData = {
			timestamp: new Date().toISOString(),
			server: {
				responseTime: Date.now() - startTime,
				status: 'healthy',
			},
			metrics: {
				webVitals: {
					available: aggregatedMetrics !== null,
					message: aggregatedMetrics 
						? 'Web Vitals aggregated from client submissions'
						: 'Web Vitals are collected client-side',
					...(aggregatedMetrics && { aggregated: aggregatedMetrics }),
				},
				api: {
					responseTime: Date.now() - startTime,
					status: 'healthy',
				},
			},
			health: {
				status: 'healthy',
				checks: {
					kvStorage: env.APP_CACHE !== undefined,
				},
			},
		};

		// Add detailed information if requested
		if (includeDetails) {
			performanceData.details = {
				environment: env.ENVIRONMENT || 'production',
				timestamp: Date.now(),
			};
		}

		// Add breadcrumb for monitoring
		addBreadcrumb(
			'Performance API accessed',
			'api',
			'info'
		);

		// Return Prometheus format if requested
		if (format === 'prometheus') {
			const responseTime = Date.now() - startTime;
			const prometheusMetrics = generatePrometheusMetrics(performanceData, responseTime, aggregatedMetrics);

			return new Response(prometheusMetrics, {
				status: 200,
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Return JSON format
		return new Response(JSON.stringify(performanceData), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Access-Control-Allow-Origin': '*',
				'X-Response-Time': `${Date.now() - startTime}ms`,
			},
		});

	} catch (error) {
		console.error('Performance API error:', error);
		
		await captureException(error as Error, {
			endpoint: 'performance',
			method: 'GET',
		});

		return new Response(
			JSON.stringify({
				error: 'Internal server error',
				timestamp: new Date().toISOString(),
			}),
			{ 
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			}
		);
	}
}

/**
 * POST handler - Submit Web Vitals data from client
 */
async function handlePostPerformance(request: Request, env: Env): Promise<Response> {
	const startTime = Date.now();

	try {
		// Parse client-side performance data
		const body = await request.json() as WebVitalsData;
		
		// Validate the performance data
		if (!body || typeof body !== 'object') {
			return new Response(
				JSON.stringify({ error: 'Invalid performance data' }),
				{ 
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				}
			);
		}

		// Process Web Vitals data from client
		if (body.webVitals) {
			await processWebVitals(body.webVitals, env);
		}

		// Process custom metrics from client
		if (body.customMetrics) {
			await processCustomMetrics(body.customMetrics);
		}

		// Store aggregated metrics in KV
		if (env.APP_CACHE && body.webVitals) {
			await updateAggregatedMetrics(body.webVitals, env.APP_CACHE);
		}

		// Record processing time
		const processingTime = Date.now() - startTime;

		return new Response(
			JSON.stringify({
				status: 'success',
				message: 'Performance data recorded',
				processingTime,
				timestamp: new Date().toISOString(),
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'X-Response-Time': `${processingTime}ms`,
				},
			}
		);

	} catch (error) {
		console.error('Performance data processing error:', error);
		
		await captureException(error as Error, {
			endpoint: 'performance',
			method: 'POST',
		});

		return new Response(
			JSON.stringify({
				error: 'Failed to process performance data',
				timestamp: new Date().toISOString(),
			}),
			{ 
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			}
		);
	}
}

/**
 * Process Web Vitals data and send to Sentry
 */
async function processWebVitals(
	webVitals: WebVitalsData['webVitals'],
	env: Env
): Promise<void> {
	if (!webVitals) return;

	for (const [metric, data] of Object.entries(webVitals)) {
		if (data && typeof data.value === 'number') {
			// Add breadcrumb for each metric
			addBreadcrumb(
				`Web Vital: ${metric}`,
				'performance',
				data.rating === 'poor' ? 'warning' : 'info'
			);

			// Capture performance issue if poor
			if (data.rating === 'poor') {
				captureMessage(
					`Poor Web Vital: ${metric} = ${data.value}ms`,
					'warning',
					{
						metric,
						value: data.value,
						rating: data.rating,
					}
				);
			}
		}
	}
}

/**
 * Process custom metrics
 */
async function processCustomMetrics(
	customMetrics: WebVitalsData['customMetrics']
): Promise<void> {
	if (!customMetrics) return;

	for (const [metric, data] of Object.entries(customMetrics)) {
		if (data && typeof data.value === 'number') {
			addBreadcrumb(
				`Custom Metric: ${metric}`,
				'performance',
				'info'
			);
		}
	}
}

/**
 * Update aggregated metrics in KV storage
 */
async function updateAggregatedMetrics(
	webVitals: WebVitalsData['webVitals'],
	kvCache: KVNamespace
): Promise<void> {
	if (!webVitals) return;

	try {
		// Retrieve existing aggregated data
		const stored = await kvCache.get('performance:webvitals:aggregated');
		let aggregated: AggregatedMetrics = stored 
			? JSON.parse(stored)
			: { count: 0, averages: {}, lastUpdated: new Date().toISOString() };

		// Update aggregated metrics
		for (const [metric, data] of Object.entries(webVitals)) {
			if (data && typeof data.value === 'number') {
				const currentAvg = aggregated.averages[metric] || 0;
				const currentCount = aggregated.count;
				
				// Calculate new average
				aggregated.averages[metric] = 
					(currentAvg * currentCount + data.value) / (currentCount + 1);
			}
		}

		aggregated.count += 1;
		aggregated.lastUpdated = new Date().toISOString();

		// Store updated aggregated data (expire after 7 days)
		await kvCache.put(
			'performance:webvitals:aggregated',
			JSON.stringify(aggregated),
			{ expirationTtl: 60 * 60 * 24 * 7 }
		);

	} catch (error) {
		console.error('Failed to update aggregated metrics:', error);
	}
}

/**
 * Generate Prometheus-style metrics
 */
function generatePrometheusMetrics(
	data: PerformanceData,
	responseTime: number,
	aggregated: AggregatedMetrics | null
): string {
	const lines: string[] = [
		'# HELP gnus_dao_api_response_time API response time in milliseconds',
		'# TYPE gnus_dao_api_response_time gauge',
		`gnus_dao_api_response_time ${responseTime}`,
		'',
	];

	// Add aggregated Web Vitals if available
	if (aggregated && aggregated.averages) {
		lines.push('# HELP gnus_dao_web_vitals_avg Average Web Vitals metrics');
		lines.push('# TYPE gnus_dao_web_vitals_avg gauge');
		
		for (const [metric, value] of Object.entries(aggregated.averages)) {
			lines.push(`gnus_dao_web_vitals_avg{metric="${metric}"} ${value.toFixed(2)}`);
		}
		
		lines.push('');
		lines.push('# HELP gnus_dao_web_vitals_count Total Web Vitals submissions');
		lines.push('# TYPE gnus_dao_web_vitals_count counter');
		lines.push(`gnus_dao_web_vitals_count ${aggregated.count}`);
		lines.push('');
	}

	// Add health status
	lines.push('# HELP gnus_dao_health_status Health status (1=healthy, 0=unhealthy)');
	lines.push('# TYPE gnus_dao_health_status gauge');
	lines.push(`gnus_dao_health_status ${data.health.status === 'healthy' ? 1 : 0}`);

	return lines.join('\n');
}

export const onRequest = withErrorTracking<Env>(handler);
