/**
 * Cloudflare Worker: Secure IPFS Upload
 * Handles IPFS uploads with secure API key management
 */

interface Env {
	PINATA_JWT: string;
	PINATA_API_KEY: string;
	PINATA_SECRET_KEY: string;
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
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
		});
	}

	if (request.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Verify authentication
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return new Response(JSON.stringify({ error: '⚠️' }), {
			status: 401,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	try {
		// Verify session token
		const token = authHeader.substring(7);
		await verifyJWT(token, env.JWT_SECRET);

		// Get form data
		const formData = await request.formData();
		const file = formData.get('file');
		const metadata = formData.get('metadata');

		if (!file) {
			return new Response(JSON.stringify({ error: 'No file provided' }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Upload to Pinata using secure API key from environment
		const pinataFormData = new FormData();
		pinataFormData.append('file', file);

		if (metadata) {
			pinataFormData.append('pinataMetadata', metadata);
		}

		const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.PINATA_JWT}`,
			},
			body: pinataFormData,
		});

		if (!pinataResponse.ok) {
			throw new Error('Pinata upload failed');
		}

		const result = await pinataResponse.json();

		return new Response(
			JSON.stringify({
				success: true,
				ipfsHash: result.IpfsHash,
				pinSize: result.PinSize,
				timestamp: result.Timestamp,
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			},
		);
	} catch (error) {
		console.error('IPFS upload failed:', error);
		return new Response(JSON.stringify({ error: 'Upload failed' }), {
			status: 500,
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
