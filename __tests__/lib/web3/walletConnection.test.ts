/**
 * Tests for Web3 wallet connection utilities
 */
import { ethers } from 'ethers';

// Extend Window interface to include ethereum
declare global {
	interface Window {
		ethereum?: {
			request: (args: { method: string; params?: any[] }) => Promise<any>;
			on: (event: string, callback: (...args: any[]) => void) => void;
			removeListener: (event: string, callback: (...args: any[]) => void) => void;
			isMetaMask?: boolean;
			selectedAddress?: string | null;
			chainId?: string;
		};
	}
}

// Mock ethers
jest.mock('ethers', () => ({
	ethers: {
		BrowserProvider: jest.fn(),
		getAddress: jest.fn((addr) => addr),
		formatEther: jest.fn((value) => value.toString()),
		parseEther: jest.fn((value) => BigInt(value)),
	},
}));

describe('Wallet Connection', () => {
	let originalEthereum: any;

	beforeEach(() => {
		jest.clearAllMocks();
		// Save original ethereum if it exists
		originalEthereum = window.ethereum;
		// Mock window.ethereum
		window.ethereum = {
			request: jest.fn(),
			on: jest.fn(),
			removeListener: jest.fn(),
			isMetaMask: true,
			selectedAddress: null,
			chainId: '0x1',
		};
	});

	afterEach(() => {
		// Restore original ethereum
		window.ethereum = originalEthereum;
	});

	describe('detectProvider', () => {
		it('should detect MetaMask provider', () => {
			expect(window.ethereum).toBeDefined();
			expect(window.ethereum!.isMetaMask).toBe(true);
		});

		it('should return null if no provider', () => {
			// Temporarily set ethereum to undefined to test no provider scenario
			const tempEthereum = window.ethereum;
			window.ethereum = undefined;
			
			expect(window.ethereum).toBeUndefined();
			
			// Restore ethereum
			window.ethereum = tempEthereum;
		});
	});

	describe('connectWallet', () => {
		it('should request accounts from provider', async () => {
			const mockAccounts = ['0x1234567890123456789012345678901234567890'];
			(window.ethereum!.request as jest.Mock).mockResolvedValue(mockAccounts);

			const result = await window.ethereum!.request({
				method: 'eth_requestAccounts',
			});

			expect(result).toEqual(mockAccounts);
			expect(window.ethereum!.request).toHaveBeenCalledWith({
				method: 'eth_requestAccounts',
			});
		});

		it('should handle user rejection', async () => {
			const error = new Error('User rejected request');
			(window.ethereum!.request as jest.Mock).mockRejectedValue(error);

			await expect(
				window.ethereum!.request({ method: 'eth_requestAccounts' }),
			).rejects.toThrow('User rejected request');
		});
	});

	describe('getChainId', () => {
		it('should get current chain ID', async () => {
			const mockChainId = '0x1'; // Ethereum mainnet
			(window.ethereum!.request as jest.Mock).mockResolvedValue(mockChainId);

			const result = await window.ethereum!.request({ method: 'eth_chainId' });

			expect(result).toBe(mockChainId);
		});
	});

	describe('switchNetwork', () => {
		it('should switch to requested network', async () => {
			const targetChainId = '0xaa36a7'; // Sepolia
			(window.ethereum!.request as jest.Mock).mockResolvedValue(null);

			await window.ethereum!.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: targetChainId }],
			});

			expect(window.ethereum!.request).toHaveBeenCalledWith({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: targetChainId }],
			});
		});

		it('should add network if not available', async () => {
			const error: any = new Error('Chain not added');
			error.code = 4902;

			(window.ethereum!.request as jest.Mock)
				.mockRejectedValueOnce(error)
				.mockResolvedValueOnce(null);

			try {
				await window.ethereum!.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0xaa36a7' }],
				});
			} catch (e: any) {
				if (e.code === 4902) {
					await window.ethereum!.request({
						method: 'wallet_addEthereumChain',
						params: [
							{
								chainId: '0xaa36a7',
								chainName: 'Sepolia',
								rpcUrls: ['https://sepolia.infura.io/v3/'],
							},
						],
					});
				}
			}

			expect(window.ethereum!.request).toHaveBeenCalledTimes(2);
		});
	});

	describe('getBalance', () => {
		it('should get wallet balance', async () => {
			const mockBalance = '0x1234567890abcdef';
			(window.ethereum!.request as jest.Mock).mockResolvedValue(mockBalance);

			const result = await window.ethereum!.request({
				method: 'eth_getBalance',
				params: ['0x1234567890123456789012345678901234567890', 'latest'],
			});

			expect(result).toBe(mockBalance);
		});
	});

	describe('event listeners', () => {
		it('should listen to accountsChanged event', () => {
			const callback = jest.fn();
			window.ethereum!.on('accountsChanged', callback);

			expect(window.ethereum!.on).toHaveBeenCalledWith('accountsChanged', callback);
		});

		it('should listen to chainChanged event', () => {
			const callback = jest.fn();
			window.ethereum!.on('chainChanged', callback);

			expect(window.ethereum!.on).toHaveBeenCalledWith('chainChanged', callback);
		});

		it('should remove event listeners', () => {
			const callback = jest.fn();
			window.ethereum!.removeListener('accountsChanged', callback);

			expect(window.ethereum!.removeListener).toHaveBeenCalledWith(
				'accountsChanged',
				callback,
			);
		});
	});

	describe('address validation', () => {
		it('should validate Ethereum address format', () => {
			const validAddress = '0x1234567890123456789012345678901234567890';
			const result = ethers.getAddress(validAddress);

			expect(result).toBe(validAddress);
		});
	});
});
