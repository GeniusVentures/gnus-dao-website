/**
 * Network configuration for supported blockchains
 */

export interface NetworkConfig {
	id: number;
	name: string;
	displayName?: string;
	chainId: number;
	rpcUrl: string;
	rpcUrls?: string[];
	blockExplorerUrl: string;
	blockExplorers?: { name: string; url: string }[];
	nativeCurrency: {
		name: string;
		symbol: string;
		decimals: number;
	};
	contractAddress?: string;
	isTestnet: boolean;
	testnet?: boolean;
	gasless?: boolean;
	features?: string[];
}

export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
	sepolia: {
		id: 11155111,
		name: 'Sepolia',
		displayName: 'Ethereum Sepolia',
		chainId: 11155111,
		rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
		blockExplorerUrl: 'https://sepolia.etherscan.io',
		nativeCurrency: {
			name: 'Sepolia ETH',
			symbol: 'ETH',
			decimals: 18,
		},
		contractAddress: process.env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS,
		isTestnet: true,
		testnet: true,
		features: ['Governance', 'Voting', 'Treasury'],
	},
	polygon_amoy: {
		id: 80002,
		name: 'Polygon Amoy',
		displayName: 'Polygon Amoy Testnet',
		chainId: 80002,
		rpcUrl: 'https://rpc-amoy.polygon.technology',
		blockExplorerUrl: 'https://amoy.polygonscan.com',
		nativeCurrency: {
			name: 'Polygon MATIC',
			symbol: 'MATIC',
			decimals: 18,
		},
		contractAddress: process.env.NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS,
		isTestnet: true,
		testnet: true,
		features: ['Governance', 'Low Fees'],
	},
	base_sepolia: {
		id: 84532,
		name: 'Base Sepolia',
		displayName: 'Base Sepolia Testnet',
		chainId: 84532,
		rpcUrl: 'https://sepolia.base.org',
		blockExplorerUrl: 'https://sepolia.basescan.org',
		nativeCurrency: {
			name: 'Base ETH',
			symbol: 'ETH',
			decimals: 18,
		},
		contractAddress: process.env.NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS,
		isTestnet: true,
		testnet: true,
		features: ['Governance', 'L2'],
	},
	arbitrum_sepolia: {
		id: 421614,
		name: 'Arbitrum Sepolia',
		displayName: 'Arbitrum Sepolia Testnet',
		chainId: 421614,
		rpcUrl: 'https://sepolia-rpc.arbitrum.io/rpc',
		blockExplorerUrl: 'https://sepolia.arbiscan.io',
		nativeCurrency: {
			name: 'Arbitrum ETH',
			symbol: 'ETH',
			decimals: 18,
		},
		contractAddress: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS,
		isTestnet: true,
		testnet: true,
		features: ['Governance', 'L2'],
	},
};

export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
	return Object.values(SUPPORTED_NETWORKS).find((network) => network.chainId === chainId);
}

export function getNetworkByName(name: string): NetworkConfig | undefined {
	return SUPPORTED_NETWORKS[name.toLowerCase()];
}

export function getSupportedChainIds(): number[] {
	return Object.values(SUPPORTED_NETWORKS).map((network) => network.chainId);
}

export function isSupportedChain(chainId: number): boolean {
	return getSupportedChainIds().includes(chainId);
}

export function getTestnetNetworks(): NetworkConfig[] {
	return Object.values(SUPPORTED_NETWORKS).filter((network) => network.isTestnet);
}

export function getMainnetNetworks(): NetworkConfig[] {
	return Object.values(SUPPORTED_NETWORKS).filter((network) => !network.isTestnet);
}

/**
 * Get all networks
 */
export function getAllNetworks(): NetworkConfig[] {
	return Object.values(SUPPORTED_NETWORKS);
}
