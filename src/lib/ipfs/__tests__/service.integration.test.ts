/**
 * IPFS Service Integration Tests
 * Integration tests for IPFS service functionality
 * Note: These tests require actual IPFS service configuration
 */

// Mock the IPFS dependencies to avoid import errors in test environment
jest.mock(
	'ipfs-http-client',
	() => ({
		create: jest.fn(() => ({
			add: jest.fn(),
			pin: { add: jest.fn() },
		})),
	}),
	{ virtual: true },
);

jest.mock('@pinata/sdk', () => ({
	PinataSDK: jest.fn(() => ({
		upload: {
			file: jest.fn(),
		},
		pinning: {
			pinByHash: jest.fn(),
		},
	})),
}));

import { ipfsService } from '../service';
import type { ProposalMetadata } from '../types';

// Skip these tests in CI unless IPFS credentials are available
const skipIfNoCredentials = () => {
	const hasCredentials =
		process.env.NEXT_PUBLIC_PINATA_JWT ||
		(process.env.NEXT_PUBLIC_PINATA_API_KEY && process.env.NEXT_PUBLIC_PINATA_SECRET_KEY) ||
		process.env.NEXT_PUBLIC_IPFS_API_URL;

	if (!hasCredentials) {
		console.warn('Skipping IPFS integration tests - no credentials configured');
		return true;
	}
	return false;
};

describe('IPFS Service Integration', () => {
	beforeAll(() => {
		if (skipIfNoCredentials()) {
			return;
		}
	});

	describe('Service Status', () => {
		it('should report service status correctly', () => {
			if (skipIfNoCredentials()) return;

			const status = ipfsService.getStatus();

			expect(status.initialized).toBe(true);
			expect(status.configured).toBe(true);
			expect(status.hasPinata || status.hasIPFSClient).toBe(true);
		});

		it('should be configured when credentials are available', () => {
			if (skipIfNoCredentials()) return;

			expect(ipfsService.isConfigured()).toBe(true);
		});
	});

	describe('File Upload', () => {
		it('should upload a text file successfully', async () => {
			if (skipIfNoCredentials()) return;

			const testContent = 'Hello, IPFS! This is a test file.';
			const file = new File([testContent], 'test.txt', { type: 'text/plain' });

			const result = await ipfsService.uploadFile(file, {
				pin: true,
				metadata: {
					name: 'Integration test file',
					keyvalues: {
						test: 'true',
						timestamp: new Date().toISOString(),
					},
				},
			});

			expect(result.hash).toBeDefined();
			expect(result.name).toBe('test.txt');
			expect(result.size).toBe(file.size);
			expect(result.url).toContain(result.hash);

			// Verify the hash format
			expect(result.hash).toMatch(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|[a-zA-Z0-9]+)$/);
		}, 30000); // 30 second timeout

		it('should upload multiple files successfully', async () => {
			if (skipIfNoCredentials()) return;

			const files = [
				new File(['File 1 content'], 'file1.txt', { type: 'text/plain' }),
				new File(['File 2 content'], 'file2.txt', { type: 'text/plain' }),
			];

			const results = await ipfsService.uploadFiles(files, {
				pin: true,
				metadata: {
					keyvalues: {
						batch: 'true',
						test: 'integration',
					},
				},
			});

			expect(results).toHaveLength(2);
			expect(results[0]?.hash).toBeDefined();
			expect(results[1]?.hash).toBeDefined();
			expect(results[0]?.hash).not.toBe(results[1]?.hash);
		}, 60000); // 60 second timeout

		it('should handle upload progress callbacks', async () => {
			if (skipIfNoCredentials()) return;

			const file = new File(['Progress test content'], 'progress-test.txt', {
				type: 'text/plain',
			});
			const progressUpdates: number[] = [];

			await ipfsService.uploadFile(file, {
				pin: true,
				onProgress: (progress) => {
					progressUpdates.push(progress);
				},
			});

			expect(progressUpdates.length).toBeGreaterThan(0);
			expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
		}, 30000);
	});

	describe('Proposal Metadata', () => {
		it('should upload and retrieve proposal metadata', async () => {
			if (skipIfNoCredentials()) return;

			const metadata: ProposalMetadata = {
				title: 'Test Proposal',
				description: 'This is a test proposal for integration testing',
				category: 'governance',
				author: '0x1234567890123456789012345678901234567890',
				created: Date.now(),
				version: '1.0.0',
				tags: ['test', 'integration'],
				discussionUrl: 'https://example.com/discussion',
				votingPeriod: {
					start: Date.now(),
					end: Date.now() + 7 * 24 * 60 * 60 * 1000,
				},
			};

			// Upload metadata
			const uploadResult = await ipfsService.uploadProposalMetadata(metadata);

			expect(uploadResult.hash).toBeDefined();
			expect(uploadResult.name).toBe('proposal-metadata.json');
			expect(uploadResult.url).toContain(uploadResult.hash);

			// Retrieve and verify metadata
			const retrievedMetadata = await ipfsService.retrieveProposalMetadata(
				uploadResult.hash,
			);

			expect(retrievedMetadata.title).toBe(metadata.title);
			expect(retrievedMetadata.description).toBe(metadata.description);
			expect(retrievedMetadata.category).toBe(metadata.category);
			expect(retrievedMetadata.author).toBe(metadata.author);
			expect(retrievedMetadata.version).toBe(metadata.version);
			expect(retrievedMetadata.tags).toEqual(metadata.tags);
		}, 45000); // 45 second timeout
	});

	describe('Content Retrieval', () => {
		let testHash: string;

		beforeAll(async () => {
			if (skipIfNoCredentials()) return;

			// Upload a test file to retrieve later
			const testContent = 'Content for retrieval test';
			const file = new File([testContent], 'retrieval-test.txt', {
				type: 'text/plain',
			});

			const result = await ipfsService.uploadFile(file, { pin: true });
			testHash = result.hash;
		}, 30000);

		it('should retrieve content by hash', async () => {
			if (skipIfNoCredentials() || !testHash) return;

			const content = await ipfsService.retrieveContent(testHash);
			expect(content).toBe('Content for retrieval test');
		}, 30000);

		it('should handle retrieval with timeout', async () => {
			if (skipIfNoCredentials() || !testHash) return;

			const content = await ipfsService.retrieveContent(testHash, {
				timeout: 5000,
				fallbackToOtherGateways: true,
			});

			expect(content).toBe('Content for retrieval test');
		}, 30000);

		it('should throw error for invalid hash', async () => {
			if (skipIfNoCredentials()) return;

			await expect(ipfsService.retrieveContent('invalid-hash')).rejects.toThrow(
				'Invalid IPFS hash format',
			);
		});
	});

	describe('Content Pinning', () => {
		let testHash: string;

		beforeAll(async () => {
			if (skipIfNoCredentials()) return;

			// Upload a test file to pin later
			const testContent = 'Content for pinning test';
			const file = new File([testContent], 'pinning-test.txt', {
				type: 'text/plain',
			});

			const result = await ipfsService.uploadFile(file, { pin: false });
			testHash = result.hash;
		}, 30000);

		it('should pin content successfully', async () => {
			if (skipIfNoCredentials() || !testHash) return;

			const pinResult = await ipfsService.pinContent(testHash);

			expect(pinResult.hash).toBe(testHash);
			expect(pinResult.pinned).toBe(true);
			expect(pinResult.pinDate).toBeDefined();
		}, 30000);

		it('should throw error for invalid hash when pinning', async () => {
			if (skipIfNoCredentials()) return;

			await expect(ipfsService.pinContent('invalid-hash')).rejects.toThrow(
				'Invalid IPFS hash format',
			);
		});
	});

	describe('Error Handling', () => {
		it('should handle file validation errors', async () => {
			if (skipIfNoCredentials()) return;

			// Create a file that's too large (assuming 10MB limit)
			const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
			const largeFile = new File([largeContent], 'large.txt', {
				type: 'text/plain',
			});

			await expect(ipfsService.uploadFile(largeFile)).rejects.toThrow();
		});

		it('should handle unsupported file types', async () => {
			if (skipIfNoCredentials()) return;

			const execFile = new File(['malicious content'], 'malware.exe', {
				type: 'application/x-executable',
			});

			await expect(ipfsService.uploadFile(execFile)).rejects.toThrow();
		});
	});
});
