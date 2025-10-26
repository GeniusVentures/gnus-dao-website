import { ethers } from 'ethers';
import { NetworkConfig } from '@/lib/config/networks';

/**
 * Wallet connection state
 */
export interface WalletState {
	isConnected: boolean;
	isConnecting: boolean;
	address: string | undefined;
	chainId: number | undefined;
	balance: string | undefined;
	ensName: string | undefined;
	error: string | undefined;
}

/**
 * Web3 provider context type
 */
export interface Web3ContextType {
	// Connection state
	wallet: WalletState;

	// Providers and signers
	provider: ethers.BrowserProvider | undefined;
	signer: ethers.JsonRpcSigner | undefined;

	// Network information
	currentNetwork: NetworkConfig | undefined;
	supportedNetworks: NetworkConfig[];

	// Connection methods
	connect: (connectorId?: string) => Promise<void>;
	disconnect: () => Promise<void>;

	// Network methods
	switchNetwork: (chainId: number) => Promise<void>;
	addNetwork: (network: NetworkConfig) => Promise<void>;

	// Utility methods
	refreshBalance: () => Promise<void>;
	getBalance: (address?: string) => Promise<string>;

	// Transaction methods
	sendTransaction: (
		transaction: ethers.TransactionRequest,
	) => Promise<ethers.TransactionResponse>;
	estimateGas: (transaction: ethers.TransactionRequest) => Promise<bigint>;

	// Contract interaction
	getContract: <T = ethers.Contract>(address: string, abi: any) => T;
}

/**
 * Wallet connector interface
 */
export interface WalletConnector {
	id: string;
	name: string;
	icon: string;
	description: string;
	isAvailable: () => boolean;
	connect: () => Promise<{
		provider: ethers.BrowserProvider;
		address: string;
		chainId: number;
	}>;
	disconnect?: () => Promise<void>;
}

/**
 * Transaction status
 */
export enum TransactionStatus {
	PENDING = 'pending',
	CONFIRMED = 'confirmed',
	FAILED = 'failed',
}

/**
 * Transaction info
 */
export interface TransactionInfo {
	hash: string;
	status: TransactionStatus;
	confirmations: number;
	gasUsed?: bigint;
	effectiveGasPrice?: bigint;
	blockNumber?: number;
	timestamp?: number;
}

/**
 * Network switch request
 */
export interface NetworkSwitchRequest {
	chainId: number;
	network: NetworkConfig;
}

/**
 * Wallet events
 */
export interface WalletEvents {
	accountsChanged: (accounts: string[]) => void;
	chainChanged: (chainId: string) => void;
	connect: (connectInfo: { chainId: string }) => void;
	disconnect: (error: { code: number; message: string }) => void;
}

/**
 * Web3 error types
 */
export enum Web3ErrorCode {
	USER_REJECTED = 4001,
	UNAUTHORIZED = 4100,
	UNSUPPORTED_METHOD = 4200,
	DISCONNECTED = 4900,
	CHAIN_DISCONNECTED = 4901,
	NETWORK_ERROR = -32002,
	INVALID_PARAMS = -32602,
	INTERNAL_ERROR = -32603,
}

/**
 * Web3 error interface
 */
export interface Web3Error extends Error {
	code: Web3ErrorCode;
	data?: any;
}

/**
 * Contract call options
 */
export interface ContractCallOptions {
	gasLimit?: bigint;
	gasPrice?: bigint;
	value?: bigint;
	from?: string;
}

/**
 * Token information
 */
export interface TokenInfo {
	address: string;
	name: string;
	symbol: string;
	decimals: number;
	totalSupply?: bigint;
	balance?: bigint;
}

/**
 * Gas estimation result
 */
export interface GasEstimation {
	gasLimit: bigint;
	gasPrice: bigint;
	maxFeePerGas?: bigint;
	maxPriorityFeePerGas?: bigint;
	totalCost: bigint;
}

/**
 * Wallet connection options
 */
export interface WalletConnectionOptions {
	autoConnect?: boolean;
	showQRCode?: boolean;
	preferredWallet?: string;
}

/**
 * Network validation result
 */
export interface NetworkValidation {
	isSupported: boolean;
	isRecommended: boolean;
	reason?: string;
	suggestedNetwork?: NetworkConfig;
}
