/**
 * Cloudflare Worker: Runtime Environment Configuration
 * Provides runtime environment variables for the frontend
 * GET /api/config/runtime-env - Returns environment configuration
 */

import { withErrorTracking } from '../../utils/errorTracking';

interface Env {
	// Environment variables that should be exposed to the frontend
	NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string;
	NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS?: string;
	NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS?: string;
	NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS?: string;
	NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS?: string;
	NEXT_PUBLIC_PINATA_API_KEY?: string;
	NEXT_PUBLIC_PINATA_SECRET_KEY?: string;
	NEXT_PUBLIC_PINATA_JWT?: string;
	NEXT_PUBLIC_IPFS_GATEWAY?: string;
	NEXT_PUBLIC_IPFS_API_URL?: string;
	NEXT_PUBLIC_IPFS_API_KEY?: string;
	NEXT_PUBLIC_IPFS_API_SECRET?: string;
	NEXT_PUBLIC_ANALYTICS_ID?: string;
	NEXT_PUBLIC_API_BASE_URL?: string;
}

const handler: PagesFunction<Env> = async (context) => {
	const { request, env } = context;

	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	}

	if (request.method !== 'GET') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	try {
		// Build runtime environment configuration
		const runtimeEnv = {
			NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
			NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS: env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS || '',
			NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS: env.NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS || '',
			NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS: env.NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS || '',
			NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS: env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS || '',
			NEXT_PUBLIC_PINATA_API_KEY: env.NEXT_PUBLIC_PINATA_API_KEY || '',
			NEXT_PUBLIC_PINATA_SECRET_KEY: env.NEXT_PUBLIC_PINATA_SECRET_KEY || '',
			NEXT_PUBLIC_PINATA_JWT: env.NEXT_PUBLIC_PINATA_JWT || '',
			NEXT_PUBLIC_IPFS_GATEWAY: env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
			NEXT_PUBLIC_IPFS_API_URL: env.NEXT_PUBLIC_IPFS_API_URL || '',
			NEXT_PUBLIC_IPFS_API_KEY: env.NEXT_PUBLIC_IPFS_API_KEY || '',
			NEXT_PUBLIC_IPFS_API_SECRET: env.NEXT_PUBLIC_IPFS_API_SECRET || '',
			NEXT_PUBLIC_ANALYTICS_ID: env.NEXT_PUBLIC_ANALYTICS_ID || '',
			NEXT_PUBLIC_API_BASE_URL: env.NEXT_PUBLIC_API_BASE_URL || '',
		};

		return new Response(JSON.stringify(runtimeEnv), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'public, max-age=60, s-maxage=60',
			},
		});
	} catch (error) {
		console.error('Runtime environment configuration failed:', error);

		return new Response(JSON.stringify({ 
			error: 'Failed to load runtime environment configuration',
			timestamp: new Date().toISOString()
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}
};

export const onRequest = withErrorTracking<Env>(handler);