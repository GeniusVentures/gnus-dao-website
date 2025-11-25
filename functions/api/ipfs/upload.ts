/**
 * Cloudflare Worker: Secure IPFS Upload
 * Handles IPFS uploads with secure API key management and file validation
 * Rate Limited: 5 uploads per minute per authenticated user
 */

import { withRateLimit } from '../../utils/rateLimiter';
import { withErrorTracking } from '../../utils/errorTracking';

interface Env {
	PINATA_JWT: string;
	PINATA_API_KEY: string;
	PINATA_SECRET_KEY: string;
	AUTH_SESSIONS: KVNamespace;
	JWT_SECRET: string;
	SENTRY_DSN?: string;
	ENVIRONMENT?: string;
}

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'application/pdf',
	'text/plain',
	'application/json',
];

/**
 * Validate uploaded file
 */
function validateFile(file: File): { isValid: boolean; error?: string } {
	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		return {
			isValid: false,
			error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
		};
	}

	// Check MIME type
	if (!ALLOWED_MIME_TYPES.includes(file.type)) {
		return {
			isValid: false,
			error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
		};
	}

	// Check file extension
	const fileName = file.name.toLowerCase();
	const allowedExtensions = [
		'.jpg',
		'.jpeg',
		'.png',
		'.gif',
		'.webp',
		'.svg',
		'.pdf',
		'.txt',
		'.json',
	];
	const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));

	if (!hasValidExtension) {
		return {
			isValid: false,
			error: `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
		};
	}

	// Check for suspicious file names
	const suspiciousPatterns = [
		/\.exe$/i,
		/\.bat$/i,
		/\.cmd$/i,
		/\.sh$/i,
		/\.php$/i,
		/\.js$/i,
		/\.html$/i,
	];
	if (suspiciousPatterns.some((pattern) => pattern.test(fileName))) {
		return {
			isValid: false,
			error: 'Suspicious file name detected',
		};
	}

	return { isValid: true };
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
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	// Extract user address from JWT for rate limiting
	const token = authHeader.substring(7);
	let userAddress: string;

	try {
		const payload = await verifyJWT(token, env.JWT_SECRET);
		userAddress = payload.sub || payload.address;
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Invalid token' }), {
			status: 401,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	// Apply rate limiting: 5 uploads per minute per user
	return withRateLimit(
		request,
		env.AUTH_SESSIONS,
		{
			limit: 5,
			windowSeconds: 60,
			keyPrefix: `rate:upload:${userAddress}`,
		},
		async () => {
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

			// Validate file
			if (file instanceof File) {
				const validation = validateFile(file);
				if (!validation.isValid) {
					return new Response(JSON.stringify({ error: validation.error }), {
						status: 400,
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
						},
					});
				}
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
		},
	);
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

export const onRequest = withErrorTracking<Env>(handler);
