/**
 * Runtime environment configuration
 * These variables are loaded at runtime from the server or Cloudflare Workers
 */

export interface RuntimeEnvConfig {
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

let cachedRuntimeEnv: Partial<RuntimeEnvConfig> | null = null;
let isLoaded = false;

export function isRuntimeEnvLoaded(): boolean {
	return isLoaded;
}

export function getCachedRuntimeEnv(): Partial<RuntimeEnvConfig> | null {
	return cachedRuntimeEnv;
}

export async function preloadRuntimeEnv(): Promise<Partial<RuntimeEnvConfig>> {
	if (isLoaded && cachedRuntimeEnv) {
		return cachedRuntimeEnv;
	}

	try {
		// Check if we're in a static export environment (Cloudflare Pages)
		const isStaticExport = process.env.STATIC_EXPORT === 'true' || 
							  process.env.CLOUDFLARE_PAGES === 'true' ||
							  typeof window !== 'undefined';

		if (isStaticExport && typeof window !== 'undefined') {
			// In browser environment, fetch from Cloudflare Functions
			const response = await fetch('/api/config/runtime-env', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const data = await response.json();
				cachedRuntimeEnv = data;
				isLoaded = true;
				return data;
			}
		}
	} catch (error) {
		console.warn('Failed to load runtime environment from API:', error);
	}

	// Fallback to environment variables (build time or server-side)
	cachedRuntimeEnv = {
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
			process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'test-fallback-project-id',
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

	isLoaded = true;
	return cachedRuntimeEnv;
}

export async function getRuntimeEnvVar(key: keyof RuntimeEnvConfig): Promise<string> {
	const env = await preloadRuntimeEnv();
	return (env[key] as string) || '';
}

export function resetRuntimeEnv(): void {
	cachedRuntimeEnv = null;
	isLoaded = false;
}
