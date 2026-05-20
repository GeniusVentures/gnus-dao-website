/**
 * Cloudflare Worker: Health Check Endpoint
 * Returns application health status for monitoring
 * GET /api/health - Returns 200 when healthy
 */

import { withErrorTracking } from '../utils/errorTracking';

interface Env {
	AUTH_SESSIONS?: KVNamespace;
	IPFS_CACHE?: KVNamespace;
	APP_CACHE?: KVNamespace;
	PINATA_JWT?: string;
	SENTRY_DSN?: string;
	ENVIRONMENT?: string;
	NEXT_PUBLIC_ETHEREUM_RPC_URL?: string;
	NEXT_PUBLIC_BASE_RPC_URL?: string;
	NEXT_PUBLIC_POLYGON_RPC_URL?: string;
	NEXT_PUBLIC_SKALE_RPC_URL?: string;
	NEXT_PUBLIC_IPFS_GATEWAY?: string;
}

interface HealthCheckResult {
	status: 'healthy' | 'unhealthy' | 'unknown';
	responseTime?: number;
	error?: string;
	details?: Record<string, any>;
}

interface HealthStatus {
	status: 'healthy' | 'unhealthy';
	timestamp: string;
	version?: string;
	checks: {
		kvNamespaces: {
			authSessions: HealthCheckResult;
			ipfsCache: HealthCheckResult;
			appCache: HealthCheckResult;
		};
		externalServices: {
			ipfs: HealthCheckResult;
			rpc: HealthCheckResult;
		};
	};
	performance: {
		totalResponseTime: number;
		checksCompleted: number;
		checksFailed: number;
	};
	resources: {
		timestamp: number;
		region?: string;
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

	const startTime = Date.now();

	try {
		// Perform comprehensive health checks
		const checks = await performHealthChecks(env);

		// Calculate performance metrics
		const totalResponseTime = Date.now() - startTime;
		const checksCompleted = countCompletedChecks(checks);
		const checksFailed = countFailedChecks(checks);

		// Determine overall health status
		const isHealthy = checksFailed === 0;

		const healthStatus: HealthStatus = {
			status: isHealthy ? 'healthy' : 'unhealthy',
			timestamp: new Date().toISOString(),
			version: '1.0.0',
			checks,
			performance: {
				totalResponseTime,
				checksCompleted,
				checksFailed,
			},
			resources: {
				timestamp: Date.now(),
				region: (context.request as any).cf?.colo || 'unknown',
			},
		};

		// Return 503 if unhealthy, 200 if healthy
		const statusCode = isHealthy ? 200 : 503;

		return new Response(JSON.stringify(healthStatus), {
			status: statusCode,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'X-Response-Time': `${totalResponseTime}ms`,
			},
		});
	} catch (error) {
		console.error('Health check failed:', error);

		const healthStatus: HealthStatus = {
			status: 'unhealthy',
			timestamp: new Date().toISOString(),
			version: '1.0.0',
			checks: {
				kvNamespaces: {
					authSessions: { status: 'unknown', error: 'Health check crashed' },
					ipfsCache: { status: 'unknown', error: 'Health check crashed' },
					appCache: { status: 'unknown', error: 'Health check crashed' },
				},
				externalServices: {
					ipfs: { status: 'unknown', error: 'Health check crashed' },
					rpc: { status: 'unknown', error: 'Health check crashed' },
				},
			},
			performance: {
				totalResponseTime: Date.now() - startTime,
				checksCompleted: 0,
				checksFailed: 5,
			},
			resources: {
				timestamp: Date.now(),
				region: (context.request as any).cf?.colo || 'unknown',
			},
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
 * Perform comprehensive health checks for all services
 */
async function performHealthChecks(env: Env): Promise<HealthStatus['checks']> {
	// Run all checks in parallel for better performance
	const [authSessionsCheck, ipfsCacheCheck, appCacheCheck, ipfsCheck, rpcCheck] =
		await Promise.all([
			checkKVNamespace(env.AUTH_SESSIONS, 'auth:health'),
			checkKVNamespace(env.IPFS_CACHE, 'ipfs:health'),
			checkKVNamespace(env.APP_CACHE, 'app:health'),
			checkIPFSService(env),
			checkRPCEndpoints(env),
		]);

	return {
		kvNamespaces: {
			authSessions: authSessionsCheck,
			ipfsCache: ipfsCacheCheck,
			appCache: appCacheCheck,
		},
		externalServices: {
			ipfs: ipfsCheck,
			rpc: rpcCheck,
		},
	};
}

/**
 * Check KV namespace connectivity and performance
 */
async function checkKVNamespace(
	namespace: KVNamespace | undefined,
	testKey: string,
): Promise<HealthCheckResult> {
	if (!namespace) {
		return {
			status: 'unknown',
			error: 'KV namespace not configured',
		};
	}

	const startTime = Date.now();

	try {
		// Perform write, read, and delete operations
		const testValue = `health-check-${Date.now()}`;
		await namespace.put(testKey, testValue, { expirationTtl: 60 });
		const readValue = await namespace.get(testKey);
		await namespace.delete(testKey);

		const responseTime = Date.now() - startTime;

		if (readValue === testValue) {
			return {
				status: 'healthy',
				responseTime,
				details: {
					operations: ['put', 'get', 'delete'],
				},
			};
		} else {
			return {
				status: 'unhealthy',
				responseTime,
				error: 'KV read/write mismatch',
			};
		}
	} catch (error) {
		return {
			status: 'unhealthy',
			responseTime: Date.now() - startTime,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Check IPFS service connectivity
 */
async function checkIPFSService(env: Env): Promise<HealthCheckResult> {
	const startTime = Date.now();

	try {
		// Check Pinata API authentication
		const pinataJwt = env.PINATA_JWT;
		if (!pinataJwt) {
			return {
				status: 'unknown',
				error: 'PINATA_JWT not configured',
			};
		}

		const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${pinataJwt}`,
			},
		});

		const responseTime = Date.now() - startTime;

		if (response.ok) {
			const data = await response.json();
			return {
				status: 'healthy',
				responseTime,
				details: {
					authenticated: true,
					message: data.message || 'Connected',
				},
			};
		} else {
			return {
				status: 'unhealthy',
				responseTime,
				error: `Pinata API returned ${response.status}`,
			};
		}
	} catch (error) {
		return {
			status: 'unhealthy',
			responseTime: Date.now() - startTime,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Check RPC endpoint connectivity for supported networks
 */
async function checkRPCEndpoints(env: Env): Promise<HealthCheckResult> {
	const startTime = Date.now();

	try {
		const rpcEndpoints = [
			{ name: 'Ethereum', url: env.NEXT_PUBLIC_ETHEREUM_RPC_URL },
			{ name: 'Base', url: env.NEXT_PUBLIC_BASE_RPC_URL },
			{ name: 'Polygon', url: env.NEXT_PUBLIC_POLYGON_RPC_URL },
			{ name: 'Skale', url: env.NEXT_PUBLIC_SKALE_RPC_URL },
		].filter((endpoint) => endpoint.url);

		if (rpcEndpoints.length === 0) {
			return {
				status: 'unknown',
				error: 'No RPC endpoints configured',
			};
		}

		// Test the first available RPC endpoint
		const testEndpoint = rpcEndpoints[0];
		const response = await fetch(testEndpoint.url!, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'eth_blockNumber',
				params: [],
				id: 1,
			}),
		});

		const responseTime = Date.now() - startTime;

		if (response.ok) {
			const data = await response.json();
			if (data.result) {
				return {
					status: 'healthy',
					responseTime,
					details: {
						network: testEndpoint.name,
						blockNumber: data.result,
						totalEndpoints: rpcEndpoints.length,
					},
				};
			} else {
				return {
					status: 'unhealthy',
					responseTime,
					error: 'RPC returned no result',
				};
			}
		} else {
			return {
				status: 'unhealthy',
				responseTime,
				error: `RPC returned ${response.status}`,
			};
		}
	} catch (error) {
		return {
			status: 'unhealthy',
			responseTime: Date.now() - startTime,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Count completed health checks
 */
function countCompletedChecks(checks: HealthStatus['checks']): number {
	let count = 0;

	// Count KV namespace checks
	if (checks.kvNamespaces.authSessions.status !== 'unknown') count++;
	if (checks.kvNamespaces.ipfsCache.status !== 'unknown') count++;
	if (checks.kvNamespaces.appCache.status !== 'unknown') count++;

	// Count external service checks
	if (checks.externalServices.ipfs.status !== 'unknown') count++;
	if (checks.externalServices.rpc.status !== 'unknown') count++;

	return count;
}

/**
 * Count failed health checks
 */
function countFailedChecks(checks: HealthStatus['checks']): number {
	let count = 0;

	// Count KV namespace failures
	if (checks.kvNamespaces.authSessions.status === 'unhealthy') count++;
	if (checks.kvNamespaces.ipfsCache.status === 'unhealthy') count++;
	if (checks.kvNamespaces.appCache.status === 'unhealthy') count++;

	// Count external service failures
	if (checks.externalServices.ipfs.status === 'unhealthy') count++;
	if (checks.externalServices.rpc.status === 'unhealthy') count++;

	return count;
}

export const onRequest = withErrorTracking<Env>(handler);
