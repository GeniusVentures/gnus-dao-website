/**
 * Cloudflare Worker: Health Check Endpoint
 * Provides comprehensive health status and triggers critical alerts for system failures
 * GET /api/health - Returns comprehensive health status
 */

import { withErrorTracking } from '../utils/errorTracking';

interface Env {
	AUTH_SESSIONS?: KVNamespace;
	PINATA_JWT?: string;
	SENTRY_DSN?: string;
	ENVIRONMENT?: string;
	NEXT_PUBLIC_ETHEREUM_RPC_URL?: string;
	NEXT_PUBLIC_BASE_RPC_URL?: string;
	NEXT_PUBLIC_POLYGON_RPC_URL?: string;
	NEXT_PUBLIC_SKALE_RPC_URL?: string;
	NEXT_PUBLIC_IPFS_GATEWAY?: string;
	NEXT_PUBLIC_APP_VERSION?: string;
}

interface HealthCheckResult {
	status: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: string;
	version: string;
	environment: string;
	checks: {
		database: HealthStatus;
		ipfs: HealthStatus;
		rpc: HealthStatus;
		sentry: HealthStatus;
		worker: HealthStatus;
		performance: HealthStatus;
	};
	uptime: number;
	responseTime: number;
}

interface HealthStatus {
	status: 'healthy' | 'degraded' | 'unhealthy';
	message: string;
	responseTime?: number;
	lastChecked: string;
	details?: Record<string, any>;
}

interface RPCEndpoint {
	name: string;
	url: string;
	chainId: number;
}

const startTime = Date.now();

const handler: PagesFunction<Env> = async (context) => {
	const { request, env } = context;

	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	}

	if (request.method !== 'GET') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	const requestStartTime = Date.now();

	try {
		console.log('Health check requested', {
			userAgent: request.headers.get('user-agent'),
			cf: (request as any).cf,
		});

		// Run all health checks in parallel
		const [database, ipfs, rpc, sentry, worker, performance] = await Promise.all([
			checkDatabase(env),
			checkIPFS(env),
			checkRPC(env),
			checkSentry(env),
			checkWorker(env),
			checkPerformance(env, requestStartTime)
		]);

		const responseTime = Date.now() - requestStartTime;
		const uptime = Date.now() - startTime;

		const healthResult: HealthCheckResult = {
			status: determineOverallStatus({ database, ipfs, rpc, sentry, worker, performance }),
			timestamp: new Date().toISOString(),
			version: env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
			environment: env.ENVIRONMENT || 'production',
			checks: { database, ipfs, rpc, sentry, worker, performance },
			uptime,
			responseTime
		};

		// Handle critical health issues
		await handleCriticalHealthIssues(healthResult);

		// Log health check result
		console.log('Health check completed', {
			status: healthResult.status,
			responseTime,
			uptime,
			failedChecks: Object.entries(healthResult.checks)
				.filter(([_, check]) => check.status !== 'healthy')
				.map(([service, _]) => service)
		});

		// Return appropriate HTTP status code
		const statusCode = healthResult.status === 'healthy' ? 200 : 
						  healthResult.status === 'degraded' ? 200 : 503;

		return new Response(JSON.stringify(healthResult), {
			status: statusCode,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'X-Response-Time': `${responseTime}ms`,
			},
		});

	} catch (error) {
		const responseTime = Date.now() - requestStartTime;
		
		console.error('Health check failed', { responseTime }, error);

		// Trigger critical alert for health check failure
		await handleCriticalError(error as Error, env, { responseTime });

		const healthStatus: HealthCheckResult = {
			status: 'unhealthy',
			timestamp: new Date().toISOString(),
			version: env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
			environment: env.ENVIRONMENT || 'production',
			checks: {
				database: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
				ipfs: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
				rpc: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
				sentry: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
				worker: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
				performance: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() }
			},
			uptime: Date.now() - startTime,
			responseTime
		};

		return new Response(JSON.stringify(healthStatus), {
			status: 503,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			},
		});
	}
};

/**
 * Check database connectivity (KV store)
 */
async function checkDatabase(env: Env): Promise<HealthStatus> {
	const startTime = Date.now();
	
	try {
		if (env.AUTH_SESSIONS) {
			// Try to perform a simple KV operation
			await env.AUTH_SESSIONS.put('health:check', 'ok', { expirationTtl: 60 });
			await env.AUTH_SESSIONS.get('health:check');
			await env.AUTH_SESSIONS.delete('health:check');
			
			const responseTime = Date.now() - startTime;
			
			return {
				status: 'healthy',
				message: 'Database connection successful',
				responseTime,
				lastChecked: new Date().toISOString()
			};
		} else {
			return {
				status: 'degraded',
				message: 'Database not configured (KV namespace missing)',
				responseTime: Date.now() - startTime,
				lastChecked: new Date().toISOString()
			};
		}
	} catch (error) {
		const responseTime = Date.now() - startTime;
		
		return {
			status: 'unhealthy',
			message: `Database connection failed: ${(error as Error).message}`,
			responseTime,
			lastChecked: new Date().toISOString()
		};
	}
}

/**
 * Check IPFS connectivity
 */
async function checkIPFS(env: Env): Promise<HealthStatus> {
	const startTime = Date.now();
	
	try {
		const ipfsGateway = env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
		const pinataJwt = env.PINATA_JWT;
		
		// Test IPFS gateway first
		const testHash = 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn';
		const testUrl = `${ipfsGateway}${testHash}`;
		
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);
		
		const gatewayResponse = await fetch(testUrl, {
			method: 'HEAD',
			signal: controller.signal
		});
		
		clearTimeout(timeoutId);
		
		// Test Pinata API if JWT is available
		let pinataStatus = 'unknown';
		if (pinataJwt) {
			try {
				const pinataResponse = await fetch('https://api.pinata.cloud/data/testAuthentication', {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${pinataJwt}`,
					},
				});
				pinataStatus = pinataResponse.ok ? 'healthy' : 'unhealthy';
			} catch {
				pinataStatus = 'unhealthy';
			}
		}
		
		const responseTime = Date.now() - startTime;
		
		if (gatewayResponse.ok) {
			return {
				status: pinataStatus === 'unhealthy' ? 'degraded' : 'healthy',
				message: `IPFS gateway accessible, Pinata: ${pinataStatus}`,
				responseTime,
				lastChecked: new Date().toISOString(),
				details: { 
					gateway: ipfsGateway, 
					pinataStatus,
					gatewayStatus: gatewayResponse.status
				}
			};
		} else {
			return {
				status: 'degraded',
				message: `IPFS gateway returned ${gatewayResponse.status}, Pinata: ${pinataStatus}`,
				responseTime,
				lastChecked: new Date().toISOString(),
				details: { 
					gateway: ipfsGateway, 
					pinataStatus,
					gatewayStatus: gatewayResponse.status
				}
			};
		}
	} catch (error) {
		const responseTime = Date.now() - startTime;
		
		return {
			status: 'unhealthy',
			message: `IPFS check failed: ${(error as Error).message}`,
			responseTime,
			lastChecked: new Date().toISOString()
		};
	}
}

/**
 * Check RPC endpoints
 */
async function checkRPC(env: Env): Promise<HealthStatus> {
	const startTime = Date.now();
	
	const rpcEndpoints: RPCEndpoint[] = [
		{
			name: 'Ethereum',
			url: env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
			chainId: 1
		},
		{
			name: 'Base',
			url: env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
			chainId: 8453
		},
		{
			name: 'Polygon',
			url: env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
			chainId: 137
		}
	];

	const results = await Promise.allSettled(
		rpcEndpoints.map(async (endpoint) => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000);
			
			try {
				const response = await fetch(endpoint.url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						method: 'eth_chainId',
						params: [],
						id: 1
					}),
					signal: controller.signal
				});
				
				clearTimeout(timeoutId);
				
				if (response.ok) {
					const data = await response.json();
					const chainId = parseInt(data.result, 16);
					
					return {
						name: endpoint.name,
						status: chainId === endpoint.chainId ? 'healthy' : 'degraded',
						chainId,
						expectedChainId: endpoint.chainId
					};
				} else {
					return {
						name: endpoint.name,
						status: 'unhealthy',
						error: `HTTP ${response.status}`
					};
				}
			} catch (error) {
				clearTimeout(timeoutId);
				return {
					name: endpoint.name,
					status: 'unhealthy',
					error: (error as Error).message
				};
			}
		})
	);

	const responseTime = Date.now() - startTime;
	const healthyCount = results.filter(result => 
		result.status === 'fulfilled' && result.value.status === 'healthy'
	).length;
	
	const totalCount = results.length;
	const healthyPercentage = (healthyCount / totalCount) * 100;

	let status: 'healthy' | 'degraded' | 'unhealthy';
	let message: string;

	if (healthyPercentage >= 80) {
		status = 'healthy';
		message = `${healthyCount}/${totalCount} RPC endpoints healthy`;
	} else if (healthyPercentage >= 50) {
		status = 'degraded';
		message = `${healthyCount}/${totalCount} RPC endpoints healthy (degraded)`;
	} else {
		status = 'unhealthy';
		message = `${healthyCount}/${totalCount} RPC endpoints healthy (critical)`;
	}

	return {
		status,
		message,
		responseTime,
		lastChecked: new Date().toISOString(),
		details: {
			endpoints: results.map((result, index) => ({
				name: rpcEndpoints[index]?.name || 'Unknown',
				url: rpcEndpoints[index]?.url || 'Unknown',
				...(result.status === 'fulfilled' && result.value ? 
					{ status: result.value.status, chainId: result.value.chainId, expectedChainId: result.value.expectedChainId } : 
					{ status: 'error', error: result.status === 'rejected' ? result.reason : 'Unknown error' })
			}))
		}
	};
}

/**
 * Check Sentry connectivity
 */
async function checkSentry(env: Env): Promise<HealthStatus> {
	const startTime = Date.now();
	
	try {
		const sentryDsn = env.SENTRY_DSN;
		
		if (!sentryDsn) {
			return {
				status: 'degraded',
				message: 'Sentry DSN not configured',
				responseTime: Date.now() - startTime,
				lastChecked: new Date().toISOString()
			};
		}

		// Test Sentry connectivity by parsing DSN
		try {
			const url = new URL(sentryDsn);
			const responseTime = Date.now() - startTime;
			
			return {
				status: 'healthy',
				message: 'Sentry DSN configured and valid',
				responseTime,
				lastChecked: new Date().toISOString(),
				details: { host: url.host }
			};
		} catch {
			return {
				status: 'unhealthy',
				message: 'Sentry DSN invalid format',
				responseTime: Date.now() - startTime,
				lastChecked: new Date().toISOString()
			};
		}
	} catch (error) {
		const responseTime = Date.now() - startTime;
		
		return {
			status: 'unhealthy',
			message: `Sentry check failed: ${(error as Error).message}`,
			responseTime,
			lastChecked: new Date().toISOString()
		};
	}
}

/**
 * Check Cloudflare Worker status
 */
async function checkWorker(env: Env): Promise<HealthStatus> {
	const startTime = Date.now();
	
	try {
		// Basic worker health checks
		const workerData = {
			environment: env.ENVIRONMENT || 'production',
			timestamp: Date.now(),
			available: true,
		};

		const responseTime = Date.now() - startTime;

		return {
			status: 'healthy',
			message: `Worker running in ${workerData.environment}`,
			responseTime,
			lastChecked: new Date().toISOString(),
			details: workerData
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;
		
		return {
			status: 'unhealthy',
			message: `Worker check failed: ${(error as Error).message}`,
			responseTime,
			lastChecked: new Date().toISOString()
		};
	}
}

/**
 * Check performance metrics
 */
async function checkPerformance(env: Env, requestStartTime: number): Promise<HealthStatus> {
	const startTime = Date.now();
	
	try {
		const responseTime = Date.now() - requestStartTime;
		const checkTime = Date.now() - startTime;

		let status: 'healthy' | 'degraded' | 'unhealthy';
		let message: string;

		// Check response time thresholds
		if (responseTime < 100) {
			status = 'healthy';
			message = `Performance optimal: ${responseTime}ms response time`;
		} else if (responseTime < 500) {
			status = 'degraded';
			message = `Performance degraded: ${responseTime}ms response time`;
		} else {
			status = 'unhealthy';
			message = `Performance critical: ${responseTime}ms response time`;
		}

		return {
			status,
			message,
			responseTime: checkTime,
			lastChecked: new Date().toISOString(),
			details: {
				responseTime,
				checkTime,
				environment: env.ENVIRONMENT,
				thresholds: {
					responseTime: { good: 100, degraded: 500 },
				},
			}
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;
		
		return {
			status: 'unhealthy',
			message: `Performance check failed: ${(error as Error).message}`,
			responseTime,
			lastChecked: new Date().toISOString()
		};
	}
}

/**
 * Determine overall health status
 */
function determineOverallStatus(checks: HealthCheckResult['checks']): 'healthy' | 'degraded' | 'unhealthy' {
	const statuses = Object.values(checks).map(check => check.status);
	
	if (statuses.includes('unhealthy')) {
		return 'unhealthy';
	} else if (statuses.includes('degraded')) {
		return 'degraded';
	} else {
		return 'healthy';
	}
}

/**
 * Handle critical health issues
 */
async function handleCriticalHealthIssues(healthResult: HealthCheckResult): Promise<void> {
	const criticalChecks = Object.entries(healthResult.checks).filter(
		([_, check]) => check.status === 'unhealthy'
	);

	if (criticalChecks.length > 0) {
		const criticalServices = criticalChecks.map(([service, _]) => service);
		const error = new Error(`Critical health check failures: ${criticalServices.join(', ')}`);
		
		console.error('Critical health check failures detected', {
			failedServices: criticalServices,
			healthStatus: healthResult.status,
			checks: healthResult.checks,
			uptime: healthResult.uptime
		}, error);
	}

	// Also alert on degraded RPC or IPFS (critical for DAO operations)
	const criticalServices = ['rpc', 'ipfs'];
	const degradedCriticalServices = criticalServices.filter(
		service => healthResult.checks[service as keyof typeof healthResult.checks]?.status === 'degraded'
	);

	if (degradedCriticalServices.length > 0) {
		console.warn('Critical services degraded', {
			degradedServices: degradedCriticalServices,
			healthStatus: healthResult.status
		});
	}
}

/**
 * Handle critical errors
 */
async function handleCriticalError(error: Error, env: Env, context: any): Promise<void> {
	console.error('Critical error in health check', {
		error: error.message,
		stack: error.stack,
		context,
		environment: env.ENVIRONMENT
	});
}

export const onRequest = withErrorTracking<Env>(handler);
