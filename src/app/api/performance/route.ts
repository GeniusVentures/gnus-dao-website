/**
 * Performance Metrics API Endpoint
 * Provides performance data for monitoring and health checks
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
	try {
		// Start performance measurement
		const startTime = performance.now();

		// Get query parameters
		const { searchParams } = new URL(request.url);
		const format = searchParams.get('format') || 'json';
		const includeDetails = searchParams.get('details') === 'true';

		// Simulate performance data collection
		// In a real implementation, this would aggregate data from your performance store
		const performanceData: any = {
			timestamp: new Date().toISOString(),
			server: {
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				cpu: process.cpuUsage(),
			},
			metrics: {
				webVitals: {
					// These would be collected from client-side and stored
					available: false,
					message: 'Web Vitals are collected client-side',
				},
				api: {
					responseTime: performance.now() - startTime,
					status: 'healthy',
				},
			},
			health: {
				status: 'healthy',
				checks: {
					memory: process.memoryUsage().heapUsed < 1024 * 1024 * 1024, // < 1GB
					uptime: process.uptime() > 0,
				},
			},
		};

		// Add detailed information if requested
		if (includeDetails) {
			performanceData.metrics = {
				...performanceData.metrics,
				details: {
					nodeVersion: process.version,
					platform: process.platform,
					arch: process.arch,
					environment: process.env.NODE_ENV,
				},
			};
		}

		// Record API performance metric
		Sentry.setMeasurement('api_performance_endpoint', performance.now() - startTime, 'millisecond');

		// Add breadcrumb for monitoring
		Sentry.addBreadcrumb({
			message: 'Performance API accessed',
			category: 'api',
			level: 'info',
			data: {
				format,
				includeDetails,
				responseTime: performance.now() - startTime,
			},
		});

		// Return appropriate format
		if (format === 'prometheus') {
			// Return Prometheus-style metrics
			const prometheusMetrics = `
# HELP gnus_dao_api_response_time API response time in milliseconds
# TYPE gnus_dao_api_response_time gauge
gnus_dao_api_response_time ${performance.now() - startTime}

# HELP gnus_dao_memory_usage Memory usage in bytes
# TYPE gnus_dao_memory_usage gauge
gnus_dao_memory_usage{type="heapUsed"} ${performanceData.server.memory.heapUsed}
gnus_dao_memory_usage{type="heapTotal"} ${performanceData.server.memory.heapTotal}
gnus_dao_memory_usage{type="external"} ${performanceData.server.memory.external}

# HELP gnus_dao_uptime Server uptime in seconds
# TYPE gnus_dao_uptime counter
gnus_dao_uptime ${performanceData.server.uptime}
			`.trim();

			return new NextResponse(prometheusMetrics, {
				status: 200,
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Cache-Control': 'no-cache, no-store, must-revalidate',
				},
			});
		}

		return NextResponse.json(performanceData, {
			status: 200,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			},
		});

	} catch (error) {
		console.error('Performance API error:', error);
		
		// Capture error to Sentry
		Sentry.captureException(error, {
			tags: {
				endpoint: 'performance',
				method: 'GET',
			},
		});

		return NextResponse.json(
			{
				error: 'Internal server error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const startTime = performance.now();
		
		// Parse client-side performance data
		const body = await request.json();
		
		// Validate the performance data
		if (!body || typeof body !== 'object') {
			return NextResponse.json(
				{ error: 'Invalid performance data' },
				{ status: 400 }
			);
		}

		// Process Web Vitals data from client
		if (body.webVitals) {
			Object.entries(body.webVitals).forEach(([metric, data]: [string, any]) => {
				if (data && typeof data.value === 'number') {
					// Send to Sentry as measurement
					Sentry.setMeasurement(`web_vital_${metric.toLowerCase()}`, data.value, 'millisecond');
					
					// Add breadcrumb
					Sentry.addBreadcrumb({
						message: `Web Vital: ${metric}`,
						category: 'performance',
						level: data.rating === 'poor' ? 'warning' : 'info',
						data: {
							metric,
							value: data.value,
							rating: data.rating,
						},
					});

					// Capture performance issue if poor
					if (data.rating === 'poor') {
						Sentry.captureMessage(
							`Poor Web Vital: ${metric} = ${data.value}ms`,
							'warning'
						);
					}
				}
			});
		}

		// Process custom metrics from client
		if (body.customMetrics) {
			Object.entries(body.customMetrics).forEach(([metric, data]: [string, any]) => {
				if (data && typeof data.value === 'number') {
					Sentry.setMeasurement(`custom_${metric}`, data.value, 'millisecond');
				}
			});
		}

		// Record processing time
		const processingTime = performance.now() - startTime;
		Sentry.setMeasurement('performance_data_processing', processingTime, 'millisecond');

		return NextResponse.json({
			status: 'success',
			message: 'Performance data recorded',
			processingTime,
			timestamp: new Date().toISOString(),
		});

	} catch (error) {
		console.error('Performance data processing error:', error);
		
		Sentry.captureException(error, {
			tags: {
				endpoint: 'performance',
				method: 'POST',
			},
		});

		return NextResponse.json(
			{
				error: 'Failed to process performance data',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}