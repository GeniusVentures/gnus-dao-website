/**
 * IPFS Utils Tests
 * Unit tests for IPFS utility functions
 */

import {
	validateFile,
	formatFileSize,
	isValidIPFSHash,
	extractIPFSHash,
	generateUniqueFilename,
	sanitizeFilename,
	createIPFSError,
} from '../utils';
import { getIPFSConfig } from '../config';

// Mock the config
jest.mock('../config', () => ({
	getIPFSConfig: jest.fn(() => ({
		maxFileSize: 10 * 1024 * 1024, // 10MB
		allowedTypes: ['image/*', 'application/pdf', 'text/plain'],
	})),
}));

describe('IPFS Utils', () => {
	describe('validateFile', () => {
		it('should validate file size correctly', () => {
			const smallFile = new File(['test'], 'test.txt', { type: 'text/plain' });
			Object.defineProperty(smallFile, 'size', { value: 1024 }); // 1KB

			const result = validateFile(smallFile);
			expect(result.valid).toBe(true);
		});

		it('should reject files that are too large', () => {
			const largeFile = new File(['test'], 'large.txt', { type: 'text/plain' });
			Object.defineProperty(largeFile, 'size', { value: 20 * 1024 * 1024 }); // 20MB

			const result = validateFile(largeFile);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('exceeds maximum allowed size');
		});

		it('should validate allowed file types', () => {
			const imageFile = new File(['test'], 'image.png', { type: 'image/png' });
			Object.defineProperty(imageFile, 'size', { value: 1024 });

			const result = validateFile(imageFile);
			expect(result.valid).toBe(true);
		});

		it('should reject disallowed file types', () => {
			const execFile = new File(['test'], 'malware.exe', {
				type: 'application/x-executable',
			});
			Object.defineProperty(execFile, 'size', { value: 1024 });

			const result = validateFile(execFile);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('not allowed');
		});
	});

	describe('formatFileSize', () => {
		it('should format bytes correctly', () => {
			expect(formatFileSize(0)).toBe('0 Bytes');
			expect(formatFileSize(1024)).toBe('1 KB');
			expect(formatFileSize(1024 * 1024)).toBe('1 MB');
			expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
		});

		it('should handle decimal places', () => {
			expect(formatFileSize(1536)).toBe('1.5 KB'); // 1.5KB
			expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
		});
	});

	describe('isValidIPFSHash', () => {
		it('should validate CIDv0 hashes', () => {
			const validCIDv0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
			expect(isValidIPFSHash(validCIDv0)).toBe(true);
		});

		it('should validate CIDv1 hashes', () => {
			const validCIDv1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
			expect(isValidIPFSHash(validCIDv1)).toBe(true);
		});

		it('should reject invalid hashes', () => {
			expect(isValidIPFSHash('')).toBe(false);
			expect(isValidIPFSHash('invalid')).toBe(false);
			expect(isValidIPFSHash('Qm123')).toBe(false); // Too short
			expect(isValidIPFSHash('not-a-hash')).toBe(false);
		});

		it('should handle null and undefined', () => {
			expect(isValidIPFSHash(null as any)).toBe(false);
			expect(isValidIPFSHash(undefined as any)).toBe(false);
		});
	});

	describe('extractIPFSHash', () => {
		it('should extract hash from IPFS URLs', () => {
			const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

			expect(extractIPFSHash(`https://ipfs.io/ipfs/${hash}`)).toBe(hash);
			expect(extractIPFSHash(`ipfs://${hash}`)).toBe(hash);
			expect(extractIPFSHash(hash)).toBe(hash);
		});

		it('should return null for invalid URLs', () => {
			expect(extractIPFSHash('https://example.com')).toBe(null);
			expect(extractIPFSHash('invalid')).toBe(null);
			expect(extractIPFSHash('')).toBe(null);
		});
	});

	describe('generateUniqueFilename', () => {
		it('should generate unique filenames', () => {
			const original = 'test.txt';
			const unique1 = generateUniqueFilename(original);
			const unique2 = generateUniqueFilename(original);

			expect(unique1).not.toBe(unique2);
			expect(unique1).toContain('test');
			expect(unique1).toContain('.txt');
		});

		it('should handle files without extensions', () => {
			const original = 'README';
			const unique = generateUniqueFilename(original);

			expect(unique).toContain('README');
			expect(unique).toMatch(/README_\d+_[a-z0-9]+\.README/); // Should append .README as extension
		});
	});

	describe('sanitizeFilename', () => {
		it('should sanitize special characters', () => {
			expect(sanitizeFilename('file with spaces.txt')).toBe('file_with_spaces.txt');
			expect(sanitizeFilename('file@#$%.txt')).toBe('file_.txt'); // Multiple special chars become single underscore
			expect(sanitizeFilename('UPPERCASE.TXT')).toBe('uppercase.txt');
		});

		it('should handle edge cases', () => {
			expect(sanitizeFilename('___file___.txt')).toBe('file_.txt'); // Multiple underscores become single
			expect(sanitizeFilename('')).toBe('');
		});
	});

	describe('createIPFSError', () => {
		it('should create properly typed IPFS errors', () => {
			const error = createIPFSError('Test error', 'UPLOAD_ERROR', 'TEST_CODE', {
				detail: 'test',
			});

			expect(error.message).toBe('Test error');
			expect(error.type).toBe('UPLOAD_ERROR');
			expect(error.code).toBe('TEST_CODE');
			expect(error.details).toEqual({ detail: 'test' });
		});

		it('should work without optional parameters', () => {
			const error = createIPFSError('Simple error', 'VALIDATION_ERROR');

			expect(error.message).toBe('Simple error');
			expect(error.type).toBe('VALIDATION_ERROR');
			expect(error.code).toBeUndefined();
			expect(error.details).toBeUndefined();
		});
	});
});
