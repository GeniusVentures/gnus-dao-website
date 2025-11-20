/**
 * Client-Side Rate Limiter
 * Prevents abuse by throttling user actions on the client side
 */

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

class ClientRateLimiter {
	private storage: Map<string, RateLimitEntry> = new Map();

	/**
	 * Check if an action is allowed
	 * @param key - Unique identifier for the action (e.g., 'wallet-connect', 'proposal-create')
	 * @param limit - Maximum number of attempts allowed
	 * @param windowMs - Time window in milliseconds
	 * @returns Object with allowed status and retry information
	 */
	check(
		key: string,
		limit: number,
		windowMs: number,
	): { allowed: boolean; remaining: number; resetIn: number } {
		const now = Date.now();
		const entry = this.storage.get(key);

		// Clean up expired entries
		if (entry && entry.resetAt < now) {
			this.storage.delete(key);
		}

		// Get or create entry
		const current = this.storage.get(key) || {
			count: 0,
			resetAt: now + windowMs,
		};

		// Check if limit exceeded
		if (current.count >= limit) {
			const resetIn = Math.ceil((current.resetAt - now) / 1000);
			return {
				allowed: false,
				remaining: 0,
				resetIn,
			};
		}

		// Increment counter
		current.count++;
		this.storage.set(key, current);

		return {
			allowed: true,
			remaining: limit - current.count,
			resetIn: Math.ceil((current.resetAt - now) / 1000),
		};
	}

	/**
	 * Reset rate limit for a specific key
	 */
	reset(key: string): void {
		this.storage.delete(key);
	}

	/**
	 * Clear all rate limits
	 */
	clearAll(): void {
		this.storage.clear();
	}

	/**
	 * Get current status for a key
	 */
	getStatus(key: string): { count: number; resetIn: number } | null {
		const entry = this.storage.get(key);
		if (!entry) return null;

		const now = Date.now();
		if (entry.resetAt < now) {
			this.storage.delete(key);
			return null;
		}

		return {
			count: entry.count,
			resetIn: Math.ceil((entry.resetAt - now) / 1000),
		};
	}
}

// Singleton instance
const rateLimiter = new ClientRateLimiter();

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
	WALLET_CONNECT: {
		limit: 3,
		windowMs: 60 * 1000, // 1 minute
		key: 'wallet-connect',
	},
	PROPOSAL_CREATE: {
		limit: 1,
		windowMs: 5 * 60 * 1000, // 5 minutes
		key: 'proposal-create',
	},
	VOTE_CAST: {
		limit: 10,
		windowMs: 60 * 1000, // 1 minute
		key: 'vote-cast',
	},
	IPFS_UPLOAD: {
		limit: 5,
		windowMs: 60 * 1000, // 1 minute
		key: 'ipfs-upload',
	},
	DELEGATION: {
		limit: 3,
		windowMs: 5 * 60 * 1000, // 5 minutes
		key: 'delegation',
	},
} as const;

/**
 * Check if an action is rate limited
 */
export function checkRateLimit(action: keyof typeof RATE_LIMITS): {
	allowed: boolean;
	remaining: number;
	resetIn: number;
} {
	const config = RATE_LIMITS[action];
	return rateLimiter.check(config.key, config.limit, config.windowMs);
}

/**
 * Reset rate limit for an action
 */
export function resetRateLimit(action: keyof typeof RATE_LIMITS): void {
	const config = RATE_LIMITS[action];
	rateLimiter.reset(config.key);
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(
	action: keyof typeof RATE_LIMITS,
): { count: number; resetIn: number } | null {
	const config = RATE_LIMITS[action];
	return rateLimiter.getStatus(config.key);
}

export default rateLimiter;
