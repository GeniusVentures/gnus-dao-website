/**
 * Unit tests for client-side rate limiter
 */

import { checkRateLimit, RATE_LIMITS, resetRateLimit } from '@/lib/utils/clientRateLimiter';
import rateLimiter from '@/lib/utils/clientRateLimiter';

describe('clientRateLimiter', () => {
	beforeEach(() => {
		// Clear rate limiter state before each test
		jest.clearAllMocks();
		// Clear all rate limits
		rateLimiter.clearAll();
		// Reset time
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
		rateLimiter.clearAll();
	});

	describe('RATE_LIMITS configuration', () => {
		it('should have correct configuration for WALLET_CONNECT', () => {
			expect(RATE_LIMITS.WALLET_CONNECT).toEqual({
				limit: 3,
				windowMs: 60 * 1000,
				key: 'wallet-connect',
			});
		});

		it('should have correct configuration for PROPOSAL_CREATE', () => {
			expect(RATE_LIMITS.PROPOSAL_CREATE).toEqual({
				limit: 1,
				windowMs: 5 * 60 * 1000,
				key: 'proposal-create',
			});
		});

		it('should have correct configuration for VOTE_CAST', () => {
			expect(RATE_LIMITS.VOTE_CAST).toEqual({
				limit: 10,
				windowMs: 60 * 1000,
				key: 'vote-cast',
			});
		});

		it('should have correct configuration for IPFS_UPLOAD', () => {
			expect(RATE_LIMITS.IPFS_UPLOAD).toEqual({
				limit: 5,
				windowMs: 60 * 1000,
				key: 'ipfs-upload',
			});
		});

		it('should have correct configuration for DELEGATION', () => {
			expect(RATE_LIMITS.DELEGATION).toEqual({
				limit: 3,
				windowMs: 5 * 60 * 1000,
				key: 'delegation',
			});
		});
	});

	describe('checkRateLimit', () => {
		it('should allow first request', () => {
			jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
			const result = checkRateLimit('WALLET_CONNECT');
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(2); // 3 limit - 1 used = 2 remaining
		});

		it('should allow requests within limit', () => {
			jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

			// First request
			let result = checkRateLimit('WALLET_CONNECT');
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(2);

			// Second request
			result = checkRateLimit('WALLET_CONNECT');
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(1);

			// Third request
			result = checkRateLimit('WALLET_CONNECT');
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(0);
		});

		it('should block requests exceeding limit', () => {
			jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

			// Use up all 3 allowed requests
			checkRateLimit('WALLET_CONNECT');
			checkRateLimit('WALLET_CONNECT');
			checkRateLimit('WALLET_CONNECT');

			// Fourth request should be blocked
			const result = checkRateLimit('WALLET_CONNECT');
			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it('should reset after time window expires', () => {
			jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

			// Use up all 3 allowed requests
			checkRateLimit('WALLET_CONNECT');
			checkRateLimit('WALLET_CONNECT');
			checkRateLimit('WALLET_CONNECT');

			// Fourth request should be blocked
			let result = checkRateLimit('WALLET_CONNECT');
			expect(result.allowed).toBe(false);

			// Advance time by 61 seconds (past the 60 second window)
			jest.advanceTimersByTime(61 * 1000);

			// Should be allowed again
			result = checkRateLimit('WALLET_CONNECT');
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(2);
		});

		it('should return correct resetIn time', () => {
			jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

			const result = checkRateLimit('WALLET_CONNECT');
			expect(result.resetIn).toBeGreaterThan(0);
			expect(result.resetIn).toBeLessThanOrEqual(60); // Should be within 60 seconds
		});

		it('should handle different actions independently', () => {
			jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

			// Use up WALLET_CONNECT limit
			checkRateLimit('WALLET_CONNECT');
			checkRateLimit('WALLET_CONNECT');
			checkRateLimit('WALLET_CONNECT');

			// WALLET_CONNECT should be blocked
			let result = checkRateLimit('WALLET_CONNECT');
			expect(result.allowed).toBe(false);

			// VOTE_CAST should still be allowed (different action)
			result = checkRateLimit('VOTE_CAST');
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(9); // 10 limit - 1 used = 9 remaining
		});

		it('should handle PROPOSAL_CREATE with 5 minute window', () => {
			jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

			// First proposal should be allowed
			let result = checkRateLimit('PROPOSAL_CREATE');
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(0); // Only 1 allowed

			// Second proposal should be blocked
			result = checkRateLimit('PROPOSAL_CREATE');
			expect(result.allowed).toBe(false);

			// Advance time by 5 minutes and 1 second (past the 5 minute window)
			jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

			// Should be allowed again
			result = checkRateLimit('PROPOSAL_CREATE');
			expect(result.allowed).toBe(true);
		});
	});
});

