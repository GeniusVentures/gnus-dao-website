/**
 * IPFS Configuration
 * Centralized configuration for IPFS services and gateways
 */

import { IPFSServiceConfig } from './types';

// Environment variable helpers
const getEnvVar = (key: string, defaultValue?: string): string => {
	if (typeof window !== 'undefined') {
		return (window as any).__ENV__?.[key] || process.env[key] || defaultValue || '';
	}
	return process.env[key] || defaultValue || '';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
	const value = getEnvVar(key);
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
	const value = getEnvVar(key);
	if (value === '') return defaultValue;
	return value.toLowerCase() === 'true';
};

// Default IPFS gateways with fallbacks
export const DEFAULT_IPFS_GATEWAYS = {
	primary: 'https://ipfs.io/ipfs/',
	fallbacks: [
		'https://gateway.pinata.cloud/ipfs/',
		'https://cloudflare-ipfs.com/ipfs/',
		'https://dweb.link/ipfs/',
		'https://ipfs.infura.io/ipfs/',
	],
	timeout: 10000, // 10 seconds
};

// File size limits (10MB default)
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types for uploads
export const DEFAULT_ALLOWED_TYPES = [
	'image/*',
	'application/pdf',
	'text/plain',
	'application/json',
	'text/markdown',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Get IPFS service configuration from environment variables
 */
export function getIPFSConfig(): IPFSServiceConfig {
	return {
		pinataApiKey: getEnvVar('NEXT_PUBLIC_PINATA_API_KEY'),
		pinataSecretKey: getEnvVar('NEXT_PUBLIC_PINATA_SECRET_KEY'),
		pinataJWT: getEnvVar('NEXT_PUBLIC_PINATA_JWT'),
		ipfsApiUrl: getEnvVar('NEXT_PUBLIC_IPFS_API_URL'),
		ipfsApiKey: getEnvVar('NEXT_PUBLIC_IPFS_API_KEY'),
		ipfsApiSecret: getEnvVar('NEXT_PUBLIC_IPFS_API_SECRET'),
		gateways: {
			primary: getEnvVar('NEXT_PUBLIC_IPFS_GATEWAY', DEFAULT_IPFS_GATEWAYS.primary),
			fallbacks: [
				getEnvVar('NEXT_PUBLIC_IPFS_GATEWAY_BACKUP', DEFAULT_IPFS_GATEWAYS.fallbacks[0]),
				...DEFAULT_IPFS_GATEWAYS.fallbacks.slice(1),
			],
			timeout: getEnvNumber(
				'NEXT_PUBLIC_IPFS_GATEWAY_TIMEOUT',
				DEFAULT_IPFS_GATEWAYS.timeout,
			),
		},
		maxFileSize: getEnvNumber('NEXT_PUBLIC_IPFS_MAX_FILE_SIZE', DEFAULT_MAX_FILE_SIZE),
		allowedTypes: getEnvVar(
			'NEXT_PUBLIC_IPFS_ALLOWED_TYPES',
			DEFAULT_ALLOWED_TYPES.join(','),
		).split(','),
		pinToCluster: getEnvBoolean('NEXT_PUBLIC_IPFS_PIN_TO_CLUSTER', true),
	};
}

/**
 * Validate IPFS configuration
 */
export function validateIPFSConfig(config: IPFSServiceConfig): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check if at least one upload method is configured
	const hasPinata = !!(config.pinataApiKey && (config.pinataSecretKey || config.pinataJWT));
	const hasIPFSNode = !!config.ipfsApiUrl;

	if (!hasPinata && !hasIPFSNode) {
		errors.push(
			'No IPFS upload service configured. Please set up Pinata or IPFS node credentials.',
		);
	}

	// Validate gateways
	if (!config.gateways.primary) {
		errors.push('Primary IPFS gateway is required');
	}

	// Validate file size limit
	if (config.maxFileSize <= 0) {
		errors.push('Maximum file size must be greater than 0');
	}

	// Validate allowed types
	if (!config.allowedTypes || config.allowedTypes.length === 0) {
		errors.push('At least one allowed file type must be specified');
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Get IPFS gateway URL for a given hash
 */
export function getIPFSUrl(hash: string, gateway?: string): string {
	const config = getIPFSConfig();
	const selectedGateway = gateway || config.gateways.primary;

	// Remove any trailing slash and ensure proper format
	const cleanGateway = selectedGateway.replace(/\/$/, '');
	const cleanHash = hash.replace(/^\/ipfs\//, '');

	return `${cleanGateway}/${cleanHash}`;
}

/**
 * Check if IPFS is properly configured
 */
export function isIPFSConfigured(): boolean {
	const config = getIPFSConfig();
	const validation = validateIPFSConfig(config);
	return validation.valid;
}
