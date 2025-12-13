/**
 * Tests for Health Check API endpoint
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the error tracking utility
jest.mock('../../../functions/utils/errorTracking', () => ({
	withErrorTracking: jest.fn((handler) => handler),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('/api/health', () => {
	let mockEnv: any;
	let mockContext: any;

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock KV namespace
		const mockKV = {
			put: jest.fn().mockResolvedValue(undefined),
			get: jest.fn().mockResolvedValue('ok'),
			delete: jest.fn().mockResolvedValue(undefined),
		};

		mockEnv = {
			AUTH_SESSIONS: mockKV,
			PINATA_JWT: 'test-jwt-token',
			SENTRY_DSN: 'https://test@sentry.io/123',
			ENVIRONMENT: 'test',
			NEXT_PUBLIC_ETHEREUM_RPC_URL: 'https://eth-mainnet.example.com',
		};

		mockContext = {
			request: new Request('https://example.com/api/health', {
				method: 'GET',
			}),
			env: mockEnv,
		};
	});

	it('should return 200 status when healthy', async () => {
		// Mock successful fetch responses
		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						message: 'Congratulations! You are communicating with the Pinata API!',
					}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ result: '0x123456' }),
			});

		// Import the handler after mocks are set up
		const { onRequest } = await import('../../../functions/api/health');

		const response = await onRequest(mockContext);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.status).toBe('healthy');
		expect(data.timestamp).toBeDefined();
		expect(data.version).toBeDefined();
		expect(data.checks).toEqual({
			database: 'healthy',
			ipfs: 'healthy',
			rpc: 'healthy',
		});
	});

	it('should return 503 status when services are unhealthy', async () => {
		// Mock failed fetch responses
		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: false,
				status: 401,
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 500,
			});

		const { onRequest } = await import('../../../functions/api/health');

		const response = await onRequest(mockContext);
		const data = await response.json();

		expect(response.status).toBe(503);
		expect(data.status).toBe('unhealthy');
		expect(data.checks.ipfs).toBe('unhealthy');
		expect(data.checks.rpc).toBe('unhealthy');
	});

	it('should handle missing environment variables gracefully', async () => {
		mockContext.env = {
			// No AUTH_SESSIONS, PINATA_JWT, etc.
		};

		// Clear any existing environment variables
		delete process.env.PINATA_JWT;
		delete process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL;
		delete process.env.NEXT_PUBLIC_BASE_RPC_URL;
		delete process.env.NEXT_PUBLIC_POLYGON_RPC_URL;
		delete process.env.NEXT_PUBLIC_SKALE_RPC_URL;

		const { onRequest } = await import('../../../functions/api/health');

		const response = await onRequest(mockContext);
		const data = await response.json();

		expect(response.status).toBe(200); // Still healthy if services are unknown
		expect(data.status).toBe('healthy');
		expect(data.checks).toEqual({
			database: 'unknown',
			ipfs: 'unknown',
			rpc: 'unknown',
		});
	});

	it('should handle KV store errors', async () => {
		// Mock KV operations to throw errors
		mockEnv.AUTH_SESSIONS.put.mockRejectedValue(new Error('KV error'));

		const { onRequest } = await import('../../../functions/api/health');

		const response = await onRequest(mockContext);
		const data = await response.json();

		expect(data.checks.database).toBe('unhealthy');
	});

	it('should return 405 for non-GET requests', async () => {
		mockContext.request = new Request('https://example.com/api/health', {
			method: 'POST',
		});

		const { onRequest } = await import('../../../functions/api/health');

		const response = await onRequest(mockContext);
		const data = await response.json();

		expect(response.status).toBe(405);
		expect(data.error).toBe('Method not allowed');
	});

	it('should handle OPTIONS requests for CORS', async () => {
		mockContext.request = new Request('https://example.com/api/health', {
			method: 'OPTIONS',
		});

		const { onRequest } = await import('../../../functions/api/health');

		const response = await onRequest(mockContext);

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
	});

	it('should complete health check within 5 seconds', async () => {
		// Mock quick responses
		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ message: 'Success' }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ result: '0x123456' }),
			});

		const { onRequest } = await import('../../../functions/api/health');

		const startTime = Date.now();
		const response = await onRequest(mockContext);
		const endTime = Date.now();

		const responseTime = endTime - startTime;

		expect(response.status).toBe(200);
		expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
		expect(response.headers.get('X-Response-Time')).toMatch(/\d+ms/);
	});

	it('should include version information in response', async () => {
		const { onRequest } = await import('../../../functions/api/health');

		const response = await onRequest(mockContext);
		const data = await response.json();

		expect(data.version).toBeDefined();
		expect(typeof data.version).toBe('string');
	});

	it('should set appropriate cache headers', async () => {
		const { onRequest } = await import('../../../functions/api/health');

		const response = await onRequest(mockContext);

		expect(response.headers.get('Cache-Control')).toBe(
			'no-cache, no-store, must-revalidate',
		);
		expect(response.headers.get('Content-Type')).toBe('application/json');
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});
});
