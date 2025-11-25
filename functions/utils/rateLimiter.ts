/**
 * Rate Limiter Utility for Cloudflare Workers
 * Provides IP-based rate limiting with configurable limits and time windows
 */

export interface RateLimitConfig {
	/**
	 * Maximum number of requests allowed in the time window
	 */
	limit: number;

	/**
	 * Time window in seconds
	 */
	windowSeconds: number;

	/**
	 * Optional: Custom key prefix for KV storage
	 */
	keyPrefix?: string;
}

export interface RateLimitResult {
	/**
	 * Whether the request is allowed
	 */
	allowed: boolean;

	/**
	 * Current request count in the window
	 */
	currentCount: number;

	/**
	 * Maximum allowed requests
	 */
	limit: number;

	/**
	 * Seconds until the rate limit resets
	 */
	resetIn: number;

	/**
	 * Remaining requests in the current window
	 */
	remaining: number;
}

/**
 * Extract client IP from request
 */
export function getClientIP(request: Request): string {
	// Cloudflare provides the real IP in CF-Connecting-IP header
	const cfIP = request.headers.get('CF-Connecting-IP');
	if (cfIP) return cfIP;

	// Fallback to X-Forwarded-For
	const forwardedFor = request.headers.get('X-Forwarded-For');
	if (forwardedFor) {
		return forwardedFor.split(',')[0].trim();
	}

	// Fallback to X-Real-IP
	const realIP = request.headers.get('X-Real-IP');
	if (realIP) return realIP;

	// Default fallback
	return 'unknown';
}

/**
 * Check and enforce rate limit
 */
export async function checkRateLimit(
	kv: KVNamespace,
	identifier: string,
	config: RateLimitConfig,
): Promise<RateLimitResult> {
	const { limit, windowSeconds, keyPrefix = 'rate' } = config;
	const key = `${keyPrefix}:${identifier}`;

	// Get current count from KV
	const currentData = await kv.get(key);
	const currentCount = currentData ? parseInt(currentData) : 0;

	// Check if limit exceeded
	if (currentCount >= limit) {
		// Get TTL to calculate reset time
		const metadata = await kv.getWithMetadata(key);
		const resetIn = windowSeconds; // Approximate, KV doesn't expose exact TTL

		return {
			allowed: false,
			currentCount,
			limit,
			resetIn,
			remaining: 0,
		};
	}

	// Increment counter
	const newCount = currentCount + 1;
	await kv.put(key, String(newCount), {
		expirationTtl: windowSeconds,
	});

	return {
		allowed: true,
		currentCount: newCount,
		limit,
		resetIn: windowSeconds,
		remaining: limit - newCount,
	};
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
	return {
		'X-RateLimit-Limit': String(result.limit),
		'X-RateLimit-Remaining': String(result.remaining),
		'X-RateLimit-Reset': String(result.resetIn),
	};
}

/**
 * Create 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
	return new Response(
		JSON.stringify({
			error: 'Rate limit exceeded',
			message: `Too many requests. Please try again in ${result.resetIn} seconds.`,
			limit: result.limit,
			remaining: result.remaining,
			resetIn: result.resetIn,
		}),
		{
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Retry-After': String(result.resetIn),
				...createRateLimitHeaders(result),
			},
		},
	);
}

/**
 * Middleware wrapper for rate limiting
 */
export async function withRateLimit(
	request: Request,
	kv: KVNamespace,
	config: RateLimitConfig,
	handler: () => Promise<Response>,
): Promise<Response> {
	const clientIP = getClientIP(request);
	const result = await checkRateLimit(kv, clientIP, config);

	if (!result.allowed) {
		return createRateLimitResponse(result);
	}

	// Add rate limit headers to successful response
	const response = await handler();
	const headers = new Headers(response.headers);

	Object.entries(createRateLimitHeaders(result)).forEach(([key, value]) => {
		headers.set(key, value);
	});

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
