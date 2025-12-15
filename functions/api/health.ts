/**
 * Cloudflare Worker: Health Check Endpoint
 * Returns application health status for monitoring
 * GET /api/health - Returns 200 when healthy
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
}

interface HealthStatus {
	status: 'healthy' | 'unhealthy';
	timestamp: string;
	version?: string;
	checks: {
		database: 'healthy' | 'unhealthy' | 'unknown';
		ipfs: 'healthy' | 'unhealthy' | 'unknown';
		rpc: 'healthy' | 'unhealthy' | 'unknown';
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
		// Perform health checks
		const checks = await performHealthChecks(env);

		// Determine overall health status
		const isHealthy = Object.values(checks).every(
			(status) => status === 'healthy' || status === 'unknown',
		);

		const healthStatus: HealthStatus = {
			status: isHealthy ? 'healthy' : 'unhealthy',
			timestamp: new Date().toISOString(),
			version: process.env.npm_package_version || '1.0.0',
			checks,
		};

		const responseTime = Date.now() - startTime;

		// Return 503 if unhealthy, 200 if healthy
		const statusCode = isHealthy ? 200 : 503;

		return new Response(JSON.stringify(healthStatus), {
			status: statusCode,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'X-Response-Time': `${responseTime}ms`,
			},
		});
	} catch (error) {
		console.error('Health check failed:', error);

		const healthStatus: HealthStatus = {
			status: 'unhealthy',
			timestamp: new Date().toISOString(),
			version: process.env.npm_package_version || '1.0.0',
			checks: {
				database: 'unhealthy',
				ipfs: 'unknown',
				rpc: 'unknown',
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
 * Perform health checks for various services
 */
async function performHealthChecks(env: Env): Promise<HealthStatus['checks']> {
	const checks: HealthStatus['checks'] = {
		database: 'unknown',
		ipfs: 'unknown',
		rpc: 'unknown',
	};

	// Check database connectivity (KV store)
	try {
		if (env.AUTH_SESSIONS) {
			// Try to perform a simple KV operation
			await env.AUTH_SESSIONS.put('health:check', 'ok', { expirationTtl: 60 });
			await env.AUTH_SESSIONS.get('health:check');
			await env.AUTH_SESSIONS.delete('health:check');
			checks.database = 'healthy';
		} else {
			checks.database = 'unknown';
		}
	} catch (error) {
		console.error('Database health check failed:', error);
		checks.database = 'unhealthy';
	}

	// Check IPFS service status
	try {
		// Check if PINATA_JWT is available (indicates IPFS service is configured)
		const pinataJwt = env.PINATA_JWT || process.env.PINATA_JWT;
		if (pinataJwt) {
			// Perform a simple API call to Pinata to check connectivity
			const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${pinataJwt}`,
				},
			});

			if (response.ok) {
				checks.ipfs = 'healthy';
			} else {
				checks.ipfs = 'unhealthy';
			}
		} else {
			checks.ipfs = 'unknown';
		}
	} catch (error) {
		console.error('IPFS health check failed:', error);
		checks.ipfs = 'unhealthy';
	}

	// Check RPC endpoint status for supported networks
	try {
		const rpcEndpoints = [
			env.NEXT_PUBLIC_ETHEREUM_RPC_URL || process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
			env.NEXT_PUBLIC_BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL,
			env.NEXT_PUBLIC_POLYGON_RPC_URL || process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
			env.NEXT_PUBLIC_SKALE_RPC_URL || process.env.NEXT_PUBLIC_SKALE_RPC_URL,
		].filter(Boolean);

		if (rpcEndpoints.length > 0) {
			// Test at least one RPC endpoint
			const testEndpoint = rpcEndpoints[0];
			const response = await fetch(testEndpoint!, {
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

			if (response.ok) {
				const data = await response.json();
				if (data.result) {
					checks.rpc = 'healthy';
				} else {
					checks.rpc = 'unhealthy';
				}
			} else {
				checks.rpc = 'unhealthy';
			}
		} else {
			checks.rpc = 'unknown';
		}
	} catch (error) {
		console.error('RPC health check failed:', error);
		checks.rpc = 'unhealthy';
	}

	return checks;
}

export const onRequest = withErrorTracking<Env>(handler);
