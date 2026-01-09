import { NextRequest, NextResponse } from 'next/server';
import { withServerErrorTracking, addServerBreadcrumb } from '@/lib/middleware/serverErrorTracking';

/**
 * API endpoint to provide runtime environment configuration
 * This allows environment variables to be loaded at runtime instead of build time
 */
async function getHandler(request: NextRequest) {
	// Add breadcrumb for API request
	addServerBreadcrumb(
		'Loading runtime environment configuration',
		'api',
		'info',
		{ endpoint: '/api/config/runtime-env' }
	);
		const runtimeEnv = {
			NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
				process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
			NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS:
				process.env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS || '',
			NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS:
				process.env.NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS || '',
			NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS:
				process.env.NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS || '',
			NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS:
				process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS || '',
			NEXT_PUBLIC_PINATA_API_KEY: process.env.NEXT_PUBLIC_PINATA_API_KEY || '',
			NEXT_PUBLIC_PINATA_SECRET_KEY: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '',
			NEXT_PUBLIC_PINATA_JWT: process.env.NEXT_PUBLIC_PINATA_JWT || '',
			NEXT_PUBLIC_IPFS_GATEWAY:
				process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
			NEXT_PUBLIC_IPFS_API_URL: process.env.NEXT_PUBLIC_IPFS_API_URL || '',
			NEXT_PUBLIC_IPFS_API_KEY: process.env.NEXT_PUBLIC_IPFS_API_KEY || '',
			NEXT_PUBLIC_IPFS_API_SECRET: process.env.NEXT_PUBLIC_IPFS_API_SECRET || '',
			NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID || '',
			NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
		};

	return NextResponse.json(runtimeEnv, {
		headers: {
			'Cache-Control': 'public, max-age=60, s-maxage=60',
		},
	});
}

// Export the wrapped handler with error tracking
export const GET = withServerErrorTracking(getHandler, {
	endpoint: '/api/config/runtime-env',
	method: 'GET',
});
