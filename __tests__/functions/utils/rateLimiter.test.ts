/**
 * Unit tests for server-side rate limiter (Cloudflare Workers)
 */

import { checkRateLimit, createRateLimitHeaders } from '../../../functions/utils/rateLimiter';

// Mock KV namespace
const createMockKV = (): KVNamespace => {
	const store = new Map<string, string>();
	const expirations = new Map<string, number>();

	return {
		get: jest.fn(async (key: string) => {
			const expiration = expirations.get(key);
			if (expiration && Date.now() > expiration) {
				store.delete(key);
				expirations.delete(key);
				return null;
			}
			return store.get(key) || null;
		}),
		put: jest.fn(async (key: string, value: string, options?: { expirationTtl?: number }) => {
			store.set(key, value);
			if (options?.expirationTtl) {
				expirations.set(key, Date.now() + options.expirationTtl * 1000);
			}
		}),
		delete: jest.fn(async (key: string) => {
			store.delete(key);
			expirations.delete(key);
		}),
		list: jest.fn(),
		getWithMetadata: jest.fn(),
		// Add other KV methods as needed
	} as unknown as KVNamespace;
};

describe('rateLimiter (Server-side)', () => {
	// Note: getClientIP, createRateLimitResponse, and withRateLimit tests are skipped
	// because they require Request/Response globals which are not available in jsdom
	// These functions are tested in integration tests with actual Cloudflare Workers environment

	describe('checkRateLimit', () => {
		it('should allow first request', async () => {
			const kv = createMockKV();
			const result = await checkRateLimit(kv, '192.168.1.1', {
				limit: 5,
				windowSeconds: 60,
				keyPrefix: 'test',
			});

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(4);
			expect(result.limit).toBe(5);
		});

		it('should track request count', async () => {
			const kv = createMockKV();
			const config = { limit: 3, windowSeconds: 60, keyPrefix: 'test' };

			// First request
			let result = await checkRateLimit(kv, '192.168.1.1', config);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(2);

			// Second request
			result = await checkRateLimit(kv, '192.168.1.1', config);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(1);

			// Third request
			result = await checkRateLimit(kv, '192.168.1.1', config);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(0);
		});

		it('should block requests exceeding limit', async () => {
			const kv = createMockKV();
			const config = { limit: 2, windowSeconds: 60, keyPrefix: 'test' };

			// Use up limit
			await checkRateLimit(kv, '192.168.1.1', config);
			await checkRateLimit(kv, '192.168.1.1', config);

			// Should be blocked
			const result = await checkRateLimit(kv, '192.168.1.1', config);
			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it('should handle different IPs independently', async () => {
			const kv = createMockKV();
			const config = { limit: 1, windowSeconds: 60, keyPrefix: 'test' };

			// IP 1 uses up limit
			await checkRateLimit(kv, '192.168.1.1', config);
			let result = await checkRateLimit(kv, '192.168.1.1', config);
			expect(result.allowed).toBe(false);

			// IP 2 should still be allowed
			result = await checkRateLimit(kv, '192.168.1.2', config);
			expect(result.allowed).toBe(true);
		});

		it('should return correct reset time', async () => {
			const kv = createMockKV();
			const result = await checkRateLimit(kv, '192.168.1.1', {
				limit: 5,
				windowSeconds: 60,
				keyPrefix: 'test',
			});

			expect(result.resetIn).toBe(60);
		});
	});

	describe('createRateLimitHeaders', () => {
		it('should create correct rate limit headers', () => {
			const headers = createRateLimitHeaders({
				allowed: true,
				currentCount: 5,
				limit: 10,
				remaining: 5,
				resetIn: 30,
			});

			expect(headers['X-RateLimit-Limit']).toBe('10');
			expect(headers['X-RateLimit-Remaining']).toBe('5');
			expect(headers['X-RateLimit-Reset']).toBe('30');
		});
	});

});

