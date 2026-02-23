'use client';

import { getEnv } from '@/lib/config/env';
import { getRuntimeEnvVar } from '@/lib/config/runtime-env';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

// GNUS DAO WalletConnect configuration
const getProjectId = async () => {
	try {
		// First try to get from build-time environment
		try {
			const env = getEnv();
			const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

			// Check for placeholder values that indicate missing configuration
			if (projectId && projectId !== 'placeholder' && projectId !== 'build-placeholder') {
				debug('Using build-time WalletConnect Project ID');
				return projectId;
			}
		} catch {
			debug('Build-time environment not available, trying runtime environment');
		}

		// Fallback to runtime environment loading
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

// Global WalletConnect provider
let walletConnectProvider: InstanceType<typeof EthereumProvider> | null = null;
let isInitialized = false;

// Debug logging - enabled in development and for debugging production issues
const debug = (message: string, ...args: unknown[]) => {
	if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
		console.log(`[WalletConnect] ${message}`, ...args);
	}
};

/**
 * Initialize WalletConnect with QR modal
 */
export async function initializeWalletConnect() {
	if (typeof window === 'undefined') {
		debug('Window is undefined, skipping initialization');
		return null;
	}

	// Return existing instance if already initialized
	if (walletConnectProvider && isInitialized) {
		debug('Using existing WalletConnect provider');
		return walletConnectProvider;
	}

	// Ensure runtime environment is loaded first
	debug('Ensuring runtime environment is loaded...');
	const { preloadRuntimeEnv } = await import('@/lib/config/runtime-env');
	await preloadRuntimeEnv();
	debug('Runtime environment loaded successfully');

	// Get validated project ID - this will throw if not configured
	let projectId: string;
	try {
		projectId = await getProjectId();
		debug('Using project ID:', projectId);
	} catch (error) {
		debug('Project ID validation failed:', error);
		throw error;
	}

	try {
		debug('Initializing WalletConnect with QR modal support');

		// Get the current domain for metadata
		const currentDomain =
			typeof window !== 'undefined'
				? window.location.origin
				: '';

		// Use appropriate metadata based on environment
		const metadata = {
			name: 'GNUS DAO',
			description:
				'GNUS DAO Governance Platform - Decentralized Governance for the GNUS Ecosystem',
			url: currentDomain,
			icons: [`${currentDomain}/favicon.svg`],
		};

		debug('Using metadata:', metadata);
		debug('Creating WalletConnect provider with QR modal...');

		// Create WalletConnect provider with QR modal enabled
		walletConnectProvider = await EthereumProvider.init({
			projectId: projectId,
			chains: [11155111], // Sepolia testnet as primary
			optionalChains: [1, 137, 42161, 8453, 10], // Ethereum, Polygon, Arbitrum, Base, Optimism
			showQrModal: true, // Enable QR modal
			metadata: metadata,
			qrModalOptions: {
				themeMode: 'dark',
				themeVariables: {
					'--wcm-z-index': '999999',
					'--wcm-overlay-background-color': 'rgba(0, 0, 0, 0.95)',
					'--wcm-overlay-backdrop-filter': 'blur(8px)',
					'--wcm-background-color': '#1a1a1a',
					'--wcm-accent-color': '#3b82f6',
				},
				enableExplorer: true,
				explorerRecommendedWalletIds: [
					'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
					'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
					'4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
					'38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Bitget Wallet
				],
			},
			rpcMap: {
				1: 'https://eth.llamarpc.com',
				10: 'https://mainnet.optimism.io',
				137: 'https://polygon.llamarpc.com',
				8453: 'https://mainnet.base.org',
				42161: 'https://arb1.arbitrum.io/rpc',
				11155111: 'https://sepolia.infura.io/v3/a9555646b9fb4da6ab4cc08c782f85ee',
			},
		});

		debug('WalletConnect provider created successfully');
		debug('Provider modal available:', !!walletConnectProvider.modal);
		debug('Provider showQrModal setting:', walletConnectProvider.modal?.showQrModal);

		isInitialized = true;
		return walletConnectProvider;
	} catch (error) {
		debug('Failed to initialize WalletConnect:', error);
		isInitialized = false;
		walletConnectProvider = null;
		throw error;
	}
}

/**
 * Get the WalletConnect provider
 */
export function getWalletConnectProvider() {
	return walletConnectProvider;
}

/**
 * Open the WalletConnect modal with QR code
 */
export async function openWalletConnect() {
	try {
		debug('Opening WalletConnect modal...');

		const provider = await initializeWalletConnect();
		if (!provider) {
			throw new Error('Failed to initialize WalletConnect provider');
		}

		debug('Provider initialized, checking modal availability...');
		debug('Provider modal:', !!provider.modal);
		debug('Provider showQrModal:', provider.modal?.showQrModal);

		// Enable the provider (this will show the QR modal)
		debug('Calling provider.enable() to show QR modal...');
		const accounts = await provider.enable();

		debug('Provider enabled, accounts:', accounts);

		if (accounts && accounts.length > 0) {
			debug('WalletConnect connection successful');
			return {
				provider: provider,
				accounts: accounts,
			};
		}

		throw new Error('No accounts returned from WalletConnect');
	} catch (error) {
		debug('Failed to open WalletConnect modal:', error);
		throw error;
	}
}

/**
 * Close the WalletConnect modal
 */
export function closeWalletConnect() {
	// The modal closes automatically when connection is established or cancelled
}

/**
 * Get the current connection state
 */
export function getWalletConnectState() {
	if (!walletConnectProvider) return null;

	return {
		isConnected: walletConnectProvider.connected || false,
		address: walletConnectProvider.accounts?.[0] || null,
		chainId: walletConnectProvider.chainId || null,
	};
}

/**
 * Get the current account address
 */
export function getWalletConnectAddress(): string | null {
	if (!walletConnectProvider) return null;
	return walletConnectProvider.accounts?.[0] || null;
}

/**
 * Get the current chain ID
 */
export function getWalletConnectChainId(): number | null {
	if (!walletConnectProvider) return null;
	return walletConnectProvider.chainId || null;
}

/**
 * Switch to a specific network
 */
export async function switchWalletConnectNetwork(chainId: number) {
	if (!walletConnectProvider) {
		throw new Error('WalletConnect not initialized');
	}

	try {
		await walletConnectProvider.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: `0x${chainId.toString(16)}` }],
		});
	} catch (error) {
		throw error;
	}
}

/**
 * Disconnect from WalletConnect
 */
export async function disconnectWalletConnect() {
	if (!walletConnectProvider) return;

	try {
		await walletConnectProvider.disconnect();
		walletConnectProvider = null;
		isInitialized = false;
	} catch (error) {
		throw error;
	}
}

/**
 * Subscribe to WalletConnect events
 */
export function subscribeToWalletConnect(callback: (event: string, data: unknown) => void) {
	if (!walletConnectProvider) return () => {};

	const events = ['connect', 'disconnect', 'chainChanged', 'accountsChanged'];

	events.forEach((event) => {
		walletConnectProvider?.on(event as any, (data: unknown) => callback(event, data));
	});

	return () => {
		events.forEach((event) => {
			walletConnectProvider?.removeListener(event as any, () => {});
		});
	};
}

/**
 * Validate QR code contains valid WalletConnect URI
 */
export function validateWalletConnectQR(qrData: string): boolean {
	try {
		// WalletConnect URIs start with 'wc:' followed by topic and other parameters
		if (!qrData.startsWith('wc:')) {
			debug('QR code does not contain WalletConnect URI');
			return false;
		}

		// Basic validation of WalletConnect URI format
		const uri = new URL(qrData);
		if (uri.protocol !== 'wc:') {
			debug('Invalid WalletConnect URI protocol');
			return false;
		}

		debug('QR code contains valid WalletConnect URI');
		return true;
	} catch (error) {
		debug('Error validating QR code:', error);
		return false;
	}
}
