'use client';

import { NetworkConfig } from '@/lib/config/networks';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { initializeGnusDao, refreshGnusDaoData } from '@/lib/store/slices/gnusDaoSlice';
import {
	connectWallet,
	disconnectWallet,
	refreshBalance,
	switchNetwork,
} from '@/lib/store/slices/walletSlice';
import { estimateGas, getBalance, sendTransaction } from '@/lib/store/slices/web3Slice';
import { ethers } from 'ethers';
import { Web3ContextType } from './types';

/**
 * Redux-based Web3 hook that provides the same interface as the Zustand store
 */
export function useWeb3Store(): Web3ContextType & {
	// GNUS DAO state
	gnusDaoInitialized: boolean;
	gnusDaoContractAddress: string | null;
	tokenBalance: bigint;
	votingPower: bigint;
	voteCredits: bigint;

	// GNUS DAO methods
	initializeGnusDao: () => Promise<void>;
	refreshGnusDaoData: () => Promise<void>;
} {
	const dispatch = useAppDispatch();

	// Select state from Redux store
	const wallet = useAppSelector((state) => state.wallet);
	const web3 = useAppSelector((state) => state.web3);
	const gnusDao = useAppSelector((state) => state.gnusDao);

	return {
		// Wallet state
		wallet: {
			isConnected: wallet.isConnected,
			isConnecting: wallet.isConnecting,
			address: wallet.address,
			chainId: wallet.chainId,
			balance: wallet.balance,
			ensName: wallet.ensName,
			error: wallet.error,
		},

		// Web3 state
		provider: web3.provider,
		signer: web3.signer,
		currentNetwork: web3.currentNetwork,
		supportedNetworks: web3.supportedNetworks,

		// GNUS DAO state
		gnusDaoInitialized: gnusDao.initialized,
		gnusDaoContractAddress: gnusDao.contractAddress,
		tokenBalance: gnusDao.tokenBalance,
		votingPower: gnusDao.votingPower,
		voteCredits: gnusDao.voteCredits,

		// Connection methods
		connect: async (connectorId?: string) => {
			if (!connectorId) {
				throw new Error('No wallet connector specified. Please select a wallet.');
			}
			if (process.env.NODE_ENV === 'development') {
				console.log('🔗 Redux Provider: Connecting with connector:', connectorId);
			}
			const result = await dispatch(connectWallet(connectorId)).unwrap();
			if (process.env.NODE_ENV === 'development') {
				console.log('🔗 Redux Provider: Connection completed:', result);
			}
		},

		disconnect: async () => {
			await dispatch(disconnectWallet()).unwrap();
		},

		// Network methods
		switchNetwork: async (chainId: number) => {
			await dispatch(switchNetwork(chainId)).unwrap();
		},

		addNetwork: async (network: NetworkConfig) => {
			if (!(window as any).ethereum) {
				throw new Error('No wallet connected');
			}

			await (window as any).ethereum.request({
				method: 'wallet_addEthereumChain',
				params: [
					{
						chainId: `0x${network.id.toString(16)}`,
						chainName: network.displayName,
						nativeCurrency: network.nativeCurrency,
						rpcUrls: network.rpcUrls?.[0] ? [network.rpcUrls[0]] : [network.rpcUrl],
						blockExplorerUrls: network.blockExplorers?.[0]?.url
							? [network.blockExplorers[0].url]
							: [network.blockExplorerUrl],
					},
				],
			});
		},

		// Utility methods
		refreshBalance: async () => {
			await dispatch(refreshBalance()).unwrap();
		},

		getBalance: async (address?: string) => {
			if (address) {
				return await dispatch(getBalance(address)).unwrap();
			} else if (wallet.address) {
				return await dispatch(getBalance(wallet.address)).unwrap();
			} else {
				throw new Error('No address provided');
			}
		},

		// Transaction methods
		sendTransaction: async (transaction: ethers.TransactionRequest) => {
			const result = await dispatch(sendTransaction(transaction)).unwrap();
			// Convert back to ethers.TransactionResponse format
			return {
				hash: result.hash,
				from: result.from,
				to: result.to,
				value: result.value ? BigInt(result.value) : undefined,
				gasLimit: result.gasLimit ? BigInt(result.gasLimit) : undefined,
				gasPrice: result.gasPrice ? BigInt(result.gasPrice) : undefined,
				wait: async (confirmations?: number) => {
					if (!web3.provider) throw new Error('No provider available');
					return await web3.provider.waitForTransaction(result.hash, confirmations);
				},
			} as ethers.TransactionResponse;
		},

		estimateGas: async (transaction: ethers.TransactionRequest) => {
			const result = await dispatch(estimateGas(transaction)).unwrap();
			return BigInt(result);
		},

		// Contract interaction
		getContract: <T = ethers.Contract>(
			address: string,
			abi: ethers.ContractInterface,
		): T => {
			const signerOrProvider = web3.signer || web3.provider;

			if (!signerOrProvider) {
				throw new Error('No signer or provider available');
			}

			return new ethers.Contract(
				address,
				abi as unknown as ethers.InterfaceAbi,
				signerOrProvider,
			) as T;
		},

		// GNUS DAO methods
		initializeGnusDao: async () => {
			await dispatch(initializeGnusDao()).unwrap();
		},

		refreshGnusDaoData: async () => {
			await dispatch(refreshGnusDaoData()).unwrap();
		},
	};
}
