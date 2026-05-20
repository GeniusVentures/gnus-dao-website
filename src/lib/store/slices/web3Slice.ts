import { getNetworkConfig, NetworkConfig, SUPPORTED_NETWORKS } from '@/lib/config/networks';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ethers } from 'ethers';

interface Web3SliceState {
	provider?: ethers.BrowserProvider | undefined;
	signer?: ethers.JsonRpcSigner | undefined;
	currentNetwork?: NetworkConfig | undefined;
	supportedNetworks: NetworkConfig[];
	isInitialized: boolean;
}

const initialState: Web3SliceState = {
	provider: undefined,
	signer: undefined,
	currentNetwork: undefined,
	supportedNetworks: Object.values(SUPPORTED_NETWORKS),
	isInitialized: false,
};

// Async thunks
export const initializeWeb3 = createAsyncThunk(
	'web3/initialize',
	async (_, { getState, dispatch }) => {
		const state = getState() as { web3: Web3SliceState };
		if (state.web3.isInitialized) return;

		// Try to restore previous connection SILENTLY (no MetaMask popup)
		const savedConnectorId = localStorage.getItem('gnus-dao-wallet-connector');
		if (savedConnectorId) {
			try {
				// Use silentReconnectWallet: uses eth_accounts (no popup) not eth_requestAccounts
				const { silentReconnectWallet } = await import('../slices/walletSlice');
				dispatch(silentReconnectWallet(savedConnectorId));
			} catch (error) {
				if (process.env.NODE_ENV === 'development') {
					console.warn('Failed to restore wallet connection:', error);
				}
				localStorage.removeItem('gnus-dao-wallet-connector');
			}
		}

		return true;
	},
);

export const sendTransaction = createAsyncThunk(
	'web3/sendTransaction',
	async (_transaction: ethers.TransactionRequest, { getState, rejectWithValue }) => {
		const state = getState() as { web3: Web3SliceState };
		const { signer } = state.web3;

		if (!signer) {
			return rejectWithValue('No signer available');
		}

		try {
			const txResponse = await signer.sendTransaction(_transaction);
			return {
				hash: txResponse.hash,
				from: txResponse.from,
				to: txResponse.to,
				value: txResponse.value?.toString(),
				gasLimit: txResponse.gasLimit?.toString(),
				gasPrice: txResponse.gasPrice?.toString(),
			};
		} catch (error: any) {
			return rejectWithValue(error.message || 'Transaction failed');
		}
	},
);

export const estimateGas = createAsyncThunk(
	'web3/estimateGas',
	async (_transaction: ethers.TransactionRequest, { getState, rejectWithValue }) => {
		const state = getState() as { web3: Web3SliceState };
		const { provider } = state.web3;

		if (!provider) {
			return rejectWithValue('No provider available');
		}

		try {
			const gasEstimate = await provider.estimateGas(_transaction);
			return gasEstimate.toString();
		} catch (error: any) {
			return rejectWithValue(error.message || 'Gas estimation failed');
		}
	},
);

export const getBalance = createAsyncThunk(
	'web3/getBalance',
	async (_address: string, { getState, rejectWithValue }) => {
		const state = getState() as { web3: Web3SliceState };
		const { provider } = state.web3;

		if (!provider) {
			return rejectWithValue('No provider available');
		}

		try {
			const balance = await provider.getBalance(_address);
			return ethers.formatEther(balance);
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to get balance');
		}
	},
);

const web3Slice = createSlice({
	name: 'web3',
	initialState,
	reducers: {
		setProvider: (state, action: PayloadAction<ethers.BrowserProvider | undefined>) => {
			state.provider = action.payload;
		},
		setSigner: (state, action: PayloadAction<ethers.JsonRpcSigner | undefined>) => {
			state.signer = action.payload;
		},
		setCurrentNetwork: (state, action: PayloadAction<NetworkConfig | undefined>) => {
			state.currentNetwork = action.payload;
		},
		updateNetworkFromChainId: (state, action: PayloadAction<number>) => {
			const network = getNetworkConfig(action.payload);
			state.currentNetwork = network;
		},
		clearWeb3State: (state) => {
			state.provider = undefined;
			state.signer = undefined;
			state.currentNetwork = undefined;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(initializeWeb3.fulfilled, (state) => {
				state.isInitialized = true;
			})
			// Handle wallet connection from wallet slice
			.addMatcher(
				(action) => action.type === 'wallet/connect/fulfilled',
				(
					state,
					action: PayloadAction<{
						provider: ethers.BrowserProvider;
						signer: ethers.JsonRpcSigner;
						network: NetworkConfig;
					}>,
				) => {
					state.provider = action.payload.provider;
					state.signer = action.payload.signer;
					state.currentNetwork = action.payload.network;
				},
			)
			// Handle wallet disconnection from wallet slice
			.addMatcher(
				(action) => action.type === 'wallet/disconnect/fulfilled',
				(state) => {
					state.provider = undefined;
					state.signer = undefined;
					state.currentNetwork = undefined;
				},
			)
			// Handle network switch from wallet slice
			.addMatcher(
				(action) => action.type === 'wallet/switchNetwork/fulfilled',
				(state, action: PayloadAction<{ network: NetworkConfig }>) => {
					state.currentNetwork = action.payload.network;
				},
			)
			// Handle chain changed from MetaMask (user switches network externally)
			.addMatcher(
				(action) => action.type === 'wallet/handleChainChanged',
				(state, action: PayloadAction<string>) => {
					const chainId = parseInt(action.payload, 16);
					const network = getNetworkConfig(chainId);
					state.currentNetwork = network; // undefined if unsupported chain
				},
			);
	},
});

export const {
	setProvider,
	setSigner,
	setCurrentNetwork,
	updateNetworkFromChainId,
	clearWeb3State,
} = web3Slice.actions;

export default web3Slice.reducer;
