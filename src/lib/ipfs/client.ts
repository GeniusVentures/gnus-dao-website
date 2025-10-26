/**
 * IPFS Client-Side Service
 * Client-only version of IPFS service to avoid SSR issues
 */

'use client';

import type {
	IPFSUploadResult,
	IPFSUploadOptions,
	IPFSRetrievalOptions,
	IPFSPinStatus,
	ProposalMetadata,
} from './types';
import { getIPFSConfig, getIPFSUrl } from './config';
import {
	validateFile,
	createIPFSError,
	isValidIPFSHash,
	retryWithBackoff,
	withTimeout,
	sanitizeFilename,
	generateUniqueFilename,
} from './utils';

class ClientIPFSService {
	private config = getIPFSConfig();
	private initialized = false;

	constructor() {
		// Only initialize on client side
		if (typeof window !== 'undefined') {
			this.initialize();
		}
	}

	private async initialize(): Promise<void> {
		this.initialized = true;
	}

	/**
	 * Upload file using Pinata API directly from client
	 */
	async uploadFile(file: File, options: IPFSUploadOptions = {}): Promise<IPFSUploadResult> {
		if (typeof window === 'undefined') {
			throw createIPFSError(
				'IPFS upload only available on client side',
				'UPLOAD_ERROR',
				'SSR_ERROR',
			);
		}

		// Validate file
		const validation = validateFile(file);
		if (!validation.valid) {
			throw createIPFSError(validation.error!, 'VALIDATION_ERROR', 'INVALID_FILE');
		}

		const { pin = true, metadata = {}, onProgress } = options;

		try {
			onProgress?.(10); // Starting upload

			// Use Pinata API directly
			if (this.config.pinataJWT) {
				return await this.uploadWithPinataAPI(file, { pin, metadata, onProgress });
			}

			throw createIPFSError(
				'No IPFS upload service configured. Please set NEXT_PUBLIC_PINATA_JWT.',
				'UPLOAD_ERROR',
				'NO_SERVICE',
			);
		} catch (error) {
			if (error instanceof Error && (error as any).type) {
				throw error;
			}
			throw createIPFSError(
				`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'UPLOAD_ERROR',
				'UPLOAD_FAILED',
				error,
			);
		}
	}

	/**
	 * Upload proposal metadata to IPFS
	 */
	async uploadProposalMetadata(metadata: ProposalMetadata): Promise<IPFSUploadResult> {
		try {
			const metadataJson = JSON.stringify(metadata, null, 2);
			const blob = new Blob([metadataJson], { type: 'application/json' });
			const file = new File([blob], 'proposal-metadata.json', { type: 'application/json' });

			return await this.uploadFile(file, {
				pin: true,
				metadata: {
					name: `Proposal: ${metadata.title}`,
					keyvalues: {
						type: 'proposal-metadata',
						title: metadata.title,
						category: metadata.category,
						author: metadata.author,
						version: metadata.version,
					},
				},
			});
		} catch (error) {
			throw createIPFSError(
				`Failed to upload proposal metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'UPLOAD_ERROR',
				'METADATA_UPLOAD_FAILED',
				error,
			);
		}
	}

	/**
	 * Retrieve content from IPFS
	 */
	async retrieveContent(hash: string, options: IPFSRetrievalOptions = {}): Promise<string> {
		if (!isValidIPFSHash(hash)) {
			throw createIPFSError('Invalid IPFS hash format', 'VALIDATION_ERROR', 'INVALID_HASH');
		}

		const { timeout = 10000, preferredGateway, fallbackToOtherGateways = true } = options;

		try {
			// Try preferred gateway first
			const gateway = preferredGateway || this.config.gateways.primary;
			const url = getIPFSUrl(hash, gateway);

			return await retryWithBackoff(async () => {
				const response = await withTimeout(fetch(url), timeout);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				return await response.text();
			});
		} catch (error) {
			// Try fallback gateways if enabled
			if (fallbackToOtherGateways) {
				for (const fallbackGateway of this.config.gateways.fallbacks) {
					try {
						const url = getIPFSUrl(hash, fallbackGateway);
						const response = await withTimeout(fetch(url), timeout);

						if (response.ok) {
							return await response.text();
						}
					} catch {
						// Continue to next fallback
					}
				}
			}

			throw createIPFSError(
				`Failed to retrieve content from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'RETRIEVAL_ERROR',
				'RETRIEVAL_FAILED',
				error,
			);
		}
	}

	/**
	 * Retrieve proposal metadata from IPFS
	 */
	async retrieveProposalMetadata(hash: string): Promise<ProposalMetadata> {
		try {
			const content = await this.retrieveContent(hash);
			const metadata = JSON.parse(content) as ProposalMetadata;

			// Validate required fields
			if (!metadata.title || !metadata.description || !metadata.author) {
				throw new Error('Invalid proposal metadata: missing required fields');
			}

			return metadata;
		} catch (error) {
			throw createIPFSError(
				`Failed to retrieve proposal metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'RETRIEVAL_ERROR',
				'METADATA_RETRIEVAL_FAILED',
				error,
			);
		}
	}

	/**
	 * Pin content using Pinata API
	 */
	async pinContent(hash: string): Promise<IPFSPinStatus> {
		if (!isValidIPFSHash(hash)) {
			throw createIPFSError('Invalid IPFS hash format', 'VALIDATION_ERROR', 'INVALID_HASH');
		}

		try {
			if (!this.config.pinataJWT) {
				throw createIPFSError('Pinata JWT not configured', 'PIN_ERROR', 'NO_CREDENTIALS');
			}

			const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.config.pinataJWT}`,
				},
				body: JSON.stringify({
					hashToPin: hash,
				}),
			});

			if (!response.ok) {
				throw new Error(`Pinata API error: ${response.statusText}`);
			}

			return {
				hash,
				pinned: true,
				pinDate: new Date().toISOString(),
			};
		} catch (error) {
			throw createIPFSError(
				`Failed to pin content: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'PIN_ERROR',
				'PIN_FAILED',
				error,
			);
		}
	}

	/**
	 * Upload with Pinata API directly
	 */
	private async uploadWithPinataAPI(
		file: File,
		options: IPFSUploadOptions,
	): Promise<IPFSUploadResult> {
		const { metadata = {}, onProgress } = options;

		try {
			onProgress?.(30); // Preparing for Pinata upload

			const sanitizedName = sanitizeFilename(file.name);
			const uniqueName = generateUniqueFilename(sanitizedName);

			const formData = new FormData();
			formData.append('file', file);

			const pinataMetadata = {
				name: uniqueName,
				...metadata,
			};
			formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

			onProgress?.(60); // Uploading

			const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.config.pinataJWT}`,
				},
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`Pinata API error: ${response.statusText}`);
			}

			const result = await response.json();
			onProgress?.(100); // Upload complete

			return {
				hash: result.IpfsHash,
				name: uniqueName,
				size: file.size,
				url: getIPFSUrl(result.IpfsHash),
			};
		} catch (error) {
			throw createIPFSError(
				`Pinata upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'UPLOAD_ERROR',
				'PINATA_FAILED',
				error,
			);
		}
	}

	/**
	 * Check if service is properly configured
	 */
	isConfigured(): boolean {
		return !!this.config.pinataJWT;
	}

	/**
	 * Get service status
	 */
	getStatus() {
		return {
			initialized: this.initialized,
			hasPinata: !!this.config.pinataJWT,
			hasIPFSClient: false, // Not available in client-only version
			configured: this.isConfigured(),
		};
	}
}

// Export singleton instance
export const clientIPFSService = new ClientIPFSService();
export default clientIPFSService;
