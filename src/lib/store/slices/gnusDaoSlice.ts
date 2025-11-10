import { gnusDaoService } from '@/lib/contracts/gnusDaoService';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ethers } from 'ethers';

interface GnusDaoSliceState {
	initialized: boolean;
	contractAddress: string | null;
	tokenBalance: bigint;
	votingPower: bigint;
	voteCredits: bigint;
	isLoading: boolean;
	error: string | null;
}

const initialState: GnusDaoSliceState = {
	initialized: false,
	contractAddress: null,
	tokenBalance: 0n,
	votingPower: 0n,
	voteCredits: 0n,
	isLoading: false,
	error: null,
};

// Async thunks
export const initializeGnusDao = createAsyncThunk(
	'gnusDao/initialize',
	async (_, { getState, rejectWithValue }) => {
		interface Web3State {
			provider?: ethers.BrowserProvider;
			signer?: ethers.JsonRpcSigner;
			currentNetwork?: { id: number };
		}
		interface RootState {
			web3: Web3State;
			wallet: { address?: string };
		}
		const state = getState() as RootState;

		const { provider, signer, currentNetwork } = state.web3;
		const { address } = state.wallet;

		if (!provider || !currentNetwork || !address) {
			return rejectWithValue('Missing required Web3 components');
		}

		try {
			const initialized = await gnusDaoService.initialize(
				provider,
				signer,
				currentNetwork.id,
			);

			if (initialized) {
				// Get initial contract data
				const [tokenBalance, votingPower, voteCredits] = await Promise.all([
					gnusDaoService.getTokenBalance(address).catch(() => 0n),
					gnusDaoService.getVotingPower(address).catch(() => 0n),
					gnusDaoService.getVoteCredits(address).catch(() => 0n),
				]);

				return {
					initialized: true,
					contractAddress: gnusDaoService.getContractAddress(),
					tokenBalance,
					votingPower,
					voteCredits,
				};
			} else {
				return {
					initialized: false,
					contractAddress: null,
					tokenBalance: 0n,
					votingPower: 0n,
					voteCredits: 0n,
				};
			}
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to initialize GNUS DAO service');
		}
	},
);

export const refreshGnusDaoData = createAsyncThunk(
	'gnusDao/refreshData',
	async (_, { getState, rejectWithValue }) => {
		const state = getState() as {
			gnusDao: GnusDaoSliceState;
			wallet: { address?: string };
		};

		const { initialized } = state.gnusDao;
		const { address } = state.wallet;

		if (!initialized || !address) {
			return rejectWithValue('GNUS DAO not initialized or no wallet address');
		}

		try {
			const [tokenBalance, votingPower, voteCredits] = await Promise.all([
				gnusDaoService.getTokenBalance(address).catch(() => 0n),
				gnusDaoService.getVotingPower(address).catch(() => 0n),
				gnusDaoService.getVoteCredits(address).catch(() => 0n),
			]);

			return {
				tokenBalance,
				votingPower,
				voteCredits,
				contractAddress: gnusDaoService.getContractAddress(),
			};
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to refresh GNUS DAO data');
		}
	},
);

export const getTokenBalance = createAsyncThunk(
	'gnusDao/getTokenBalance',
	async (address: string, { rejectWithValue }) => {
		try {
			const balance = await gnusDaoService.getTokenBalance(address);
			return balance;
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to get token balance');
		}
	},
);

export const getVotingPower = createAsyncThunk(
	'gnusDao/getVotingPower',
	async (address: string, { rejectWithValue }) => {
		try {
			const votingPower = await gnusDaoService.getVotingPower(address);
			return votingPower;
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to get voting power');
		}
	},
);

export const getVoteCredits = createAsyncThunk(
	'gnusDao/getVoteCredits',
	async (address: string, { rejectWithValue }) => {
		try {
			const voteCredits = await gnusDaoService.getVoteCredits(address);
			return voteCredits;
		} catch (error: any) {
			return rejectWithValue(error.message || 'Failed to get vote credits');
		}
	},
);

const gnusDaoSlice = createSlice({
	name: 'gnusDao',
	initialState,
	reducers: {
		setGnusDaoState: (
			state,
			action: PayloadAction<{
				initialized: boolean;
				contractAddress: string | null;
				tokenBalance: bigint;
				votingPower: bigint;
				voteCredits: bigint;
			}>,
		) => {
			Object.assign(state, action.payload);
		},
		clearGnusDaoState: (state) => {
			state.initialized = false;
			state.contractAddress = null;
			state.tokenBalance = 0n;
			state.votingPower = 0n;
			state.voteCredits = 0n;
			state.error = null;
		},
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			// Initialize GNUS DAO
			.addCase(initializeGnusDao.pending, (state) => {
				state.isLoading = true;
				state.error = null;
			})
			.addCase(initializeGnusDao.fulfilled, (state, action) => {
				state.isLoading = false;
				state.initialized = action.payload.initialized;
				state.contractAddress = action.payload.contractAddress;
				state.tokenBalance = action.payload.tokenBalance;
				state.votingPower = action.payload.votingPower;
				state.voteCredits = action.payload.voteCredits;
				state.error = null;
			})
			.addCase(initializeGnusDao.rejected, (state, action) => {
				state.isLoading = false;
				state.error = action.payload as string;
			})
			// Refresh GNUS DAO data
			.addCase(refreshGnusDaoData.pending, (state) => {
				state.isLoading = true;
				state.error = null;
			})
			.addCase(refreshGnusDaoData.fulfilled, (state, action) => {
				state.isLoading = false;
				state.tokenBalance = action.payload.tokenBalance;
				state.votingPower = action.payload.votingPower;
				state.voteCredits = action.payload.voteCredits;
				state.contractAddress = action.payload.contractAddress;
				state.error = null;
			})
			.addCase(refreshGnusDaoData.rejected, (state, action) => {
				state.isLoading = false;
				state.error = action.payload as string;
			})
			// Get token balance
			.addCase(getTokenBalance.fulfilled, (state, action) => {
				state.tokenBalance = action.payload;
			})
			// Get voting power
			.addCase(getVotingPower.fulfilled, (state, action) => {
				state.votingPower = action.payload;
			})
			// Get vote credits
			.addCase(getVoteCredits.fulfilled, (state, action) => {
				state.voteCredits = action.payload;
			})
			// Handle wallet disconnection
			.addMatcher(
				(action) => action.type === 'wallet/disconnect/fulfilled',
				(state) => {
					state.initialized = false;
					state.contractAddress = null;
					state.tokenBalance = 0n;
					state.votingPower = 0n;
					state.voteCredits = 0n;
					state.error = null;
				},
			);
	},
});

export const { setGnusDaoState, clearGnusDaoState, clearError } = gnusDaoSlice.actions;

export default gnusDaoSlice.reducer;
