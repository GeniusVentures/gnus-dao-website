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
	NEXT_PUBLIC_IPFS_GATEWAY: string;
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

function getBuildTimeEnv(): Partial<RuntimeEnvConfig> {
	return {
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
		NEXT_PUBLIC_IPFS_GATEWAY:
			process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
		NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID || '',
		NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
	};
}

function hasBuildTimeEnv(env: Partial<RuntimeEnvConfig>): boolean {
	const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
	return (
		!!projectId &&
		projectId !== 'your_walletconnect_project_id_here' &&
		projectId !== 'placeholder' &&
		projectId !== 'build-placeholder'
	);
}

export async function preloadRuntimeEnv(): Promise<Partial<RuntimeEnvConfig>> {
	if (isLoaded && cachedRuntimeEnv) {
		return cachedRuntimeEnv;
	}

	// In development or when build-time env vars are already present, skip the API fetch
	const buildTimeEnv = getBuildTimeEnv();
	if (process.env.NODE_ENV === 'development' || hasBuildTimeEnv(buildTimeEnv)) {
		cachedRuntimeEnv = buildTimeEnv;
		isLoaded = true;
		return cachedRuntimeEnv;
	}

	// In production (Cloudflare Pages), fetch from the worker endpoint
	try {
		const response = await fetch('/api/config/runtime-env', {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
			signal: AbortSignal.timeout(3000), // 3s timeout — don't hang forever
		});

		if (response.ok) {
			const data = await response.json();
			cachedRuntimeEnv = data;
			isLoaded = true;
			return data;
		}
	} catch (error) {
		console.warn('Failed to load runtime environment from API, using build-time env:', error);
	}

	// Fallback to build-time env
	cachedRuntimeEnv = buildTimeEnv;
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
