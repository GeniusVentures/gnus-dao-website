/**
 * Cloudflare Worker: Session Management
 * Validate and manage SIWE sessions
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
				'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
		});
	}

	// Get session from Authorization header
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return new Response(
			JSON.stringify({ error: 'Missing or invalid authorization header' }),
			{
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			},
		);
	}

	const token = authHeader.substring(7);

	try {
		// Verify JWT and extract session ID
		const payload = await verifyJWT(token, env.JWT_SECRET);
		const sessionId = payload.sid;

		if (request.method === 'GET') {
			// Get session details
			const sessionData = await env.AUTH_SESSIONS.get(`session:${sessionId}`);

			if (!sessionData) {
				return new Response(JSON.stringify({ error: 'Session not found or expired' }), {
					status: 404,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				});
			}

			const session = JSON.parse(sessionData);

			return new Response(
				JSON.stringify({
					success: true,
					session,
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Cache-Control': 'no-store, max-age=0',
					},
				},
			);
		} else if (request.method === 'DELETE') {
			// Delete session (logout)
			await env.AUTH_SESSIONS.delete(`session:${sessionId}`);

			return new Response(
				JSON.stringify({
					success: true,
					message: 'Session deleted',
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				},
			);
		} else {
			return new Response(JSON.stringify({ error: 'Method not allowed' }), {
				status: 405,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
	} catch (error) {
		console.error('Session operation failed:', error);
		return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
			status: 401,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}
};

/**
 * Verify JWT token
 */
async function verifyJWT(token: string, secret: string): Promise<any> {
	const parts = token.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid token format');
	}

	const [headerB64, payloadB64, signatureB64] = parts;
	const data = `${headerB64}.${payloadB64}`;

	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['verify'],
	);

	const signature = Uint8Array.from(atob(signatureB64 || ''), (c) => c.charCodeAt(0));
	const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));

	if (!isValid) {
		throw new Error('Invalid signature');
	}

	const payload = JSON.parse(atob(payloadB64 || ''));

	// Check expiration
	if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
		throw new Error('Token expired');
	}

	return payload;
}
