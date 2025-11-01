import { ethers } from 'ethers';
import { WalletConnector } from './types';

/**
 * MetaMask wallet connector
 */
export const metaMaskConnector: WalletConnector = {
	id: 'metamask',
	name: 'MetaMask',
	icon: '/wallets/metamask.svg',
	description: 'Connect using MetaMask browser extension',

	isAvailable: () => {
		return (
			typeof window !== 'undefined' &&
			typeof (window as any).ethereum !== 'undefined' &&
			(window as any).ethereum.isMetaMask === true
		);
	},

	connect: async () => {
		if (!(window as any).ethereum) {
			throw new Error('MetaMask not found');
		}

		// Request account access
		const accounts = await (window as any).ethereum.request({
			method: 'eth_requestAccounts',
		});

		if (!accounts || accounts.length === 0) {
			throw new Error('No accounts found');
		}

		const provider = new ethers.BrowserProvider((window as any).ethereum);
		const network = await provider.getNetwork();

		return {
			provider,
			address: accounts[0],
			chainId: Number(network.chainId),
		};
	},

	disconnect: async () => {
		// MetaMask doesn't have a programmatic disconnect
		// Users need to disconnect manually from the extension
	},
};

/**
 * Coinbase Wallet connector
 */
export const coinbaseConnector: WalletConnector = {
	id: 'coinbase',
	name: 'Coinbase Wallet',
	icon: '/wallets/coinbase.svg',
	description: 'Connect using Coinbase Wallet',

	isAvailable: () => {
		return (
			typeof window !== 'undefined' &&
			typeof (window as any).ethereum !== 'undefined' &&
			((window as any).ethereum.isCoinbaseWallet === true ||
				(window as any).ethereum.selectedProvider?.isCoinbaseWallet === true)
		);
	},

	connect: async () => {
		interface EthereumProvider {
			request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
			providers?: Array<{ isCoinbaseWallet?: boolean; request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }>;
		}
		const windowWithEthereum = window as unknown as { ethereum?: EthereumProvider };
		if (!windowWithEthereum.ethereum) {
			throw new Error('Coinbase Wallet not found');
		}

		// For Coinbase Wallet, we might need to select the provider
		let ethereum = windowWithEthereum.ethereum;
		if (windowWithEthereum.ethereum.providers) {
			ethereum =
				windowWithEthereum.ethereum.providers.find((p) => p.isCoinbaseWallet) ||
				windowWithEthereum.ethereum;
		}

		const accounts = await ethereum.request({
			method: 'eth_requestAccounts',
		});

		if (!accounts || accounts.length === 0) {
			throw new Error('No accounts found');
		}

		const provider = new ethers.BrowserProvider(ethereum);
		const network = await provider.getNetwork();

		return {
			provider,
			address: accounts[0],
			chainId: Number(network.chainId),
		};
	},
};

/**
 * WalletConnect connector using Reown AppKit
 */
export const walletConnectConnector: WalletConnector = {
	id: 'walletconnect',
	name: 'WalletConnect',
	icon: '/wallets/walletconnect.svg',
	description: 'Connect using WalletConnect protocol',

	isAvailable: () => {
		// WalletConnect is always available as it's a protocol
		return true;
	},

	connect: async () => {
		try {
			// Ensure runtime environment is loaded before initializing WalletConnect
			const { getRuntimeEnv } = await import('@/lib/config/runtime-env');

			console.log('[WalletConnect] Ensuring runtime environment is loaded...');
			await getRuntimeEnv(); // This will load the environment if not already loaded

			// Use Reown AppKit with official WalletConnect modal
			const { openWalletConnect } = await import('@/lib/web3/appkit');

			console.log('[WalletConnect] Opening modal and connecting...');

			// Connect using the provider (this shows the official WalletConnect modal)
			const result = await openWalletConnect();

			if (!result || !result.accounts || result.accounts.length === 0) {
				throw new Error('No accounts returned from WalletConnect');
			}

			console.log('[WalletConnect] Connected successfully:', result.accounts[0]);

			// Create ethers provider from WalletConnect provider
			const ethersProvider = new ethers.BrowserProvider(result.provider);
			const network = await ethersProvider.getNetwork();

			return {
				provider: ethersProvider,
				address: result.accounts[0],
				chainId: Number(network.chainId),
			};
		} catch (error) {
			// Close the QR modal on error
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('walletconnect-error', {
						detail: { error: error instanceof Error ? error.message : 'Unknown error' },
					}),
				);
			}

			if (process.env.NODE_ENV === 'development') {
				console.error('[WalletConnect] Connection failed:', error);
			}
			throw new Error(
				`Failed to connect with WalletConnect: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	},

	disconnect: async () => {
		try {
			const { disconnectWalletConnect } = await import('@/lib/web3/appkit');
			await disconnectWalletConnect();
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
			}
		}
	},
};

/**
 * Injected wallet connector (fallback for other wallets)
 */
export const injectedConnector: WalletConnector = {
	id: 'injected',
	name: 'Browser Wallet',
	icon: '/wallets/generic.svg',
	description: 'Connect using any injected wallet',

	isAvailable: () => {
		return (
			typeof window !== 'undefined' &&
			typeof (window as any).ethereum !== 'undefined' &&
			!(window as any).ethereum.isMetaMask &&
			!(window as any).ethereum.isCoinbaseWallet
		);
	},

	connect: async () => {
		if (!(window as any).ethereum) {
			throw new Error('No wallet found');
		}

		const accounts = await (window as any).ethereum.request({
			method: 'eth_requestAccounts',
		});

		if (!accounts || accounts.length === 0) {
			throw new Error('No accounts found');
		}

		const provider = new ethers.BrowserProvider((window as any).ethereum);
		const network = await provider.getNetwork();

		return {
			provider,
			address: accounts[0],
			chainId: Number(network.chainId),
		};
	},
};

/**
 * All available wallet connectors
 */
export const walletConnectors: WalletConnector[] = [
	metaMaskConnector,
	coinbaseConnector,
	walletConnectConnector,
	injectedConnector,
];

/**
 * Get available wallet connectors
 */
export function getAvailableConnectors(): WalletConnector[] {
	return walletConnectors.filter((connector) => connector.isAvailable());
}

/**
 * Get connector by ID
 */
export function getConnectorById(id: string): WalletConnector | undefined {
	return walletConnectors.find((connector) => connector.id === id);
}

/**
 * Detect the best available wallet
 */
export function detectBestWallet(): WalletConnector | undefined {
	const available = getAvailableConnectors();

	// Prefer MetaMask if available
	const metamask = available.find((c) => c.id === 'metamask');
	if (metamask) return metamask;

	// Then Coinbase Wallet
	const coinbase = available.find((c) => c.id === 'coinbase');
	if (coinbase) return coinbase;

	// Then any injected wallet
	const injected = available.find((c) => c.id === 'injected');
	if (injected) return injected;

	// Finally WalletConnect as fallback
	return available.find((c) => c.id === 'walletconnect');
}

/**
 * Check if any wallet is available
 */
export function isWalletAvailable(): boolean {
	return getAvailableConnectors().length > 0;
}

/**
 * Get wallet installation URLs
 */
export const walletInstallUrls = {
	metamask: 'https://metamask.io/download/',
	coinbase: 'https://www.coinbase.com/wallet',
	walletconnect: 'https://walletconnect.com/explorer',
} as const;

/**
 * Get installation URL for a wallet
 */
export function getWalletInstallUrl(walletId: string): string | undefined {
	return walletInstallUrls[walletId as keyof typeof walletInstallUrls];
}
