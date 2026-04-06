import { getNetworkConfig } from '@/lib/config/networks';
import { getConnectorById } from '@/lib/web3/connectors';
import { WalletConnector, WalletState } from '@/lib/web3/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ethers } from 'ethers';

interface WalletSliceState extends WalletState {
	provider?: ethers.BrowserProvider | undefined;
	signer?: ethers.JsonRpcSigner | undefined;
	connector?: WalletConnector | undefined;
}

const initialState: WalletSliceState = {
	isConnected: false,
	isConnecting: false,
	address: undefined,
	chainId: undefined,
	balance: undefined,
	ensName: undefined,
	error: undefined,
	provider: undefined,
	signer: undefined,
	connector: undefined,
};

// Async thunks
export const connectWallet = createAsyncThunk(
	'wallet/connect',
	async (connectorId: string, { rejectWithValue }) => {
		try {
			const connector = getConnectorById(connectorId);
			if (!connector) {
				throw new Error(`Connector ${connectorId} not found`);
			}
			if (!connector.isAvailable()) {
				throw new Error(`${connector.name} is not available. Please install it first.`);
			}

			const { provider, address, chainId } = await connector.connect();
			const signer = await provider.getSigner();
			const network = getNetworkConfig(chainId);

			// Get ENS name if on mainnet
			let ensName: string | undefined;
			if (chainId === 1) {
				try {
					ensName = (await provider.lookupAddress(address)) || undefined;
				} catch {
					// ENS lookup failed, ignore
				}
			}

			// Save connector for auto-reconnect
			localStorage.setItem('gnus-dao-wallet-connector', connector.id);

			return {
				provider,
				signer,
				connector,
				address,
				chainId,
				ensName,
				network,
			};
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to connect wallet');
		}
	},
);

/**
 * Silent reconnect — restores wallet session WITHOUT triggering a MetaMask popup.
 * Uses eth_accounts (read-only, already-authorized accounts) instead of eth_requestAccounts.
 * Only succeeds if MetaMask already has permission for this site.
 */
export const silentReconnectWallet = createAsyncThunk(
	'wallet/connect', // Same type as connectWallet so web3Slice matcher picks it up
	async (connectorId: string, { rejectWithValue }) => {
		try {
			if (!(window as any).ethereum) {
				return rejectWithValue('No wallet provider');
			}

			// eth_accounts returns already-authorized accounts WITHOUT a popup
			const accounts: string[] = await (window as any).ethereum.request({
				method: 'eth_accounts',
			});

			if (!accounts || accounts.length === 0) {
				// Not connected — do nothing (no popup)
				return rejectWithValue('No authorized accounts');
			}

			const provider = new ethers.BrowserProvider((window as any).ethereum);
			const network = await provider.getNetwork();
			const chainId = Number(network.chainId);
			const signer = await provider.getSigner();
			const networkConfig = getNetworkConfig(chainId);

			const connector = getConnectorById(connectorId);

			return {
				provider,
				signer,
				connector,
				address: accounts[0],
				chainId,
				ensName: undefined,
				network: networkConfig,
			};
		} catch (error: any) {
			return rejectWithValue(error.message || 'Silent reconnect failed');
		}
	},
);

export const disconnectWallet = createAsyncThunk(
	'wallet/disconnect',
	async (_, { getState }) => {
		const state = getState() as { wallet: WalletSliceState };

		// Remove event listeners
		if ((window as any).ethereum) {
			(window as any).ethereum.removeAllListeners('accountsChanged');
			(window as any).ethereum.removeAllListeners('chainChanged');
			(window as any).ethereum.removeAllListeners('disconnect');
		}

		// Call connector disconnect if available
		if (state.wallet.connector?.disconnect) {
			try {
				await state.wallet.connector.disconnect();
			} catch (error) {
				if (process.env.NODE_ENV === 'development') {
					console.warn('Connector disconnect failed:', error);
				}
			}
		}

		// Clear saved connector
		localStorage.removeItem('gnus-dao-wallet-connector');
	},
);

export const refreshBalance = createAsyncThunk(
	'wallet/refreshBalance',
	async (_, { getState, rejectWithValue }) => {
		const state = getState() as { wallet: WalletSliceState };
		const { provider, address } = state.wallet;

		if (!provider || !address) {
			return rejectWithValue('No provider or address available');
		}

		try {
			const balance = await provider.getBalance(address);
			return ethers.formatEther(balance);
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to refresh balance');
		}
	},
);

export const switchNetwork = createAsyncThunk(
	'wallet/switchNetwork',
	async (chainId: number, { rejectWithValue }) => {
		if (!(window as any).ethereum) {
			return rejectWithValue('No wallet connected');
		}

		const network = getNetworkConfig(chainId);
		if (!network) {
			return rejectWithValue(`Unsupported network: ${chainId}`);
		}

		try {
			await (window as any).ethereum.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: `0x${chainId.toString(16)}` }],
			});
			return { chainId, network };
		} catch (error: any) {
			// If the network is not added, try to add it
			if (error.code === 4902) {
				try {
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
					return { chainId, network };
				} catch (addError: any) {
					return rejectWithValue(addError.message || 'Failed to add network');
				}
			} else {
				return rejectWithValue(error.message || 'Failed to switch network');
			}
		}
	},
);

const walletSlice = createSlice({
	name: 'wallet',
	initialState,
	reducers: {
		setWalletState: (state, action: PayloadAction<Partial<WalletState>>) => {
			Object.assign(state, action.payload);
		},
		setProvider: (state, action: PayloadAction<ethers.BrowserProvider | undefined>) => {
			state.provider = action.payload;
		},
		setSigner: (state, action: PayloadAction<ethers.JsonRpcSigner | undefined>) => {
			state.signer = action.payload;
		},
		setConnector: (state, action: PayloadAction<WalletConnector | undefined>) => {
			state.connector = action.payload;
		},
		clearError: (state) => {
			state.error = undefined;
		},
		handleAccountsChanged: (state, action: PayloadAction<string[]>) => {
			if (action.payload.length === 0) {
				// Will be handled by disconnect action
			} else {
				state.address = action.payload[0];
			}
		},
		handleChainChanged: (state, action: PayloadAction<string>) => {
			const chainId = parseInt(action.payload, 16);
			state.chainId = chainId;
		},
	},
	extraReducers: (builder) => {
		builder
			// Connect wallet
			.addCase(connectWallet.pending, (state) => {
				state.isConnecting = true;
				state.error = undefined;
			})
			.addCase(connectWallet.fulfilled, (state, action) => {
				if (process.env.NODE_ENV === 'development') {
					console.log('🔗 Redux: Wallet connection fulfilled:', action.payload);
				}
				state.isConnecting = false;
				state.isConnected = true;
				state.provider = action.payload.provider;
				state.signer = action.payload.signer;
				state.connector = action.payload.connector;
				state.address = action.payload.address;
				state.chainId = action.payload.chainId;
				state.ensName = action.payload.ensName;
				state.error = undefined;
			})
			.addCase(connectWallet.rejected, (state, action) => {
				state.isConnecting = false;
				state.error = action.payload as string;
			})
			// Disconnect wallet
			.addCase(disconnectWallet.fulfilled, (state) => {
				state.isConnected = false;
				state.isConnecting = false;
				state.address = undefined;
				state.chainId = undefined;
				state.balance = undefined;
				state.ensName = undefined;
				state.error = undefined;
				state.provider = undefined;
				state.signer = undefined;
				state.connector = undefined;
			})
			// Refresh balance
			.addCase(refreshBalance.fulfilled, (state, action) => {
				state.balance = action.payload;
			})
			.addCase(refreshBalance.rejected, (state, action) => {
				if (process.env.NODE_ENV === 'development') {
					console.warn('Failed to refresh balance:', action.payload);
				}
			})
			// Switch network
			.addCase(switchNetwork.fulfilled, (state, action) => {
				state.chainId = action.payload.chainId;
			})
			.addCase(switchNetwork.rejected, (state, action) => {
				state.error = action.payload as string;
			});
	},
});

export const {
	setWalletState,
	setProvider,
	setSigner,
	setConnector,
	clearError,
	handleAccountsChanged,
	handleChainChanged,
} = walletSlice.actions;

export default walletSlice.reducer;
