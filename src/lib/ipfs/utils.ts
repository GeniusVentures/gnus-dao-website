/**
 * IPFS Utility Functions
 * Helper functions for file validation, formatting, and IPFS operations
 */

import { getIPFSConfig } from './config';
import { FileValidationResult, IPFSError } from './types';

/**
 * Validate file before upload
 */
export function validateFile(file: File): FileValidationResult {
	const config = getIPFSConfig();

	// Check file size
	if (file.size > config.maxFileSize) {
		return {
			valid: false,
			error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(config.maxFileSize)})`,
		};
	}

	// Check file type
	const isAllowedType = config.allowedTypes.some((allowedType) => {
		if (allowedType.endsWith('/*')) {
			const category = allowedType.slice(0, -2);
			return file.type.startsWith(category);
		}
		return file.type === allowedType;
	});

	if (!isAllowedType) {
		return {
			valid: false,
			error: `File type "${file.type}" is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`,
		};
	}

	return {
		valid: true,
		size: file.size,
		type: file.type,
	};
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Convert File to Uint8Array
 */
export async function fileToUint8Array(file: File): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => {
			if (reader.result instanceof ArrayBuffer) {
				resolve(new Uint8Array(reader.result));
			} else {
				reject(new Error('Failed to read file as ArrayBuffer'));
			}
		};

		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsArrayBuffer(file);
	});
}

/**
 * Create IPFS error with proper typing
 */
export function createIPFSError(
	message: string,
	type: IPFSError['type'],
	code?: string,
	details?: Record<string, unknown>,
): IPFSError {
	const error = new Error(message) as IPFSError;
	error.type = type;
	error.code = code;
	error.details = details;
	return error;
}

/**
 * Validate IPFS hash format
 */
export function isValidIPFSHash(hash: string): boolean {
	// Basic validation for IPFS hash formats
	// CIDv0: starts with Qm, 46 characters
	// CIDv1: starts with b, z, f, etc., variable length

	if (!hash || typeof hash !== 'string') return false;

	// Remove any /ipfs/ prefix
	const cleanHash = hash.replace(/^\/ipfs\//, '');

	// CIDv0 format
	if (cleanHash.startsWith('Qm') && cleanHash.length === 46) {
		return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cleanHash);
	}

	// CIDv1 format (basic check)
	if (cleanHash.length > 10 && /^[a-zA-Z0-9]+$/.test(cleanHash)) {
		return true;
	}

	return false;
}

/**
 * Extract IPFS hash from URL
 */
export function extractIPFSHash(url: string): string | null {
	try {
		// Handle various IPFS URL formats
		const patterns = [
			/\/ipfs\/([a-zA-Z0-9]+)/,
			/^ipfs:\/\/([a-zA-Z0-9]+)/,
			/^([a-zA-Z0-9]+)$/,
		];

		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match?.[1] && isValidIPFSHash(match[1])) {
				return match[1];
			}
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFilename(originalName: string): string {
	const timestamp = Date.now();
	// Use crypto.randomUUID() for secure random string generation
	const random =
		typeof crypto !== 'undefined' && crypto.randomUUID
			? crypto.randomUUID().substring(0, 8)
			: Math.random().toString(36).substring(2, 8);
	
	// Check if file has extension
	const lastDotIndex = originalName.lastIndexOf('.');
	if (lastDotIndex === -1) {
		// No extension, append the original name as extension
		return `${originalName}_${timestamp}_${random}.${originalName}`;
	}
	
	const extension = originalName.substring(lastDotIndex + 1);
	const nameWithoutExt = originalName.substring(0, lastDotIndex);

	return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	baseDelay: number = 1000,
): Promise<T> {
	let lastError: Error;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			if (attempt === maxRetries) {
				throw lastError;
			}

			const delay = baseDelay * Math.pow(2, attempt);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError!;
}

/**
 * Create a timeout promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => {
			setTimeout(
				() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
				timeoutMs,
			);
		}),
	]);
}

/**
 * Sanitize filename for IPFS
 */
export function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[^a-zA-Z0-9.-]/g, '_')
		.replace(/_{2,}/g, '_')
		.replace(/^_|_$/g, '')
		.toLowerCase();
}
