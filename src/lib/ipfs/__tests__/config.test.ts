/**
 * IPFS Config Tests
 * Unit tests for IPFS configuration functions
 */

import {
	getIPFSConfig,
	validateIPFSConfig,
	getIPFSUrl,
	isIPFSConfigured,
	DEFAULT_IPFS_GATEWAYS,
	DEFAULT_MAX_FILE_SIZE,
	DEFAULT_ALLOWED_TYPES,
} from '../config';

// Mock environment variables
const mockEnv = {
	NODE_ENV: 'test' as const,
	NEXT_PUBLIC_PINATA_API_KEY: 'test-api-key',
	NEXT_PUBLIC_PINATA_SECRET_KEY: 'test-secret-key',
	NEXT_PUBLIC_PINATA_JWT: 'test-jwt',
	NEXT_PUBLIC_IPFS_GATEWAY: 'https://test-gateway.com/ipfs/',
	NEXT_PUBLIC_IPFS_GATEWAY_BACKUP: 'https://backup-gateway.com/ipfs/',
	NEXT_PUBLIC_IPFS_MAX_FILE_SIZE: '5242880', // 5MB
	NEXT_PUBLIC_IPFS_ALLOWED_TYPES: 'image/*,text/plain',
	NEXT_PUBLIC_IPFS_PIN_TO_CLUSTER: 'true',
};

describe('IPFS Config', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('getIPFSConfig', () => {
		it('should return default configuration when no env vars are set', () => {
			process.env = { NODE_ENV: 'test' };

			const config = getIPFSConfig();

			expect(config.gateways.primary).toBe(DEFAULT_IPFS_GATEWAYS.primary);
			expect(config.maxFileSize).toBe(DEFAULT_MAX_FILE_SIZE);
			expect(config.allowedTypes).toEqual(DEFAULT_ALLOWED_TYPES);
			expect(config.pinToCluster).toBe(true);
		});

		it('should use environment variables when available', () => {
			process.env = mockEnv;

			const config = getIPFSConfig();

			expect(config.pinataApiKey).toBe('test-api-key');
			expect(config.pinataSecretKey).toBe('test-secret-key');
			expect(config.pinataJWT).toBe('test-jwt');
			expect(config.gateways.primary).toBe('https://test-gateway.com/ipfs/');
			expect(config.gateways.fallbacks[0]).toBe('https://backup-gateway.com/ipfs/');
			expect(config.maxFileSize).toBe(5242880);
			expect(config.allowedTypes).toEqual(['image/*', 'text/plain']);
			expect(config.pinToCluster).toBe(true);
		});

		it('should handle boolean environment variables correctly', () => {
			process.env = {
				...mockEnv,
				NEXT_PUBLIC_IPFS_PIN_TO_CLUSTER: 'false',
			};

			const config = getIPFSConfig();
			expect(config.pinToCluster).toBe(false);
		});

		it('should handle numeric environment variables correctly', () => {
			process.env = {
				...mockEnv,
				NEXT_PUBLIC_IPFS_MAX_FILE_SIZE: 'invalid',
			};

			const config = getIPFSConfig();
			expect(config.maxFileSize).toBe(DEFAULT_MAX_FILE_SIZE); // Should fall back to default
		});
	});

	describe('validateIPFSConfig', () => {
		it('should validate a complete configuration', () => {
			const config = {
				pinataApiKey: 'test-key',
				pinataSecretKey: 'test-secret',
				pinataJWT: undefined,
				ipfsApiUrl: undefined,
				ipfsApiKey: undefined,
				ipfsApiSecret: undefined,
				gateways: {
					primary: 'https://ipfs.io/ipfs/',
					fallbacks: ['https://gateway.pinata.cloud/ipfs/'],
					timeout: 10000,
				},
				maxFileSize: 10485760,
				allowedTypes: ['image/*', 'text/plain'],
				pinToCluster: true,
			};

			const result = validateIPFSConfig(config);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect missing upload service configuration', () => {
			const config = {
				pinataApiKey: undefined,
				pinataSecretKey: undefined,
				pinataJWT: undefined,
				ipfsApiUrl: undefined,
				ipfsApiKey: undefined,
				ipfsApiSecret: undefined,
				gateways: {
					primary: 'https://ipfs.io/ipfs/',
					fallbacks: ['https://gateway.pinata.cloud/ipfs/'],
					timeout: 10000,
				},
				maxFileSize: 10485760,
				allowedTypes: ['image/*'],
				pinToCluster: true,
			};

			const result = validateIPFSConfig(config);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				'No IPFS upload service configured. Please set up Pinata or IPFS node credentials.',
			);
		});

		it('should detect missing primary gateway', () => {
			const config = {
				pinataApiKey: 'test-key',
				pinataSecretKey: 'test-secret',
				pinataJWT: undefined,
				ipfsApiUrl: undefined,
				ipfsApiKey: undefined,
				ipfsApiSecret: undefined,
				gateways: {
					primary: '',
					fallbacks: ['https://gateway.pinata.cloud/ipfs/'],
					timeout: 10000,
				},
				maxFileSize: 10485760,
				allowedTypes: ['image/*'],
				pinToCluster: true,
			};

			const result = validateIPFSConfig(config);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Primary IPFS gateway is required');
		});

		it('should detect invalid file size', () => {
			const config = {
				pinataApiKey: 'test-key',
				pinataSecretKey: 'test-secret',
				pinataJWT: undefined,
				ipfsApiUrl: undefined,
				ipfsApiKey: undefined,
				ipfsApiSecret: undefined,
				gateways: {
					primary: 'https://ipfs.io/ipfs/',
					fallbacks: ['https://gateway.pinata.cloud/ipfs/'],
					timeout: 10000,
				},
				maxFileSize: 0,
				allowedTypes: ['image/*'],
				pinToCluster: true,
			};

			const result = validateIPFSConfig(config);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Maximum file size must be greater than 0');
		});

		it('should detect missing allowed types', () => {
			const config = {
				pinataApiKey: 'test-key',
				pinataSecretKey: 'test-secret',
				pinataJWT: undefined,
				ipfsApiUrl: undefined,
				ipfsApiKey: undefined,
				ipfsApiSecret: undefined,
				gateways: {
					primary: 'https://ipfs.io/ipfs/',
					fallbacks: ['https://gateway.pinata.cloud/ipfs/'],
					timeout: 10000,
				},
				maxFileSize: 10485760,
				allowedTypes: [],
				pinToCluster: true,
			};

			const result = validateIPFSConfig(config);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('At least one allowed file type must be specified');
		});
	});

	describe('getIPFSUrl', () => {
		it('should generate correct IPFS URLs', () => {
			const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
			const gateway = 'https://ipfs.io/ipfs/';

			const url = getIPFSUrl(hash, gateway);
			expect(url).toBe(`https://ipfs.io/ipfs/${hash}`);
		});

		it('should handle gateways with trailing slashes', () => {
			const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
			const gateway = 'https://ipfs.io/ipfs/';

			const url = getIPFSUrl(hash, gateway);
			expect(url).toBe(`https://ipfs.io/ipfs/${hash}`);
		});

		it('should handle hashes with /ipfs/ prefix', () => {
			const hash = '/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
			const gateway = 'https://ipfs.io/ipfs/';

			const url = getIPFSUrl(hash, gateway);
			expect(url).toBe(
				'https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
			);
		});

		it('should use default gateway when none provided', () => {
			process.env = mockEnv;

			const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
			const url = getIPFSUrl(hash);

			expect(url).toBe(`https://test-gateway.com/ipfs/${hash}`);
		});
	});

	describe('isIPFSConfigured', () => {
		it('should return true for valid configuration', () => {
			process.env = mockEnv;

			const configured = isIPFSConfigured();
			expect(configured).toBe(true);
		});

		it('should return false for invalid configuration', () => {
			process.env = { NODE_ENV: 'test' };

			const configured = isIPFSConfigured();
			expect(configured).toBe(false);
		});
	});
});
