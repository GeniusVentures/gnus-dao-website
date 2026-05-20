import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import web3Reducer from './slices/web3Slice';
import walletReducer from './slices/walletSlice';
import gnusDaoReducer from './slices/gnusDaoSlice';

export const store = configureStore({
	reducer: {
		web3: web3Reducer,
		wallet: walletReducer,
		gnusDao: gnusDaoReducer,
	},

	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				// Ignore these action types (non-serializable payload objects like BrowserProvider)
				ignoredActions: [
					'web3/setProvider',
					'web3/setSigner',
					'wallet/connect/fulfilled', // connectWallet thunk
					'wallet/setProvider',
					'wallet/setSigner',
					'wallet/initialize/fulfilled', // initializeWeb3 thunk (auto-reconnect)
					'gnusDao/initialize/fulfilled', // initializeGnusDao thunk
				],
				// Ignore non-serializable values in action payloads
				ignoredActionsPaths: ['payload.provider', 'payload.signer', 'payload.connector'],
				// Ignore non-serializable values in Redux state
				ignoredPaths: [
					'web3.provider',
					'web3.signer',
					'wallet.provider',
					'wallet.signer',
					'wallet.connector',
				],
			},
		}),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
