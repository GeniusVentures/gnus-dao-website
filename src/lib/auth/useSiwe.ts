'use client';

import { useWeb3Store } from '@/lib/web3/reduxProvider';
import { useCallback, useEffect, useState } from 'react';
import { SiweAuthService, type SiweAuthState } from './siwe';

export function useSiwe() {
	const { wallet, signer, currentNetwork } = useWeb3Store();

	const [authState, setAuthState] = useState<SiweAuthState>({
		isAuthenticated: false,
		session: null,
		isAuthenticating: false,
		error: null,
	});

	/**
	 * Initialize authentication state from stored session.
	 * Runs on mount and whenever wallet address or network changes.
	 * Also clears any expired sessions from localStorage on startup.
	 */
	useEffect(() => {
		const initializeAuth = () => {
			// Always call getSession() — it clears expired sessions from localStorage
			const session = SiweAuthService.getSession();

			if (session && wallet.address && currentNetwork) {
				const isValid = SiweAuthService.validateSessionForWallet(
					session,
					wallet.address,
					currentNetwork.id,
				);

				setAuthState({
					isAuthenticated: isValid,
					session: isValid ? session : null,
					isAuthenticating: false,
					error: isValid ? null : 'Session invalid for current wallet',
				});

				if (!isValid) {
					SiweAuthService.clearSession();
				}
			} else {
				// No valid session or wallet not connected — ensure clean state
				if (!session) {
					// getSession() already cleared it if expired
				}
				setAuthState({
					isAuthenticated: false,
					session: null,
					isAuthenticating: false,
					error: null,
				});
			}
		};

		initializeAuth();
	}, [wallet.address, currentNetwork?.id]);

	/**
	 * Sign in with Ethereum
	 */
	const signIn = useCallback(async (): Promise<void> => {
		if (!signer || !wallet.address || !currentNetwork) {
			throw new Error('Wallet not connected');
		}

		setAuthState((prev) => ({
			...prev,
			isAuthenticating: true,
			error: null,
		}));

		try {
			const session = await SiweAuthService.signIn(
				signer,
				wallet.address,
				currentNetwork.id,
			);

			setAuthState({
				isAuthenticated: true,
				session,
				isAuthenticating: false,
				error: null,
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

			setAuthState((prev) => ({
				...prev,
				isAuthenticating: false,
				error: errorMessage,
			}));

			throw error;
		}
	}, [signer, wallet.address, currentNetwork]);

	/**
	 * Sign out and clear session
	 */
	const signOut = useCallback((): void => {
		SiweAuthService.signOut();
		setAuthState({
			isAuthenticated: false,
			session: null,
			isAuthenticating: false,
			error: null,
		});
	}, []);

	/**
	 * Refresh session if needed
	 */
	const refreshSession = useCallback(async (): Promise<void> => {
		if (!signer || !wallet.address || !currentNetwork) {
			return;
		}

		try {
			const refreshedSession = await SiweAuthService.refreshSessionIfNeeded(
				signer,
				wallet.address,
				currentNetwork.id,
			);

			if (refreshedSession) {
				setAuthState((prev) => ({
					...prev,
					session: refreshedSession,
					isAuthenticated: true,
					error: null,
				}));
			}
		} catch (error) {
			console.error('Failed to refresh session:', error);
			signOut();
		}
	}, [signer, wallet.address, currentNetwork, signOut]);

	/**
	 * Clear authentication error
	 */
	const clearError = useCallback((): void => {
		setAuthState((prev) => ({
			...prev,
			error: null,
		}));
	}, []);

	/**
	 * Get session info for display
	 */
	const getSessionInfo = useCallback(() => {
		return SiweAuthService.getSessionInfo(authState.session);
	}, [authState.session]);

	/**
	 * Create authentication challenge for API calls
	 */
	const createAuthChallenge = useCallback((): string | null => {
		if (!authState.session) return null;
		return SiweAuthService.createAuthChallenge(authState.session);
	}, [authState.session]);

	/**
	 * Check if user needs to authenticate
	 */
	const needsAuthentication = useCallback((): boolean => {
		return wallet.isConnected && !authState.isAuthenticated;
	}, [wallet.isConnected, authState.isAuthenticated]);

	/**
	 * Check if authentication is available
	 */
	const canAuthenticate = useCallback((): boolean => {
		return wallet.isConnected && !!signer && !!currentNetwork;
	}, [wallet.isConnected, signer, currentNetwork]);

	// Auto-refresh session periodically
	useEffect(() => {
		if (!authState.isAuthenticated || !authState.session) return;

		const interval = setInterval(
			() => {
				refreshSession();
			},
			30 * 60 * 1000,
		); // Check every 30 minutes

		return () => clearInterval(interval);
	}, [authState.isAuthenticated, authState.session, refreshSession]);

	// Clear auth state when wallet disconnects
	useEffect(() => {
		if (!wallet.isConnected) {
			signOut();
		}
	}, [wallet.isConnected, signOut]);

	return {
		// State
		isAuthenticated: authState.isAuthenticated,
		session: authState.session,
		isAuthenticating: authState.isAuthenticating,
		error: authState.error,

		// Actions
		signIn,
		signOut,
		refreshSession,
		clearError,

		// Utilities
		getSessionInfo,
		createAuthChallenge,
		needsAuthentication,
		canAuthenticate,

		// Computed values
		sessionInfo: getSessionInfo(),
		authChallenge: createAuthChallenge(),
	};
}

export type UseSiweReturn = ReturnType<typeof useSiwe>;
