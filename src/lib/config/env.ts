/**
 * Build-time environment configuration
 * These variables are available at build time and embedded in the bundle
 */

export interface EnvConfig {
	NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: string;
	NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS: string;
	NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS: string;
	NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS: string;
	NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS: string;
	NEXT_PUBLIC_PINATA_API_KEY: string;
	NEXT_PUBLIC_PINATA_SECRET_KEY: string;
	NEXT_PUBLIC_PINATA_JWT: string;
	NEXT_PUBLIC_IPFS_GATEWAY: string;
	NEXT_PUBLIC_IPFS_API_URL: string;
	NEXT_PUBLIC_IPFS_API_KEY: string;
	NEXT_PUBLIC_IPFS_API_SECRET: string;
	NEXT_PUBLIC_ANALYTICS_ID: string;
	NEXT_PUBLIC_API_BASE_URL: string;
}

/**
 * Get build-time environment variables
 * These are embedded in the bundle at build time
 * Note: In the browser, process.env is replaced at build time by Next.js
 */
export function getEnv(): Partial<EnvConfig> {
	// Check if we're in the browser
	const isBrowser = typeof window !== 'undefined';

	// In the browser, process.env values are replaced at build time by Next.js
	// If they're not available, return empty strings
	return {
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
		NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS || '',
		NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS || '',
		NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS || '',
		NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS || '',
		NEXT_PUBLIC_PINATA_API_KEY:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_PINATA_API_KEY || '',
		NEXT_PUBLIC_PINATA_SECRET_KEY:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '',
		NEXT_PUBLIC_PINATA_JWT:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_PINATA_JWT || '',
		NEXT_PUBLIC_IPFS_GATEWAY:
			isBrowser && typeof process === 'undefined'
				? 'https://ipfs.io/ipfs/'
				: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
		NEXT_PUBLIC_IPFS_API_URL:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_IPFS_API_URL || '',
		NEXT_PUBLIC_IPFS_API_KEY:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_IPFS_API_KEY || '',
		NEXT_PUBLIC_IPFS_API_SECRET:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_IPFS_API_SECRET || '',
		NEXT_PUBLIC_ANALYTICS_ID:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_ANALYTICS_ID || '',
		NEXT_PUBLIC_API_BASE_URL:
			isBrowser && typeof process === 'undefined'
				? ''
				: process.env.NEXT_PUBLIC_API_BASE_URL || '',
	};
}

/**
 * Validate that required environment variables are set
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	const env = getEnv();

	if (!env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
		errors.push('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set');
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Get contract address for a specific network
 */
export function getContractAddress(network: string): string {
	const env = getEnv();

	switch (network.toLowerCase()) {
		case 'sepolia':
			return env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS || '';
		case 'polygon_amoy':
		case 'polygon-amoy':
			return env.NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS || '';
		case 'base_sepolia':
		case 'base-sepolia':
			return env.NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS || '';
		case 'arbitrum_sepolia':
		case 'arbitrum-sepolia':
			return env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS || '';
		default:
			return '';
	}
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
	// In the browser, check if we're on localhost
	if (typeof window !== 'undefined') {
		return (
			window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
		);
	}
	// On the server, check NODE_ENV
	return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
	// In the browser, check if we're NOT on localhost
	if (typeof window !== 'undefined') {
		return (
			window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
		);
	}
	// On the server, check NODE_ENV
	return process.env.NODE_ENV === 'production';
}
