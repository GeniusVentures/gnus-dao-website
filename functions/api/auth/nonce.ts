/**
 * Cloudflare Worker: Generate SIWE Nonce
 * Secure nonce generation for Sign-In with Ethereum
 */

interface Env {
	AUTH_SESSIONS: KVNamespace;
	JWT_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	const { request, env } = context;

	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	}

	if (request.method !== 'GET') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		// Generate cryptographically secure nonce
		const nonceBytes = new Uint8Array(16);
		crypto.getRandomValues(nonceBytes);
		const nonce = Array.from(nonceBytes)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');

		// Store nonce in KV with 10-minute expiration
		const expiresAt = Date.now() + 10 * 60 * 1000;
		await env.AUTH_SESSIONS.put(
			`nonce:${nonce}`,
			JSON.stringify({ createdAt: Date.now(), expiresAt }),
			{ expirationTtl: 600 }, // 10 minutes
		);

		return new Response(JSON.stringify({ nonce, expiresAt }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-store, max-age=0',
			},
		});
	} catch (error) {
		console.error('Nonce generation failed:', error);
		return new Response(JSON.stringify({ error: 'Failed to generate nonce' }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}
};
