/**
 * Global type declarations for the GNUS DAO application
 */

declare global {
	interface Window {
		__RUNTIME_ENV_LOADED__?: boolean;
		__WALLETCONNECT_PROJECT_ID__?: string;
		__RUNTIME_ENV__?: Record<string, unknown>;
		__RUNTIME_ENV_ERROR__?: string;
	}
}

export {};
