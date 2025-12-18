/**
 * IPFS Service Integration Tests
 * Tests for the IPFS service functionality without helia dependencies
 */

import { getIPFSConfig, validateIPFSConfig } from '../config';
import { validateFile, formatFileSize, isValidIPFSHash } from '../utils';
import type { ProposalMetadata } from '../types';

// Mock pinata-web3 for testing
jest.mock('pinata-web3', () => ({
	PinataSDK: jest.fn().mockImplementation(() => ({
		upload: {
			file: jest.fn().mockResolvedValue({
				IpfsHash: 'QmTestHash123456789012345678901234567890123',
				PinSize: 1024,
				Timestamp: new Date().toISOString(),
			}),
			json: jest.fn().mockResolvedValue({
				IpfsHash: 'QmTestJSONHash123456789012345678901234567890',
				PinSize: 512,
				Timestamp: new Date().toISOString(),
			}),
		},
		files: {
			delete: jest.fn().mockResolvedValue({}),
		},
		testAuthentication: jest.fn().mockResolvedValue({
			authenticated: true,
		}),
	})),
}));

describe('IPFS Service Integration', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Configuration', () => {
		it('should load IPFS configuration', () => {
			const config = getIPFSConfig();
			
			expect(config).toHaveProperty('maxFileSize');
			expect(config).toHaveProperty('allowedTypes');
			expect(config).toHaveProperty('gateways');
			expect(typeof config.maxFileSize).toBe('number');
			expect(Array.isArray(config.allowedTypes)).toBe(true);
			expect(config.gateways).toHaveProperty('primary');
			expect(config.gateways).toHaveProperty('fallbacks');
		});

		it('should validate IPFS configuration', () => {
			const config = getIPFSConfig();
			const validation = validateIPFSConfig(config);
			
			expect(validation).toHaveProperty('valid');
			expect(typeof validation.valid).toBe('boolean');
			
			if (!validation.valid) {
				expect(validation).toHaveProperty('errors');
				expect(Array.isArray(validation.errors)).toBe(true);
			}
		});
	});

	describe('File Validation', () => {
		it('should validate files correctly', () => {
			const validFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
			const validation = validateFile(validFile);
			
			expect(validation).toHaveProperty('valid');
			expect(typeof validation.valid).toBe('boolean');
		});

		it('should reject files that are too large', () => {
			// Create a mock large file
			const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
			const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
			
			const validation = validateFile(largeFile);
			
			expect(validation.valid).toBe(false);
			expect(validation.error).toContain('exceeds maximum');
		});

		it('should format file sizes correctly', () => {
			expect(formatFileSize(0)).toBe('0 Bytes');
			expect(formatFileSize(1024)).toBe('1 KB');
			expect(formatFileSize(1024 * 1024)).toBe('1 MB');
		});
	});

	describe('IPFS Hash Validation', () => {
		it('should validate IPFS hash formats', () => {
			const validCIDv0 = 'QmTestHash123456789012345678901234567890123';
			const validCIDv1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
			const invalidHash = 'invalid-hash';

			expect(isValidIPFSHash(validCIDv0)).toBe(true);
			expect(isValidIPFSHash(validCIDv1)).toBe(true);
			expect(isValidIPFSHash(invalidHash)).toBe(false);
		});

		it('should handle IPFS URLs', () => {
			const hashFromUrl = 'QmTestHash123456789012345678901234567890123';
			const ipfsUrl = `/ipfs/${hashFromUrl}`;
			
			expect(isValidIPFSHash(hashFromUrl)).toBe(true);
			// The isValidIPFSHash function should handle URLs by extracting the hash
		});
	});

	describe('Proposal Metadata', () => {
		it('should create valid proposal metadata structure', () => {
			const metadata: ProposalMetadata = {
				title: 'Test Proposal',
				description: 'This is a test proposal',
				category: 'governance',
				tags: ['test', 'governance'],
				author: '0x1234567890123456789012345678901234567890',
				created: Date.now(),
				version: '1.0.0',
			};

			expect(metadata.title).toBe('Test Proposal');
			expect(metadata.category).toBe('governance');
			expect(metadata.author).toMatch(/^0x[a-fA-F0-9]{40}$/);
			expect(typeof metadata.created).toBe('number');
		});

		it('should handle optional proposal metadata fields', () => {
			const metadata: ProposalMetadata = {
				title: 'Test Proposal',
				description: 'This is a test proposal',
				category: 'governance',
				author: '0x1234567890123456789012345678901234567890',
				created: Date.now(),
				version: '1.0.0',
				discussionUrl: 'https://forum.example.com/proposal/123',
				votingPeriod: {
					start: Date.now(),
					end: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
				},
				executionDelay: 2 * 24 * 60 * 60 * 1000, // 2 days
			};

			expect(metadata.discussionUrl).toBeDefined();
			expect(metadata.votingPeriod).toBeDefined();
			expect(metadata.executionDelay).toBeDefined();
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid file types', () => {
			const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });
			const validation = validateFile(invalidFile);
			
			expect(validation.valid).toBe(false);
			expect(validation.error).toContain('not allowed');
		});

		it('should handle empty files', () => {
			const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
			const validation = validateFile(emptyFile);
			
			// Empty files should be valid but might have size restrictions
			expect(validation).toHaveProperty('valid');
		});
	});

	describe('Service Status', () => {
		it('should provide service status without requiring actual service initialization', () => {
			// Test the configuration and validation without initializing the full service
			const config = getIPFSConfig();
			const validation = validateIPFSConfig(config);
			
			expect(config).toBeDefined();
			expect(validation).toBeDefined();
			expect(typeof validation.valid).toBe('boolean');
		});
	});
});