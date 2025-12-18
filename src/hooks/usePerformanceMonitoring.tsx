/**
 * React Hook for Performance Monitoring
 * Provides easy-to-use performance tracking for React components
 */

import { useEffect, useCallback, useRef } from 'react';
import {
	recordPerformanceMetric,
	measureAsyncExecutionTime,
	startPerformanceTimer,
	getPerformanceSummary,
	PerformanceTimer,
} from '@/lib/utils/performance';

/**
 * Hook for component render time tracking
 */
export function useRenderTimeTracking(componentName: string) {
	const renderStartTime = useRef<number>(0);

	useEffect(() => {
		renderStartTime.current = performance.now();
	});

	useEffect(() => {
		const renderTime = performance.now() - renderStartTime.current;
		recordPerformanceMetric(`component_render_${componentName}`, renderTime, 'ms', {
			component: componentName,
		});
	});
}

/**
 * Hook for tracking component mount/unmount performance
 */
export function useComponentLifecycleTracking(componentName: string) {
	const mountStartTime = useRef<number>(0);

	useEffect(() => {
		// Track mount time
		mountStartTime.current = performance.now();
		
		return () => {
			// Track unmount time
			const unmountTime = performance.now() - mountStartTime.current;
			recordPerformanceMetric(`component_lifecycle_${componentName}`, unmountTime, 'ms', {
				component: componentName,
				lifecycle: 'unmount',
			});
		};
	}, [componentName]);

	useEffect(() => {
		// Record mount completion
		const mountTime = performance.now() - mountStartTime.current;
		recordPerformanceMetric(`component_mount_${componentName}`, mountTime, 'ms', {
			component: componentName,
			lifecycle: 'mount',
		});
	}, [componentName]);
}

/**
 * Hook for tracking API call performance
 */
export function useApiPerformanceTracking() {
	const trackApiCall = useCallback(async <T,>(
		endpoint: string,
		apiCall: () => Promise<T>,
		context?: Record<string, any>
	): Promise<T> => {
		return measureAsyncExecutionTime(
			`api_call_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
			apiCall,
			{
				endpoint,
				...context,
			}
		);
	}, []);

	return { trackApiCall };
}

/**
 * Hook for tracking user interaction performance
 */
export function useInteractionTracking() {
	const trackInteraction = useCallback((
		interactionName: string,
		callback: () => void | Promise<void>,
		context?: Record<string, any>
	) => {
		const timer = startPerformanceTimer(`interaction_${interactionName}`, {
			interaction: interactionName,
			...context,
		});

		const result = callback();
		
		if (result instanceof Promise) {
			return result.finally(() => timer.end());
		} else {
			timer.end();
			return result;
		}
	}, []);

	return { trackInteraction };
}

/**
 * Hook for tracking form performance
 */
export function useFormPerformanceTracking(formName: string) {
	const formStartTime = useRef<number>(0);
	const fieldInteractions = useRef<number>(0);

	const startFormTracking = useCallback(() => {
		formStartTime.current = performance.now();
		fieldInteractions.current = 0;
	}, []);

	const trackFieldInteraction = useCallback(() => {
		fieldInteractions.current += 1;
	}, []);

	const trackFormSubmission = useCallback((success: boolean, context?: Record<string, any>) => {
		const formDuration = performance.now() - formStartTime.current;
		
		recordPerformanceMetric(`form_completion_${formName}`, formDuration, 'ms', {
			formName,
			success,
			fieldInteractions: fieldInteractions.current,
			...context,
		});
	}, [formName]);

	return {
		startFormTracking,
		trackFieldInteraction,
		trackFormSubmission,
	};
}

/**
 * Hook for tracking Web3 operation performance
 */
export function useWeb3PerformanceTracking() {
	const trackWalletConnection = useCallback(async <T,>(
		walletType: string,
		connectionCall: () => Promise<T>
	): Promise<T> => {
		return measureAsyncExecutionTime(
			'wallet_connection',
			connectionCall,
			{ walletType }
		);
	}, []);

	const trackContractInteraction = useCallback(async <T,>(
		contractName: string,
		method: string,
		interaction: () => Promise<T>
	): Promise<T> => {
		return measureAsyncExecutionTime(
			'contract_interaction',
			interaction,
			{ contractName, method }
		);
	}, []);

	const trackTransactionSigning = useCallback(async <T,>(
		transactionType: string,
		signingCall: () => Promise<T>
	): Promise<T> => {
		return measureAsyncExecutionTime(
			'transaction_signing',
			signingCall,
			{ transactionType }
		);
	}, []);

	return {
		trackWalletConnection,
		trackContractInteraction,
		trackTransactionSigning,
	};
}

/**
 * Hook for tracking IPFS operation performance
 */
export function useIPFSPerformanceTracking() {
	const trackIPFSUpload = useCallback(async <T,>(
		fileSize: number,
		uploadCall: () => Promise<T>
	): Promise<T> => {
		return measureAsyncExecutionTime(
			'ipfs_upload',
			uploadCall,
			{ fileSize }
		);
	}, []);

	const trackIPFSDownload = useCallback(async <T,>(
		hash: string,
		downloadCall: () => Promise<T>
	): Promise<T> => {
		return measureAsyncExecutionTime(
			'ipfs_download',
			downloadCall,
			{ hash }
		);
	}, []);

	return {
		trackIPFSUpload,
		trackIPFSDownload,
	};
}

/**
 * Hook for getting performance summary
 */
export function usePerformanceSummary() {
	const getPerformanceData = useCallback(() => {
		return getPerformanceSummary();
	}, []);

	return { getPerformanceData };
}

/**
 * Hook for tracking page performance
 */
export function usePagePerformanceTracking(pageName: string) {
	const pageStartTime = useRef<number>(0);

	useEffect(() => {
		pageStartTime.current = performance.now();

		// Track page visibility changes
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				const timeOnPage = performance.now() - pageStartTime.current;
				recordPerformanceMetric(`page_time_${pageName}`, timeOnPage, 'ms', {
					pageName,
					visibilityState: 'hidden',
				});
			} else if (document.visibilityState === 'visible') {
				pageStartTime.current = performance.now();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			
			// Track final page time
			const totalTimeOnPage = performance.now() - pageStartTime.current;
			recordPerformanceMetric(`page_total_time_${pageName}`, totalTimeOnPage, 'ms', {
				pageName,
				event: 'unmount',
			});
		};
	}, [pageName]);
}

/**
 * Hook for tracking search performance
 */
export function useSearchPerformanceTracking() {
	const trackSearch = useCallback(async <T,>(
		searchTerm: string,
		searchCall: () => Promise<T>
	): Promise<T> => {
		return measureAsyncExecutionTime(
			'search_operation',
			searchCall,
			{
				searchTerm: searchTerm.length > 50 ? `${searchTerm.substring(0, 50)}...` : searchTerm,
				searchLength: searchTerm.length,
			}
		);
	}, []);

	return { trackSearch };
}

/**
 * Hook for tracking modal/dialog performance
 */
export function useModalPerformanceTracking(modalName: string) {
	const modalOpenTime = useRef<number>(0);

	const trackModalOpen = useCallback(() => {
		modalOpenTime.current = performance.now();
	}, []);

	const trackModalClose = useCallback((action: 'submit' | 'cancel' | 'close') => {
		const modalDuration = performance.now() - modalOpenTime.current;
		recordPerformanceMetric(`modal_duration_${modalName}`, modalDuration, 'ms', {
			modalName,
			closeAction: action,
		});
	}, [modalName]);

	return {
		trackModalOpen,
		trackModalClose,
	};
}