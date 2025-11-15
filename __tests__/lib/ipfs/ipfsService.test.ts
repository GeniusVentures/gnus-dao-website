/**
 * Tests for IPFS Service
 */
import ipfsService from '@/lib/ipfs/service';
import { isValidIPFSHash } from '@/lib/ipfs/utils';
import { getIPFSUrl } from '@/lib/ipfs/config';

// Mock fetch globally
global.fetch = jest.fn();

describe('IPFSService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(global.fetch as jest.Mock).mockClear();
	});

	describe('isConfigured', () => {
		it('should return configuration status', () => {
			const configured = ipfsService.isConfigured();

			// Should return a boolean
			expect(typeof configured).toBe('boolean');
		});
	});

	describe('getStatus', () => {
		it('should return service status', () => {
			const status = ipfsService.getStatus();

			expect(status).toHaveProperty('initialized');
			expect(status).toHaveProperty('hasPinata');
			expect(status).toHaveProperty('hasIPFSClient');
			expect(status).toHaveProperty('configured');
		});
	});

	describe('uploadFile', () => {
		it('should validate file size', async () => {
			// Create a file larger than 10MB
			const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
			const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });

			await expect(ipfsService.uploadFile(largeFile)).rejects.toThrow('File size');
		});

		it('should require upload service to be configured', async () => {
			const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

			// If no Pinata or IPFS client is configured, should throw error
			await expect(ipfsService.uploadFile(mockFile)).rejects.toThrow();
		});
	});

	describe('retrieveContent', () => {
		it('should validate IPFS hash format', async () => {
			const invalidHash = 'invalid-hash';

			await expect(ipfsService.retrieveContent(invalidHash)).rejects.toThrow(
				'Invalid IPFS hash',
			);
		});

		it('should fetch content from IPFS gateway', async () => {
			const validHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
			const mockContent = 'Test content';

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				text: async () => mockContent,
			});

			const content = await ipfsService.retrieveContent(validHash);

			expect(content).toBe(mockContent);
			expect(global.fetch).toHaveBeenCalled();
		});
	});

	describe('pinContent', () => {
		it('should validate IPFS hash before pinning', async () => {
			const invalidHash = 'invalid';

			await expect(ipfsService.pinContent(invalidHash)).rejects.toThrow(
				'Invalid IPFS hash',
			);
		});
	});
});

describe('IPFS Utils', () => {
	describe('isValidIPFSHash', () => {
		it('should validate correct CID v0 format', () => {
			const validCID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
			expect(isValidIPFSHash(validCID)).toBe(true);
		});

		it('should validate correct CID v1 format', () => {
			const validCID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
			expect(isValidIPFSHash(validCID)).toBe(true);
		});

		it('should reject invalid CID format', () => {
			expect(isValidIPFSHash('invalid')).toBe(false);
			expect(isValidIPFSHash('')).toBe(false);
			expect(isValidIPFSHash('Qm123')).toBe(false);
		});
	});

	describe('getIPFSUrl', () => {
		it('should construct correct gateway URL', () => {
			const cid = 'QmTest123';
			const gateway = 'https://ipfs.io';
			const url = getIPFSUrl(cid, gateway);

			expect(url).toContain(cid);
			expect(url).toMatch(/^https?:\/\//);
		});
	});
});
