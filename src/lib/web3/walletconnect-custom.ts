'use client';

import { SignClient } from '@walletconnect/sign-client';
import QRCode from 'qrcode';
import { getEnv } from '@/lib/config/env';
import { getRuntimeEnvVar } from '@/lib/config/runtime-env';

// Global SignClient instance
let signClient: any = null;
let currentSession: any = null;
let isInitialized = false;

// Debug logging
const debug = (message: string, ...args: any[]) => {
	if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
		console.log(`[WalletConnect] ${message}`, ...args);
	}
};

// Get WalletConnect Project ID
const getProjectId = async () => {
	try {
		// First try build-time environment
		try {
			const env = getEnv();
			const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

			if (projectId && projectId !== 'placeholder' && projectId !== 'build-placeholder') {
				debug('Using build-time WalletConnect Project ID');
				return projectId;
			}
		} catch (buildTimeError) {
			debug('Build-time environment not available, trying runtime environment');
		}

		// Fallback to runtime environment
		debug('Loading WalletConnect Project ID from runtime environment');
		const runtimeProjectId = await getRuntimeEnvVar('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID');

		if (
			!runtimeProjectId ||
			runtimeProjectId === 'placeholder' ||
			runtimeProjectId === 'build-placeholder'
		) {
			throw new Error(
				'WalletConnect Project ID is not configured. Please add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to your environment variables.',
			);
		}

		debug('Successfully loaded WalletConnect Project ID from runtime environment');
		return runtimeProjectId;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(
			'WalletConnect project ID is not configured. Please check your environment variables.',
		);
	}
};

/**
 * Initialize WalletConnect SignClient
 */
export async function initializeWalletConnect() {
	if (typeof window === 'undefined') {
		debug('Window is undefined, skipping initialization');
		return null;
	}

	// Return existing instance if already initialized
	if (signClient && isInitialized) {
		debug('Using existing SignClient instance');
		return signClient;
	}

	// Ensure runtime environment is loaded first
	debug('Ensuring runtime environment is loaded...');
	const { getRuntimeEnv } = await import('@/lib/config/runtime-env');
	await getRuntimeEnv();
	debug('Runtime environment loaded successfully');

	// Get validated project ID
	let projectId: string;
	try {
		projectId = await getProjectId();
		debug('Using project ID:', projectId);
	} catch (error) {
		debug('Project ID validation failed:', error);
		throw error;
	}

	try {
		debug('Initializing WalletConnect SignClient...');

		// Get the current domain for metadata
		const currentDomain =
			typeof window !== 'undefined'
				? window.location.origin
				: 'https://gnus-dao-web.pages.dev';

		// Metadata for the dApp
		const metadata = {
			name: 'GNUS DAO',
			description:
				'GNUS DAO Governance Platform - Decentralized Governance for the GNUS Ecosystem',
			url: currentDomain,
			icons: [`${currentDomain}/favicon.svg`],
		};

		debug('Using metadata:', metadata);

		// Create SignClient instance
		signClient = await SignClient.init({
			projectId: projectId,
			metadata: metadata,
			relayUrl: 'wss://relay.walletconnect.com',
		});

		debug('SignClient created successfully');
		isInitialized = true;
		return signClient;
	} catch (error) {
		debug('Failed to initialize SignClient:', error);
		isInitialized = false;
		signClient = null;
		throw error;
	}
}

/**
 * Generate QR code data URL from WalletConnect URI
 */
export async function generateQRCode(uri: string): Promise<string> {
	try {
		debug('Generating QR code for URI:', uri.substring(0, 20) + '...');

		// Generate QR code as data URL
		const qrCodeDataUrl = await QRCode.toDataURL(uri, {
			width: 400,
			margin: 2,
			color: {
				dark: '#000000',
				light: '#FFFFFF',
			},
			errorCorrectionLevel: 'M',
		});

		debug('QR code generated successfully');
		return qrCodeDataUrl;
	} catch (error) {
		debug('Failed to generate QR code:', error);
		throw error;
	}
}

/**
 * Connect to WalletConnect and return QR code data URL
 */
export async function connectWalletConnect(): Promise<{
	uri: string;
	qrCodeDataUrl: string;
	approval: () => Promise<any>;
}> {
	try {
		debug('Starting WalletConnect connection...');

		const client = await initializeWalletConnect();
		if (!client) {
			throw new Error('Failed to initialize SignClient');
		}

		debug('Creating connection session...');

		// Define required namespaces for Ethereum
		const requiredNamespaces = {
			eip155: {
				methods: [
					'eth_sendTransaction',
					'eth_signTransaction',
					'eth_sign',
					'personal_sign',
					'eth_signTypedData',
					'eth_signTypedData_v4',
				],
				chains: ['eip155:11155111'], // Sepolia testnet
				events: ['chainChanged', 'accountsChanged'],
			},
		};

		// Optional namespaces for other chains
		const optionalNamespaces = {
			eip155: {
				methods: [
					'eth_sendTransaction',
					'eth_signTransaction',
					'eth_sign',
					'personal_sign',
					'eth_signTypedData',
					'eth_signTypedData_v4',
				],
				chains: [
					'eip155:1', // Ethereum Mainnet
					'eip155:137', // Polygon
					'eip155:42161', // Arbitrum
					'eip155:8453', // Base
					'eip155:10', // Optimism
				],
				events: ['chainChanged', 'accountsChanged'],
			},
		};

		// Create connection
		const { uri, approval } = await client.connect({
			requiredNamespaces,
			optionalNamespaces,
		});

		if (!uri) {
			throw new Error('Failed to generate WalletConnect URI');
		}

		debug('WalletConnect URI generated:', uri.substring(0, 20) + '...');

		// Generate QR code
		const qrCodeDataUrl = await generateQRCode(uri);

		debug('Connection ready, waiting for wallet approval...');

		return {
			uri,
			qrCodeDataUrl,
			approval,
		};
	} catch (error) {
		debug('Failed to connect WalletConnect:', error);
		throw error;
	}
}

/**
 * Get the current session
 */
export function getCurrentSession() {
	return currentSession;
}

/**
 * Set the current session
 */
export function setCurrentSession(session: any) {
	currentSession = session;
	debug('Session set:', session);
}

/**
 * Get accounts from session
 */
export function getAccountsFromSession(session: any): string[] {
	if (!session) return [];

	try {
		const accounts: string[] = [];
		Object.values(session.namespaces).forEach((namespace: any) => {
			if (namespace.accounts) {
				namespace.accounts.forEach((account: string) => {
					// Extract address from CAIP-10 format (eip155:1:0x...)
					const address = account.split(':')[2];
					if (address && !accounts.includes(address)) {
						accounts.push(address);
					}
				});
			}
		});
		return accounts;
	} catch (error) {
		debug('Failed to extract accounts from session:', error);
		return [];
	}
}

/**
 * Get chain ID from session
 */
export function getChainIdFromSession(session: any): number | null {
	if (!session) return null;

	try {
		const namespace = session.namespaces.eip155;
		if (namespace && namespace.chains && namespace.chains.length > 0) {
			// Extract chain ID from CAIP-2 format (eip155:1)
			const chainId = parseInt(namespace.chains[0].split(':')[1]);
			return chainId;
		}
		return null;
	} catch (error) {
		debug('Failed to extract chain ID from session:', error);
		return null;
	}
}

/**
 * Disconnect from WalletConnect
 */
export async function disconnectWalletConnect() {
	if (!signClient || !currentSession) {
		debug('No active session to disconnect');
		return;
	}

	try {
		debug('Disconnecting WalletConnect session...');

		await signClient.disconnect({
			topic: currentSession.topic,
			reason: {
				code: 6000,
				message: 'User disconnected',
			},
		});

		currentSession = null;
		debug('Disconnected successfully');
	} catch (error) {
		debug('Failed to disconnect:', error);
		throw error;
	}
}

/**
 * Get the SignClient instance
 */
export function getSignClient() {
	return signClient;
}

/**
 * Check if WalletConnect is connected
 */
export function isConnected(): boolean {
	return !!currentSession;
}

/**
 * Validate WalletConnect URI
 */
export function validateWalletConnectURI(uri: string): boolean {
	try {
		if (!uri.startsWith('wc:')) {
			debug('URI does not start with wc:');
			return false;
		}

		// Basic validation of WalletConnect URI format
		const url = new URL(uri);
		if (url.protocol !== 'wc:') {
			debug('Invalid WalletConnect URI protocol');
			return false;
		}

		debug('URI is valid WalletConnect URI');
		return true;
	} catch (error) {
		debug('Error validating URI:', error);
		return false;
	}
}
