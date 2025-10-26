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
				// Ignore these action types
				ignoredActions: [
					'web3/setProvider',
					'web3/setSigner',
					'wallet/connectWallet/fulfilled',
					'wallet/setProvider',
					'wallet/setSigner',
				],
				// Ignore these field paths in all actions
				ignoredActionsPaths: ['payload.provider', 'payload.signer'],
				// Ignore these paths in the state
				ignoredPaths: ['web3.provider', 'web3.signer', 'wallet.provider', 'wallet.signer'],
			},
		}),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
