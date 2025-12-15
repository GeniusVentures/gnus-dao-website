/**
 * Tests for Rate Limiter Utility
 * Critical for DDoS protection
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
	getClientIP,
	checkRateLimit,
	createRateLimitHeaders,
	createRateLimitResponse,
	withRateLimit,
} from '@/../functions/utils/rateLimiter';

describe('Rate Limiter Utility', () => {
	let mockKV: any;

	beforeEach(() => {
		mockKV = {
			get: jest.fn(),
			put: jest.fn(),
			getWithMetadata: jest.fn(),
		};
	});

	describe('getClientIP', () => {
		it('should extract IP from CF-Connecting-IP header', () => {
			const request = new Request('http://localhost', {
				headers: {
					'CF-Connecting-IP': '192.168.1.1',
				},
			});

			const ip = getClientIP(request);
			expect(ip).toBe('192.168.1.1');
		});

		it('should fallback to X-Forwarded-For', () => {
			const request = new Request('http://localhost', {
				headers: {
					'X-Forwarded-For': '192.168.1.2, 10.0.0.1',
				},
			});

			const ip = getClientIP(request);
			expect(ip).toBe('192.168.1.2');
		});

		it('should fallback to X-Real-IP', () => {
			const request = new Request('http://localhost', {
				headers: {
					'X-Real-IP': '192.168.1.3',
				},
			});

			const ip = getClientIP(request);
			expect(ip).toBe('192.168.1.3');
		});

		it('should return unknown if no IP headers present', () => {
			const request = new Request('http://localhost');

			const ip = getClientIP(request);
			expect(ip).toBe('unknown');
		});
	});

	describe('checkRateLimit', () => {
		it('should allow requests under the limit', async () => {
			mockKV.get.mockResolvedValue('5');
			mockKV.put.mockResolvedValue(undefined);

			const result = await checkRateLimit(mockKV, '192.168.1.1', {
				limit: 10,
				windowSeconds: 60,
			});

			expect(result.allowed).toBe(true);
			expect(result.currentCount).toBe(6);
			expect(result.remaining).toBe(4);
		});

		it('should block requests over the limit', async () => {
			mockKV.get.mockResolvedValue('10');
			mockKV.getWithMetadata.mockResolvedValue({ value: '10', metadata: null });

			const result = await checkRateLimit(mockKV, '192.168.1.1', {
				limit: 10,
				windowSeconds: 60,
			});

			expect(result.allowed).toBe(false);
			expect(result.currentCount).toBe(10);
			expect(result.remaining).toBe(0);
		});

		it('should initialize counter for first request', async () => {
			mockKV.get.mockResolvedValue(null);
			mockKV.put.mockResolvedValue(undefined);

			const result = await checkRateLimit(mockKV, '192.168.1.1', {
				limit: 10,
				windowSeconds: 60,
			});

			expect(result.allowed).toBe(true);
			expect(result.currentCount).toBe(1);
			expect(mockKV.put).toHaveBeenCalledWith('rate:192.168.1.1', '1', {
				expirationTtl: 60,
			});
		});

		it('should use custom key prefix', async () => {
			mockKV.get.mockResolvedValue(null);
			mockKV.put.mockResolvedValue(undefined);

			await checkRateLimit(mockKV, '192.168.1.1', {
				limit: 10,
				windowSeconds: 60,
				keyPrefix: 'custom',
			});

			expect(mockKV.get).toHaveBeenCalledWith('custom:192.168.1.1');
		});

		it('should set correct TTL', async () => {
			mockKV.get.mockResolvedValue(null);
			mockKV.put.mockResolvedValue(undefined);

			await checkRateLimit(mockKV, '192.168.1.1', {
				limit: 5,
				windowSeconds: 120,
			});

			expect(mockKV.put).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
				expirationTtl: 120,
			});
		});
	});

	describe('createRateLimitHeaders', () => {
		it('should create correct headers', () => {
			const result = {
				allowed: true,
				currentCount: 5,
				limit: 10,
				resetIn: 60,
				remaining: 5,
			};

			const headers = createRateLimitHeaders(result);

			expect(headers['X-RateLimit-Limit']).toBe('10');
			expect(headers['X-RateLimit-Remaining']).toBe('5');
			expect(headers['X-RateLimit-Reset']).toBe('60');
		});
	});

	describe('createRateLimitResponse', () => {
		it('should create 429 response with correct structure', async () => {
			const result = {
				allowed: false,
				currentCount: 10,
				limit: 10,
				resetIn: 60,
				remaining: 0,
			};

			const response = createRateLimitResponse(result);

			expect(response.status).toBe(429);
			expect(response.headers.get('Retry-After')).toBe('60');
			expect(response.headers.get('X-RateLimit-Limit')).toBe('10');

			const data = await response.json();
			expect(data.error).toBe('Rate limit exceeded');
			expect(data.resetIn).toBe(60);
		});
	});

	describe('withRateLimit middleware', () => {
		it('should call handler when under limit', async () => {
			mockKV.get.mockResolvedValue('5');
			mockKV.put.mockResolvedValue(undefined);

			const handler = jest.fn().mockResolvedValue(new Response('Success', { status: 200 }));

			const request = new Request('http://localhost', {
				headers: { 'CF-Connecting-IP': '192.168.1.1' },
			});

			const response = await withRateLimit(
				request,
				mockKV,
				{ limit: 10, windowSeconds: 60 },
				handler,
			);

			expect(handler).toHaveBeenCalled();
			expect(response.status).toBe(200);
			expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
		});

		it('should return 429 when over limit', async () => {
			mockKV.get.mockResolvedValue('10');
			mockKV.getWithMetadata.mockResolvedValue({ value: '10', metadata: null });

			const handler = jest.fn();

			const request = new Request('http://localhost', {
				headers: { 'CF-Connecting-IP': '192.168.1.1' },
			});

			const response = await withRateLimit(
				request,
				mockKV,
				{ limit: 10, windowSeconds: 60 },
				handler,
			);

			expect(handler).not.toHaveBeenCalled();
			expect(response.status).toBe(429);
		});

		it('should add rate limit headers to successful responses', async () => {
			mockKV.get.mockResolvedValue('5');
			mockKV.put.mockResolvedValue(undefined);

			const handler = jest.fn().mockResolvedValue(
				new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
			);

			const request = new Request('http://localhost', {
				headers: { 'CF-Connecting-IP': '192.168.1.1' },
			});

			const response = await withRateLimit(
				request,
				mockKV,
				{ limit: 10, windowSeconds: 60 },
				handler,
			);

			expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
			expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});
	});

	describe('Rate Limit Scenarios', () => {
		it('should handle burst traffic correctly', async () => {
			let count = 0;
			mockKV.get.mockImplementation(() => Promise.resolve(String(count)));
			mockKV.put.mockImplementation(() => {
				count++;
				return Promise.resolve(undefined);
			});

			const request = new Request('http://localhost', {
				headers: { 'CF-Connecting-IP': '192.168.1.1' },
			});

			// Simulate 15 requests (limit is 10)
			for (let i = 0; i < 15; i++) {
				const result = await checkRateLimit(mockKV, '192.168.1.1', {
					limit: 10,
					windowSeconds: 60,
				});

				if (i < 10) {
					expect(result.allowed).toBe(true);
				} else {
					expect(result.allowed).toBe(false);
				}
			}
		});

		it('should handle different IPs independently', async () => {
			const storage: Record<string, string> = {};

			mockKV.get.mockImplementation((key: string) => Promise.resolve(storage[key] || null));
			mockKV.put.mockImplementation((key: string, value: string) => {
				storage[key] = value;
				return Promise.resolve(undefined);
			});

			// IP 1 makes 10 requests
			for (let i = 0; i < 10; i++) {
				const result = await checkRateLimit(mockKV, '192.168.1.1', {
					limit: 10,
					windowSeconds: 60,
				});
				expect(result.allowed).toBe(true);
			}

			// IP 2 should still be allowed
			const result = await checkRateLimit(mockKV, '192.168.1.2', {
				limit: 10,
				windowSeconds: 60,
			});
			expect(result.allowed).toBe(true);
		});
	});
});
