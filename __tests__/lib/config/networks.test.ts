/**
 * Tests for Network Configuration
 * Critical for multi-chain support
 */

import {
	SUPPORTED_NETWORKS,
	getNetworkConfig,
	getNetworkByName,
	isSupportedChain,
	getSupportedChainIds,
	getTestnetNetworks,
	getMainnetNetworks,
	getAllNetworks,
} from '@/lib/config/networks';

describe('Network Configuration', () => {
	describe('SUPPORTED_NETWORKS', () => {
		it('should have network configurations', () => {
			expect(SUPPORTED_NETWORKS).toBeDefined();
			expect(typeof SUPPORTED_NETWORKS).toBe('object');
			expect(Object.keys(SUPPORTED_NETWORKS).length).toBeGreaterThan(0);
		});

		it('should have required fields for each network', () => {
			Object.values(SUPPORTED_NETWORKS).forEach((network) => {
				expect(network.id).toBeDefined();
				expect(network.name).toBeDefined();
				expect(network.chainId).toBeDefined();
				expect(network.rpcUrl).toBeDefined();
				expect(network.blockExplorerUrl).toBeDefined();
				expect(network.nativeCurrency).toBeDefined();
				expect(network.nativeCurrency.name).toBeDefined();
				expect(network.nativeCurrency.symbol).toBeDefined();
				expect(network.nativeCurrency.decimals).toBe(18);
				expect(typeof network.isTestnet).toBe('boolean');
			});
		});

		it('should have unique chain IDs', () => {
			const chainIds = Object.values(SUPPORTED_NETWORKS).map((n) => n.chainId);
			const uniqueChainIds = new Set(chainIds);
			expect(chainIds.length).toBe(uniqueChainIds.size);
		});

		it('should include Sepolia testnet', () => {
			expect(SUPPORTED_NETWORKS.sepolia).toBeDefined();
			expect(SUPPORTED_NETWORKS.sepolia.chainId).toBe(11155111);
			expect(SUPPORTED_NETWORKS.sepolia.isTestnet).toBe(true);
		});
	});

	describe('getNetworkConfig', () => {
		it('should return network for valid chain ID', () => {
			const network = getNetworkConfig(11155111); // Sepolia
			expect(network).toBeDefined();
			expect(network?.chainId).toBe(11155111);
		});

		it('should return undefined for invalid chain ID', () => {
			const network = getNetworkConfig(999999);
			expect(network).toBeUndefined();
		});
	});

	describe('getNetworkByName', () => {
		it('should return network for valid name', () => {
			const network = getNetworkByName('sepolia');
			expect(network).toBeDefined();
			expect(network?.name).toBe('Sepolia');
		});

		it('should be case-insensitive', () => {
			const network1 = getNetworkByName('SEPOLIA');
			const network2 = getNetworkByName('sepolia');
			expect(network1).toEqual(network2);
		});

		it('should return undefined for invalid name', () => {
			const network = getNetworkByName('invalid-network');
			expect(network).toBeUndefined();
		});
	});

	describe('isSupportedChain', () => {
		it('should return true for supported networks', () => {
			expect(isSupportedChain(11155111)).toBe(true); // Sepolia
		});

		it('should return false for unsupported networks', () => {
			expect(isSupportedChain(999999)).toBe(false);
		});
	});

	describe('getSupportedChainIds', () => {
		it('should return array of chain IDs', () => {
			const chainIds = getSupportedChainIds();
			expect(Array.isArray(chainIds)).toBe(true);
			expect(chainIds.length).toBeGreaterThan(0);
			expect(chainIds).toContain(11155111); // Sepolia
		});

		it('should return unique chain IDs', () => {
			const chainIds = getSupportedChainIds();
			const uniqueChainIds = new Set(chainIds);
			expect(chainIds.length).toBe(uniqueChainIds.size);
		});
	});

	describe('getAllNetworks', () => {
		it('should return all networks', () => {
			const networks = getAllNetworks();
			expect(Array.isArray(networks)).toBe(true);
			expect(networks.length).toBeGreaterThan(0);
		});

		it('should match SUPPORTED_NETWORKS count', () => {
			const networks = getAllNetworks();
			expect(networks.length).toBe(Object.keys(SUPPORTED_NETWORKS).length);
		});
	});

	describe('Network RPC URLs', () => {
		it('should have valid RPC URLs', () => {
			Object.values(SUPPORTED_NETWORKS).forEach((network) => {
				expect(network.rpcUrl).toMatch(/^https?:\/\//);
			});
		});

		it('should have block explorer URLs', () => {
			Object.values(SUPPORTED_NETWORKS).forEach((network) => {
				expect(network.blockExplorerUrl).toMatch(/^https?:\/\//);
			});
		});
	});

	describe('Network Features', () => {
		it('should identify testnet networks', () => {
			const testnets = getTestnetNetworks();
			expect(testnets.length).toBeGreaterThan(0);
			testnets.forEach((network) => {
				expect(network.isTestnet).toBe(true);
			});
		});

		it('should identify mainnet networks', () => {
			const mainnets = getMainnetNetworks();
			// May be 0 if only testnets configured
			expect(Array.isArray(mainnets)).toBe(true);
			mainnets.forEach((network) => {
				expect(network.isTestnet).toBe(false);
			});
		});

		it('should have Sepolia as testnet', () => {
			const sepolia = getNetworkConfig(11155111);
			expect(sepolia?.isTestnet).toBe(true);
		});
	});
});
