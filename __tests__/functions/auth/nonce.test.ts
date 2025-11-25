/**
 * Tests for Nonce Generation API
 * Critical for authentication security
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock environment
const mockEnv = {
	AUTH_SESSIONS: {
		put: jest.fn(),
		get: jest.fn(),
		delete: jest.fn(),
	} as any,
	JWT_SECRET: 'test-secret-key-for-testing-only',
	SENTRY_DSN: undefined,
	ENVIRONMENT: 'test',
};

describe('Nonce Generation API', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('CORS Handling', () => {
		it('should handle OPTIONS preflight request', async () => {
			const request = new Request('http://localhost/api/auth/nonce', {
				method: 'OPTIONS',
			});

			// Import handler dynamically to avoid module-level issues
			const { onRequest } = await import('@/../functions/api/auth/nonce');
			const response = await onRequest({ request, env: mockEnv } as any);

			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
		});
	});

	describe('Method Validation', () => {
		it('should reject POST requests', async () => {
			const request = new Request('http://localhost/api/auth/nonce', {
				method: 'POST',
			});

			const { onRequest } = await import('@/../functions/api/auth/nonce');
			const response = await onRequest({ request, env: mockEnv } as any);

			expect(response.status).toBe(405);
			const data = await response.json();
			expect(data.error).toBe('Method not allowed');
		});

		it('should accept GET requests', async () => {
			const request = new Request('http://localhost/api/auth/nonce', {
				method: 'GET',
			});

			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);

			const { onRequest } = await import('@/../functions/api/auth/nonce');
			const response = await onRequest({ request, env: mockEnv } as any);

			expect(response.status).toBe(200);
		});
	});

	describe('Nonce Generation', () => {
		it('should generate a valid nonce', async () => {
			const request = new Request('http://localhost/api/auth/nonce', {
				method: 'GET',
			});

			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);

			const { onRequest } = await import('@/../functions/api/auth/nonce');
			const response = await onRequest({ request, env: mockEnv } as any);

			expect(response.status).toBe(200);
			const data = await response.json();

			// Validate nonce format (32 hex characters)
			expect(data.nonce).toMatch(/^[0-9a-f]{32}$/);
			expect(data.expiresAt).toBeGreaterThan(Date.now());
		});

		it('should generate unique nonces', async () => {
			const request1 = new Request('http://localhost/api/auth/nonce', {
				method: 'GET',
			});
			const request2 = new Request('http://localhost/api/auth/nonce', {
				method: 'GET',
			});

			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);

			const { onRequest } = await import('@/../functions/api/auth/nonce');
			const response1 = await onRequest({ request: request1, env: mockEnv } as any);
			const response2 = await onRequest({ request: request2, env: mockEnv } as any);

			const data1 = await response1.json();
			const data2 = await response2.json();

			expect(data1.nonce).not.toBe(data2.nonce);
		});

		it('should store nonce in KV with correct TTL', async () => {
			const request = new Request('http://localhost/api/auth/nonce', {
				method: 'GET',
			});

			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);
			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);

			const { onRequest } = await import('@/../functions/api/auth/nonce');
			await onRequest({ request, env: mockEnv } as any);

			expect(mockEnv.AUTH_SESSIONS.put).toHaveBeenCalled();
			// Find the nonce storage call (not the rate limiter call)
			const nonceCalls = mockEnv.AUTH_SESSIONS.put.mock.calls.filter((call: any) =>
				call[0].startsWith('nonce:'),
			);
			expect(nonceCalls.length).toBeGreaterThan(0);

			const [key, value, options] = nonceCalls[0];
			expect(key).toMatch(/^nonce:/);
			expect(options.expirationTtl).toBe(600); // 10 minutes
		});
	});

	describe('Rate Limiting', () => {
		it('should enforce rate limits', async () => {
			// This test would require mocking the rate limiter
			// For now, we verify the structure is correct
			const request = new Request('http://localhost/api/auth/nonce', {
				method: 'GET',
				headers: {
					'CF-Connecting-IP': '192.168.1.1',
				},
			});

			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);
			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);

			const { onRequest } = await import('@/../functions/api/auth/nonce');
			const response = await onRequest({ request, env: mockEnv } as any);

			expect(response.status).toBe(200);
			// Rate limit headers should be present
			expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
		});
	});

	describe('Security Headers', () => {
		it('should include security headers', async () => {
			const request = new Request('http://localhost/api/auth/nonce', {
				method: 'GET',
			});

			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);

			const { onRequest } = await import('@/../functions/api/auth/nonce');
			const response = await onRequest({ request, env: mockEnv } as any);

			expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});
	});

	describe('Error Handling', () => {
		it('should handle KV storage errors gracefully', async () => {
			const request = new Request('http://localhost/api/auth/nonce', {
				method: 'GET',
			});

			mockEnv.AUTH_SESSIONS.put.mockRejectedValue(new Error('KV Error'));

			const { onRequest } = await import('@/../functions/api/auth/nonce');
			const response = await onRequest({ request, env: mockEnv } as any);

			expect(response.status).toBe(500);
		});
	});
});
