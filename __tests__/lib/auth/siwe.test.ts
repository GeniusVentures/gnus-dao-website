/**
 * Tests for SIWE (Sign-In with Ethereum) authentication
 */
import { SiweAuthService } from '@/lib/auth/siwe';
import { ethers } from 'ethers';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(global, 'localStorage', {
	value: localStorageMock,
	writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
	value: {
		origin: 'http://localhost:3000',
		host: 'localhost:3000',
		hostname: 'localhost',
		href: 'http://localhost:3000',
	},
	writable: true,
});

describe('SiweAuthService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorageMock.clear();
		(global.fetch as jest.Mock).mockClear();
	});

	describe('generateNonce', () => {
		it('should generate a nonce from backend', async () => {
			const mockNonce = 'test-nonce-123';
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ nonce: mockNonce }),
			});

			const nonce = await SiweAuthService.generateNonce();

			expect(nonce).toBe(mockNonce);
			expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/nonce'));
		});

		it('should fallback to client-side nonce if backend fails', async () => {
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: 'Failed to generate nonce' }),
			});

			const nonce = await SiweAuthService.generateNonce();

			// Should still return a nonce (client-side generated)
			expect(nonce).toBeTruthy();
			expect(typeof nonce).toBe('string');
		});
	});

	describe('createMessage', () => {
		it('should create a valid SIWE message', () => {
			// Use a valid checksummed Ethereum address
			const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
			const chainId = 1;
			const nonce = 'testnonce12345678'; // Alphanumeric only, at least 8 chars
			const domain = 'localhost:3000';
			const uri = 'http://localhost:3000';

			const message = SiweAuthService.createMessage(address, chainId, nonce, domain, uri);

			expect(message.address).toBe(address);
			expect(message.chainId).toBe(chainId);
			expect(message.nonce).toBe(nonce);
			expect(message.statement).toContain('GNUS DAO');
		});
	});

	describe('storeSession', () => {
		it('should store session in localStorage', () => {
			const session = {
				address: '0x1234567890123456789012345678901234567890',
				chainId: 1,
				issuedAt: new Date().toISOString(),
				expirationTime: new Date(Date.now() + 86400000).toISOString(),
				nonce: 'test-nonce',
				signature: 'test-signature',
				message: 'test-message',
			};

			SiweAuthService.storeSession(session);

			const stored = localStorage.getItem('gnus-dao-siwe-session');
			expect(stored).toBeTruthy();
			expect(JSON.parse(stored!)).toEqual(session);
		});
	});

	describe('getSession', () => {
		it('should retrieve session from localStorage', () => {
			const session = {
				address: '0x1234567890123456789012345678901234567890',
				chainId: 1,
				issuedAt: new Date().toISOString(),
				expirationTime: new Date(Date.now() + 86400000).toISOString(),
				nonce: 'test-nonce',
				signature: 'test-signature',
				message: 'test-message',
			};

			localStorage.setItem('gnus-dao-siwe-session', JSON.stringify(session));

			const retrieved = SiweAuthService.getSession();
			expect(retrieved).toEqual(session);
		});

		it('should return null if no session exists', () => {
			const retrieved = SiweAuthService.getSession();
			expect(retrieved).toBeNull();
		});
	});

	describe('isSessionValid', () => {
		it('should return true for valid session', () => {
			const session = {
				address: '0x1234567890123456789012345678901234567890',
				chainId: 1,
				issuedAt: new Date().toISOString(),
				expirationTime: new Date(Date.now() + 86400000).toISOString(),
				nonce: 'test-nonce',
				signature: 'test-signature',
				message: 'test-message',
			};

			expect(SiweAuthService.isSessionValid(session)).toBe(true);
		});

		it('should return false for expired session', () => {
			const session = {
				address: '0x1234567890123456789012345678901234567890',
				chainId: 1,
				issuedAt: new Date(Date.now() - 86400000).toISOString(),
				expirationTime: new Date(Date.now() - 1000).toISOString(),
				nonce: 'test-nonce',
				signature: 'test-signature',
				message: 'test-message',
			};

			expect(SiweAuthService.isSessionValid(session)).toBe(false);
		});

		it('should return false for null session', () => {
			expect(SiweAuthService.isSessionValid(null)).toBe(false);
		});
	});

	describe('clearSession', () => {
		it('should remove session from localStorage', () => {
			const session = {
				address: '0x1234567890123456789012345678901234567890',
				chainId: 1,
				issuedAt: new Date().toISOString(),
				expirationTime: new Date(Date.now() + 86400000).toISOString(),
				nonce: 'test-nonce',
				signature: 'test-signature',
				message: 'test-message',
			};

			localStorage.setItem('gnus-dao-siwe-session', JSON.stringify(session));
			SiweAuthService.clearSession();

			expect(localStorage.getItem('gnus-dao-siwe-session')).toBeNull();
		});
	});
});
