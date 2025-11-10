'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3Store } from '@/lib/web3/reduxProvider';
import { useSiwe } from './useSiwe';
import { toast } from 'react-hot-toast';

/**
 * Enhanced wallet hook with automatic SIWE authentication
 * Combines wallet connection with Sign-In with Ethereum
 */
export function useAuthenticatedWallet() {
	const { wallet, signer, currentNetwork, disconnect } = useWeb3Store();
	const {
		isAuthenticated,
		isAuthenticating,
		session,
		error: authError,
		signIn,
		signOut,
		needsAuthentication,
		canAuthenticate,
	} = useSiwe();

	const [isConnecting, setIsConnecting] = useState(false);
	const [autoAuthEnabled, setAutoAuthEnabled] = useState(true);

	/**
	 * Automatically authenticate when wallet connects
	 */
	useEffect(() => {
		const autoAuthenticate = async () => {
			if (
				wallet.isConnected &&
				!isAuthenticated &&
				!isAuthenticating &&
				autoAuthEnabled &&
				canAuthenticate()
			) {
				try {
					console.log('[AuthWallet] Auto-authenticating with SIWE...');
					await signIn();
					toast.success('Authenticated with Ethereum!');
				} catch (error) {
					console.error('[AuthWallet] Auto-authentication failed:', error);
					// Don't show error toast for auto-auth failures
					// User can manually trigger auth if needed
				}
			}
		};

		autoAuthenticate();
	}, [
		wallet.isConnected,
		isAuthenticated,
		isAuthenticating,
		autoAuthEnabled,
		canAuthenticate,
		signIn,
	]);

	/**
	 * Connect wallet and authenticate
	 */
	const connectAndAuthenticate = useCallback(async () => {
		setIsConnecting(true);
		try {
			// Wallet connection is handled by ConnectWalletButton
			// This function is for manual authentication trigger
			if (wallet.isConnected && !isAuthenticated) {
				await signIn();
				toast.success('Successfully authenticated!');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Authentication failed';
			toast.error(message);
			throw error;
		} finally {
			setIsConnecting(false);
		}
	}, [wallet.isConnected, isAuthenticated, signIn]);

	/**
	 * Disconnect wallet and clear authentication
	 */
	const disconnectAndSignOut = useCallback(async () => {
		try {
			signOut();
			await disconnect();
			toast.success('Disconnected successfully');
		} catch (error) {
			console.error('[AuthWallet] Disconnect failed:', error);
			toast.error('Failed to disconnect');
		}
	}, [disconnect, signOut]);

	/**
	 * Manually trigger authentication
	 */
	const authenticate = useCallback(async () => {
		if (!canAuthenticate()) {
			toast.error('Please connect your wallet first');
			return;
		}

		try {
			await signIn();
			toast.success('Successfully authenticated!');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Authentication failed';
			toast.error(message);
			throw error;
		}
	}, [canAuthenticate, signIn]);

	/**
	 * Check if user has full access (connected + authenticated)
	 */
	const hasFullAccess = wallet.isConnected && isAuthenticated;

	/**
	 * Check if authentication is required but missing
	 */
	const requiresAuth = wallet.isConnected && !isAuthenticated;

	return {
		// Wallet state
		wallet,
		signer,
		currentNetwork,

		// Authentication state
		isAuthenticated,
		isAuthenticating,
		session,
		authError,

		// Combined state
		hasFullAccess,
		requiresAuth,
		isConnecting,

		// Actions
		connectAndAuthenticate,
		disconnectAndSignOut,
		authenticate,

		// Settings
		autoAuthEnabled,
		setAutoAuthEnabled,

		// Utilities
		needsAuthentication,
		canAuthenticate,
	};
}

export type UseAuthenticatedWalletReturn = ReturnType<typeof useAuthenticatedWallet>;
