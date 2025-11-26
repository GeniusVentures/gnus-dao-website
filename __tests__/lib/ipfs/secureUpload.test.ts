/**
 * Tests for Secure IPFS Upload Service
 * Critical for authenticated file uploads
 */

import { SecureIPFSService } from '@/lib/ipfs/secureUpload';

describe('SecureIPFSService', () => {
	const mockToken = 'test-auth-token';
	let mockGetItem: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		global.fetch = jest.fn();
		
		// Mock localStorage with proper jest mock
		mockGetItem = jest.fn((key) => {
			if (key === 'gnus-dao-auth-token') return mockToken;
			return null;
		});
		
		Object.defineProperty(window, 'localStorage', {
			value: {
				getItem: mockGetItem,
				setItem: jest.fn(),
				removeItem: jest.fn(),
				clear: jest.fn(),
			},
			writable: true,
		});
	});

	describe('uploadFile', () => {
		it('should upload file successfully with auth token', async () => {
			const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
			const mockResponse = {
				success: true,
				ipfsHash: 'QmTestHash123',
				pinSize: 1024,
				timestamp: new Date().toISOString(),
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await SecureIPFSService.uploadFile(mockFile);

			expect(result.success).toBe(true);
			expect(result.ipfsHash).toBe('QmTestHash123');
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/ipfs/upload'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						Authorization: `Bearer ${mockToken}`,
					}),
				})
			);
		});

		it('should return error without auth token', async () => {
			mockGetItem.mockReturnValue(null);

			const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

			const result = await SecureIPFSService.uploadFile(mockFile);
			
			expect(result.success).toBe(false);
			expect(result.error).toContain('Authentication required');
		});

		it('should include metadata when provided', async () => {
			const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
			const metadata = { name: 'Test File', keyvalues: { category: 'test' } };

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({ success: true, ipfsHash: 'QmTest' }),
			});

			await SecureIPFSService.uploadFile(mockFile, metadata);

			const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
			const formData = fetchCall[1].body as FormData;
			expect(formData.get('metadata')).toBe(JSON.stringify(metadata));
		});

		it('should handle upload errors', async () => {
			const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 500,
				json: async () => ({ error: 'Upload failed' }),
			});

			const result = await SecureIPFSService.uploadFile(mockFile);
			
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe('uploadJSON', () => {
		it('should upload JSON data successfully', async () => {
			const jsonData = { title: 'Test', description: 'Test description' };
			const mockResponse = {
				success: true,
				ipfsHash: 'QmJsonHash',
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await SecureIPFSService.uploadJSON(jsonData);

			expect(result.success).toBe(true);
			expect(result.ipfsHash).toBe('QmJsonHash');
		});

		it('should return error for JSON upload without auth', async () => {
			mockGetItem.mockReturnValue(null);

			const result = await SecureIPFSService.uploadJSON({ test: 'data' });
			
			expect(result.success).toBe(false);
			expect(result.error).toContain('Authentication required');
		});
	});

	describe('uploadProposalMetadata', () => {
		it('should upload proposal metadata with correct structure', async () => {
			const metadata = {
				title: 'Test Proposal',
				description: 'Test Description',
				actions: [{ target: '0x123', value: '0', calldata: '0x' }],
				discussionUrl: 'https://forum.example.com/proposal/1',
			};

			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({ success: true, ipfsHash: 'QmProposal' }),
			});

			const result = await SecureIPFSService.uploadProposalMetadata(metadata);

			expect(result.success).toBe(true);
			expect(result.ipfsHash).toBe('QmProposal');
		});

		it('should handle upload without auth token', async () => {
			mockGetItem.mockReturnValue(null);

			const metadata = {
				title: 'Test',
				description: 'Test',
			};

			const result = await SecureIPFSService.uploadProposalMetadata(metadata);
			expect(result.success).toBe(false);
			expect(result.error).toContain('Authentication required');
		});
	});

	describe('getGatewayUrl', () => {
		it('should generate correct IPFS gateway URL', () => {
			const hash = 'QmTestHash123';
			const url = SecureIPFSService.getGatewayUrl(hash);

			expect(url).toContain(hash);
			expect(url).toMatch(/^https?:\/\//);
		});

		it('should use backup gateway when specified', () => {
			const hash = 'QmTestHash123';
			const url = SecureIPFSService.getGatewayUrl(hash, true);

			expect(url).toContain(hash);
			expect(url).toContain('pinata');
		});
	});

	describe('validateFile', () => {
		it('should validate file size', () => {
			const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg');
			const result = SecureIPFSService.validateFile(largeFile);

			expect(result.valid).toBe(false);
			expect(result.error).toContain('exceeds maximum');
		});

		it('should validate file type', () => {
			const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
			const result = SecureIPFSService.validateFile(file, 10 * 1024 * 1024, ['image/*']);

			expect(result.valid).toBe(false);
			expect(result.error).toContain('not allowed');
		});

		it('should accept valid files', () => {
			const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
			const result = SecureIPFSService.validateFile(file, 10 * 1024 * 1024, ['image/*']);

			expect(result.valid).toBe(true);
		});
	});
});
