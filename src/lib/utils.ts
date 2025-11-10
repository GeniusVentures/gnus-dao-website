import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number | string, decimals = 2): string {
	const number = typeof num === 'string' ? parseFloat(num) : num;
	if (isNaN(number)) return '0';

	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: decimals,
	}).format(number);
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatCompactNumber(num: number | string): string {
	const number = typeof num === 'string' ? parseFloat(num) : num;
	if (isNaN(number)) return '0';

	return new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(number);
}

/**
 * Format an Ethereum address
 */
export function formatAddress(address: string, chars = 4): string {
	if (!address) return '';
	return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a transaction hash
 */
export function formatTxHash(hash: string, chars = 6): string {
	if (!hash) return '';
	return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

/**
 * Format a token amount
 */
export function formatTokenAmount(
	amount: string | number | bigint,
	decimals = 18,
	displayDecimals = 4,
): string {
	try {
		let value: number;

		if (typeof amount === 'bigint') {
			value = Number(amount) / Math.pow(10, decimals);
		} else if (typeof amount === 'string') {
			value = parseFloat(amount);
		} else {
			value = amount;
		}

		if (isNaN(value)) return '0';

		// For very small numbers, show more decimals
		if (value < 0.0001 && value > 0) {
			return value.toExponential(2);
		}

		return formatNumber(value, displayDecimals);
	} catch {
		return '0';
	}
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number, decimals = 2): string {
	return `${formatNumber(value, decimals)}%`;
}

/**
 * Format a duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (days > 0) {
		return `${days}d ${hours}h`;
	} else if (hours > 0) {
		return `${hours}h ${minutes}m`;
	} else {
		return `${minutes}m`;
	}
}

/**
 * Format a timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days} day${days > 1 ? 's' : ''} ago`;
	} else if (hours > 0) {
		return `${hours} hour${hours > 1 ? 's' : ''} ago`;
	} else if (minutes > 0) {
		return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
	} else {
		return 'Just now';
	}
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// Fallback for older browsers
		try {
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			textArea.style.top = '-999999px';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			const result = document.execCommand('copy');
			document.body.removeChild(textArea);
			return result;
		} catch {
			return false;
		}
	}
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
	func: T,
	limit: number,
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Generate a random ID using cryptographically secure random values
 */
export function generateId(length = 8): string {
	// Use crypto.randomUUID() if available and length allows
	if (typeof crypto !== 'undefined' && crypto.randomUUID && length >= 8) {
		return crypto.randomUUID().replace(/-/g, '').substring(0, length);
	}

	// Use crypto.getRandomValues for secure random generation
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const randomValues = new Uint8Array(length);
		crypto.getRandomValues(randomValues);
		let result = '';
		for (let i = 0; i < length; i++) {
			result += chars.charAt(randomValues[i]! % chars.length);
		}
		return result;
	}

	// Fallback for environments without crypto API
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if a string is a valid transaction hash
 */
export function isValidTxHash(hash: string): boolean {
	return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return 'An unknown error occurred';
}
