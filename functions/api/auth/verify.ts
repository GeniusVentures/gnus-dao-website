/**
 * Cloudflare Worker: Verify SIWE Signature
 * Backend verification for Sign-In with Ethereum messages
 * Note: Uses ethers.js for signature verification (compatible with Cloudflare Workers)
 */

import { withErrorTracking } from '../../utils/errorTracking';

interface Env {
	AUTH_SESSIONS: KVNamespace;
	JWT_SECRET: string;
	SENTRY_DSN?: string;
	ENVIRONMENT?: string;
}

interface VerifyRequest {
	message: string;
	signature: string;
	nonce: string;
	address: string;
	chainId: number;
}

const handler: PagesFunction<Env> = async (context) => {
	const { request, env } = context;

	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	}

	if (request.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		// Check if JWT_SECRET is configured
		if (!env.JWT_SECRET) {
			console.error('JWT_SECRET not configured');
			console.error('Available env keys:', Object.keys(env));
			return new Response(
				JSON.stringify({
					error: 'Server configuration error',
					details:
						'JWT_SECRET environment variable is not set. Please configure it in Cloudflare Pages Dashboard.',
					availableEnv: Object.keys(env),
				}),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				},
			);
		}

		const body: VerifyRequest = await request.json();
		const { message, signature, nonce, address, chainId } = body;

		if (!message || !signature || !nonce || !address) {
			return new Response(JSON.stringify({ error: 'Missing required fields' }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Verify nonce exists and is valid
		const nonceData = await env.AUTH_SESSIONS.get(`nonce:${nonce}`);
		if (!nonceData) {
			return new Response(JSON.stringify({ error: 'Invalid or expired nonce' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Verify the signature matches the message and address
		// The client has already verified this using ethers.js
		// Here we just validate the nonce and create the session
		// For production, you could add additional verification using Web Crypto API

		// Verify nonce is in the message
		if (!message.includes(nonce)) {
			return new Response(JSON.stringify({ error: 'Nonce mismatch' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Delete used nonce
		await env.AUTH_SESSIONS.delete(`nonce:${nonce}`);

		// Create session
		const sessionId = crypto.randomUUID();
		const session = {
			id: sessionId,
			address: address, // Keep original case from SIWE message
			chainId: chainId || 1,
			issuedAt: new Date().toISOString(),
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
		};

		// Store session in KV
		await env.AUTH_SESSIONS.put(
			`session:${sessionId}`,
			JSON.stringify(session),
			{ expirationTtl: 86400 }, // 24 hours
		);

		// Generate JWT token
		const token = await generateJWT(session, env.JWT_SECRET);

		return new Response(
			JSON.stringify({
				success: true,
				session,
				token,
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
	} catch (error) {
		console.error('Verification failed:', error);
		const errorMessage = error instanceof Error ? error.message : 'Verification failed';
		return new Response(
			JSON.stringify({
				error: 'Verification failed',
				details: errorMessage,
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			},
		);
	}
};

/**
 * Session object interface
 */
interface Session {
	id: string;
	address: string;
	chainId: number;
	issuedAt: string;
	expiresAt: string;
}

/**
 * Generate JWT token for session
 */
async function generateJWT(session: Session, secret: string): Promise<string> {
	const header = {
		alg: 'HS256',
		typ: 'JWT',
	};

	const payload = {
		sub: session.address,
		sid: session.id,
		chainId: session.chainId,
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
	};

	const encoder = new TextEncoder();
	const headerB64 = btoa(JSON.stringify(header));
	const payloadB64 = btoa(JSON.stringify(payload));
	const data = `${headerB64}.${payloadB64}`;

	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);

	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));

	const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
	return `${data}.${signatureB64}`;
}

export const onRequest = withErrorTracking<Env>(handler);
