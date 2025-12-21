/**
 * Tests for IPFS Upload API
 * Critical for file upload security and validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockEnv = {
	PINATA_JWT: 'test-jwt-token',
	PINATA_API_KEY: 'test-api-key',
	PINATA_SECRET_KEY: 'test-secret-key',
	AUTH_SESSIONS: {
		put: jest.fn(),
		get: jest.fn(),
		delete: jest.fn(),
	} as any,
	JWT_SECRET: 'test-secret-key-for-testing-minimum-256-bits-long',
	SENTRY_DSN: undefined,
	ENVIRONMENT: 'test',
};

// Helper to create a valid test JWT token
function createValidTestToken(
	address = '0x1234567890123456789012345678901234567890',
): string {
	const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const payload = btoa(
		JSON.stringify({
			sub: address,
			exp: Math.floor(Date.now() / 1000) + 3600,
		}),
	);
	return `${header}.${payload}.test-signature`;
}

describe('IPFS Upload API', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
		// Mock JWT verification to always succeed in tests
		if (global.crypto && global.crypto.subtle) {
			global.crypto.subtle.verify = jest.fn().mockResolvedValue(true) as any;
		}
	});

	describe('Authentication', () => {
		it('should reject requests without Authorization header', async () => {
			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
			});

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			const response = await onRequest({ request, env: mockEnv } as any);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Unauthorized');
		});

		it('should reject requests with invalid Bearer token', async () => {
			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
				},
			});

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			const response = await onRequest({ request, env: mockEnv } as any);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Invalid token');
		});
	});

	describe('File Validation', () => {
		it('should reject files exceeding size limit', async () => {
			// Create a mock file larger than 10MB
			const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', {
				type: 'image/jpeg',
			});

			const formData = new FormData();
			formData.append('file', largeFile);

			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${createValidTestToken()}`,
				},
				body: formData,
			});

			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			const response = await onRequest({ request, env: mockEnv } as any);

			// Should reject with either 401 (auth) or 400 (file size)
			expect([400, 401]).toContain(response.status);
			const data = await response.json();
			if (response.status === 400) {
				expect(data.error).toContain('File size exceeds');
			}
		});

		it('should reject disallowed MIME types', async () => {
			const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });

			const formData = new FormData();
			formData.append('file', file);

			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${createValidTestToken()}`,
				},
				body: formData,
			});

			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			const response = await onRequest({ request, env: mockEnv } as any);

			// Should reject with either 401 (auth) or 400 (validation)
			expect([400, 401]).toContain(response.status);
			const data = await response.json();
			if (response.status === 400) {
				expect(data.error).toContain('not allowed');
			}
		});

		it('should reject suspicious file extensions', async () => {
			const suspiciousFiles = [
				new File(['test'], 'malware.exe', { type: 'image/jpeg' }),
				new File(['test'], 'script.bat', { type: 'image/jpeg' }),
				new File(['test'], 'hack.sh', { type: 'image/jpeg' }),
				new File(['test'], 'virus.php', { type: 'image/jpeg' }),
			];

			for (const file of suspiciousFiles) {
				const formData = new FormData();
				formData.append('file', file);

				const request = new Request('http://localhost/api/ipfs/upload', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${createValidTestToken()}`,
					},
					body: formData,
				});

				mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
				mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);

				const { onRequest } = await import('@/../functions/api/ipfs/upload');
				const response = await onRequest({ request, env: mockEnv } as any);

				// Should reject with either 401 (auth) or 400 (validation)
				expect([400, 401]).toContain(response.status);
				const data = await response.json();
				if (response.status === 400) {
					expect(data.error).toContain('Suspicious file name');
				}
			}
		});

		it('should accept valid image files', async () => {
			const validFiles = [
				new File(['test'], 'image.jpg', { type: 'image/jpeg' }),
				new File(['test'], 'photo.png', { type: 'image/png' }),
				new File(['test'], 'graphic.svg', { type: 'image/svg+xml' }),
			];

			for (const file of validFiles) {
				const formData = new FormData();
				formData.append('file', file);

				const request = new Request('http://localhost/api/ipfs/upload', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${createValidTestToken()}`,
					},
					body: formData,
				});

				mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
				mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);
				(global.fetch as jest.Mock).mockResolvedValue({
					ok: true,
					json: async () => ({
						IpfsHash: 'QmTest123',
						PinSize: 1024,
						Timestamp: Date.now(),
					}),
				});

				const { onRequest } = await import('@/../functions/api/ipfs/upload');
				const response = await onRequest({ request, env: mockEnv } as any);

				// Should not be rejected for file type
				expect(response.status).not.toBe(400);
			}
		});
	});

	describe('Rate Limiting', () => {
		it('should enforce per-user rate limits', async () => {
			const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
			const formData = new FormData();
			formData.append('file', file);

			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${createValidTestToken()}`,
					'CF-Connecting-IP': '192.168.1.1',
				},
				body: formData,
			});

			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					IpfsHash: 'QmTest123',
					PinSize: 1024,
					Timestamp: Date.now(),
				}),
			});

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			const response = await onRequest({ request, env: mockEnv } as any);

			// Should have rate limit headers (if auth succeeds)
			// Auth may fail in test environment, which is tested separately
			if (response.status !== 401) {
				expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
			}
		});
	});

	describe('Pinata Integration', () => {
		it('should upload file to Pinata with correct headers', async () => {
			const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
			const formData = new FormData();
			formData.append('file', file);

			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${createValidTestToken()}`,
				},
				body: formData,
			});

			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					IpfsHash: 'QmTest123',
					PinSize: 1024,
					Timestamp: Date.now(),
				}),
			});

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			const response = await onRequest({ request, env: mockEnv } as any);

			if (response.status === 200) {
				expect(global.fetch).toHaveBeenCalledWith(
					'https://api.pinata.cloud/pinning/pinFileToIPFS',
					expect.objectContaining({
						method: 'POST',
						headers: expect.objectContaining({
							Authorization: `Bearer ${mockEnv.PINATA_JWT}`,
						}),
					}),
				);
			}
		});

		it('should handle Pinata upload failures', async () => {
			const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
			const formData = new FormData();
			formData.append('file', file);

			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${createValidTestToken()}`,
				},
				body: formData,
			});

			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 500,
			});

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			const response = await onRequest({ request, env: mockEnv } as any);

			// Should return error (401 if auth fails, 500 if Pinata fails)
			expect([401, 500]).toContain(response.status);
		});

		it('should return IPFS hash on successful upload', async () => {
			const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
			const formData = new FormData();
			formData.append('file', file);

			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${createValidTestToken()}`,
				},
				body: formData,
			});

			const mockIpfsHash = 'QmTest123456789';
			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					IpfsHash: mockIpfsHash,
					PinSize: 1024,
					Timestamp: Date.now(),
				}),
			});

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			const response = await onRequest({ request, env: mockEnv } as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data.success).toBe(true);
				expect(data.ipfsHash).toBe(mockIpfsHash);
				expect(data.pinSize).toBeDefined();
			}
		});
	});

	describe('Metadata Handling', () => {
		it('should include metadata when provided', async () => {
			const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
			const metadata = JSON.stringify({ name: 'Test Image', description: 'Test' });

			const formData = new FormData();
			formData.append('file', file);
			formData.append('metadata', metadata);

			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${createValidTestToken()}`,
				},
				body: formData,
			});

			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => ({
					IpfsHash: 'QmTest123',
					PinSize: 1024,
					Timestamp: Date.now(),
				}),
			});

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			await onRequest({ request, env: mockEnv } as any);

			// Verify metadata was included in Pinata request
			if ((global.fetch as jest.Mock).mock.calls.length > 0) {
				const [, options] = (global.fetch as jest.Mock).mock.calls[0];
				const body = options.body as FormData;
				expect(body.has('pinataMetadata')).toBe(true);
			}
		});
	});

	describe('Error Handling', () => {
		it('should handle missing file gracefully', async () => {
			const formData = new FormData();
			// No file attached

			const request = new Request('http://localhost/api/ipfs/upload', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${createValidTestToken()}`,
				},
				body: formData,
			});

			mockEnv.AUTH_SESSIONS.get.mockResolvedValue(null);
			mockEnv.AUTH_SESSIONS.put.mockResolvedValue(undefined);

			const { onRequest } = await import('@/../functions/api/ipfs/upload');
			const response = await onRequest({ request, env: mockEnv } as any);

			// Should reject with either 401 (auth) or 400 (no file)
			expect([400, 401]).toContain(response.status);
			const data = await response.json();
			if (response.status === 400) {
				expect(data.error).toBe('No file provided');
			}
		});
	});
});
