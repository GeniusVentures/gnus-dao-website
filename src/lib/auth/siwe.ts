'use client';

import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';

export interface SiweSession {
	address: string;
	chainId: number;
	issuedAt: string;
	expirationTime: string;
	nonce: string;
	signature: string;
	message: string;
}

export interface SiweAuthState {
	isAuthenticated: boolean;
	session: SiweSession | null;
	isAuthenticating: boolean;
	error: string | null;
}

export class SiweAuthService {
	private static readonly STORAGE_KEY = 'gnus-dao-siwe-session';
	private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
	private static readonly API_BASE_URL =
		typeof window !== 'undefined'
			? window.location.origin
			: 'https://gnus-dao-web.pages.dev';

	/**
	 * Generate a random nonce for SIWE message from backend
	 */
	static async generateNonce(): Promise<string> {
		try {
			const response = await fetch(`${this.API_BASE_URL}/api/auth/nonce`);
			if (!response.ok) {
				throw new Error('Failed to generate nonce');
			}
			const data = await response.json();
			return data.nonce;
		} catch (error) {
			console.error(
				'Failed to fetch nonce from backend, using client-side generation:',
				error,
			);
			// Fallback to client-side generation
			return ethers.hexlify(ethers.randomBytes(16));
		}
	}

	/**
	 * Create a SIWE message for signing
	 */
	static createMessage(
		address: string,
		chainId: number,
		nonce: string,
		domain: string = window.location.host,
		uri: string = window.location.origin,
	): SiweMessage {
		const now = new Date();
		const expirationTime = new Date(now.getTime() + this.SESSION_DURATION);

		return new SiweMessage({
			domain,
			address,
			statement: 'Sign in to GNUS DAO governance platform with your Ethereum account.',
			uri,
			version: '1',
			chainId,
			nonce,
			issuedAt: now.toISOString(),
			expirationTime: expirationTime.toISOString(),
			resources: ['https://gnus.ai', 'https://docs.gnus.ai'],
		});
	}

	/**
	 * Sign in with Ethereum using SIWE with backend verification
	 */
	static async signIn(
		signer: ethers.Signer,
		address: string,
		chainId: number,
	): Promise<SiweSession> {
		try {
			// Ensure address is checksummed for SIWE
			const checksummedAddress = ethers.getAddress(address);

			// Generate nonce from backend
			const nonce = await this.generateNonce();
			const message = this.createMessage(checksummedAddress, chainId, nonce);
			const messageString = message.prepareMessage();

			// Sign the message
			const signature = await signer.signMessage(messageString);

			// Verify signature on backend
			const verificationResult = await this.verifyWithBackend(
				messageString,
				signature,
				nonce,
			);

			if (!verificationResult.success) {
				throw new Error('Backend verification failed');
			}

			// Create session from backend response
			const session: SiweSession = {
				address: verificationResult.session.address,
				chainId: verificationResult.session.chainId,
				issuedAt: verificationResult.session.issuedAt,
				expirationTime: verificationResult.session.expiresAt,
				nonce,
				signature,
				message: messageString,
			};

			// Store session and token
			this.storeSession(session);
			if (verificationResult.token) {
				localStorage.setItem('gnus-dao-auth-token', verificationResult.token);
			}

			return session;
		} catch (error) {
			console.error('SIWE sign in failed:', error);
			throw error;
		}
	}

	/**
	 * Verify signature with backend
	 */
	interface VerifyResponse {
		success: boolean;
		session?: {
			id: string;
			address: string;
			chainId: number;
			issuedAt: string;
			expiresAt: string;
		};
		token?: string;
	}

	static async verifyWithBackend(
		message: string,
		signature: string,
		nonce: string,
		address?: string,
		chainId?: number,
	): Promise<VerifyResponse> {
		try {
			// Extract address and chainId from message if not provided
			const siweMessage = new SiweMessage(message);
			const msgAddress = address || siweMessage.address;
			const msgChainId = chainId || siweMessage.chainId;

			const response = await fetch(`${this.API_BASE_URL}/api/auth/verify`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					message,
					signature,
					nonce,
					address: msgAddress,
					chainId: msgChainId,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Verification failed');
			}

			return await response.json();
		} catch (error) {
			console.error('Backend verification failed:', error);
			throw error;
		}
	}

	/**
	 * Verify a SIWE signature
	 */
	static async verifySignature(
		message: string,
		signature: string,
		expectedAddress: string,
	): Promise<boolean> {
		try {
			const siweMessage = new SiweMessage(message);
			const result = await siweMessage.verify({ signature });

			return (
				result.success &&
				result.data.address.toLowerCase() === expectedAddress.toLowerCase()
			);
		} catch (error) {
			console.error('Signature verification failed:', error);
			return false;
		}
	}

	/**
	 * Get current session from storage
	 */
	static getSession(): SiweSession | null {
		try {
			const stored = localStorage.getItem(this.STORAGE_KEY);
			if (!stored) return null;

			const session: SiweSession = JSON.parse(stored);

			// Check if session is expired
			if (new Date() > new Date(session.expirationTime)) {
				this.clearSession();
				return null;
			}

			return session;
		} catch (error) {
			console.error('Failed to get session:', error);
			this.clearSession();
			return null;
		}
	}

	/**
	 * Store session in localStorage
	 */
	static storeSession(session: SiweSession): void {
		try {
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
		} catch (error) {
			console.error('Failed to store session:', error);
		}
	}

	/**
	 * Clear session from storage
	 */
	static clearSession(): void {
		try {
			localStorage.removeItem(this.STORAGE_KEY);
		} catch (error) {
			console.error('Failed to clear session:', error);
		}
	}

	/**
	 * Sign out and clear session
	 */
	static signOut(): void {
		this.clearSession();
	}

	/**
	 * Check if current session is valid
	 */
	static isSessionValid(session: SiweSession | null): boolean {
		if (!session) return false;

		// Check expiration
		if (new Date() > new Date(session.expirationTime)) {
			return false;
		}

		return true;
	}

	/**
	 * Refresh session if it's close to expiring
	 */
	static async refreshSessionIfNeeded(
		signer: ethers.Signer,
		address: string,
		chainId: number,
	): Promise<SiweSession | null> {
		const session = this.getSession();
		if (!session) return null;

		// Refresh if session expires in less than 1 hour
		const oneHour = 60 * 60 * 1000;
		const expirationTime = new Date(session.expirationTime).getTime();
		const now = Date.now();

		if (expirationTime - now < oneHour) {
			try {
				return await this.signIn(signer, address, chainId);
			} catch (error) {
				console.error('Failed to refresh session:', error);
				this.clearSession();
				return null;
			}
		}

		return session;
	}

	/**
	 * Validate session against current wallet state
	 */
	static validateSessionForWallet(
		session: SiweSession | null,
		address: string,
		chainId: number,
	): boolean {
		if (!session) return false;

		return (
			session.address.toLowerCase() === address.toLowerCase() &&
			session.chainId === chainId &&
			this.isSessionValid(session)
		);
	}

	/**
	 * Get session info for display
	 */
	static getSessionInfo(session: SiweSession | null): {
		isValid: boolean;
		address?: string;
		chainId?: number;
		expiresAt?: Date;
		timeUntilExpiry?: string;
	} {
		if (!session || !this.isSessionValid(session)) {
			return { isValid: false };
		}

		const expiresAt = new Date(session.expirationTime);
		const timeUntilExpiry = this.formatTimeUntilExpiry(expiresAt);

		return {
			isValid: true,
			address: session.address,
			chainId: session.chainId,
			expiresAt,
			timeUntilExpiry,
		};
	}

	/**
	 * Format time until expiry in human-readable format
	 */
	private static formatTimeUntilExpiry(expiresAt: Date): string {
		const now = new Date();
		const diff = expiresAt.getTime() - now.getTime();

		if (diff <= 0) return 'Expired';

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}

	/**
	 * Create authentication challenge for API endpoints
	 */
	static createAuthChallenge(session: SiweSession): string {
		return btoa(
			JSON.stringify({
				address: session.address,
				signature: session.signature,
				message: session.message,
				timestamp: Date.now(),
			}),
		);
	}

	/**
	 * Verify authentication challenge
	 */
	static async verifyAuthChallenge(challenge: string): Promise<{
		isValid: boolean;
		address?: string;
		error?: string;
	}> {
		try {
			const decoded = JSON.parse(atob(challenge));
			const { address, signature, message, timestamp } = decoded;

			// Check if challenge is recent (within 5 minutes)
			const fiveMinutes = 5 * 60 * 1000;
			if (Date.now() - timestamp > fiveMinutes) {
				return { isValid: false, error: 'Challenge expired' };
			}

			// Verify signature
			const isValid = await this.verifySignature(message, signature, address);

			if (isValid) {
				return { isValid: true, address };
			} else {
				return { isValid: false, error: 'Invalid signature' };
			}
		} catch (error) {
			return { isValid: false, error: 'Invalid challenge format' };
		}
	}
}
