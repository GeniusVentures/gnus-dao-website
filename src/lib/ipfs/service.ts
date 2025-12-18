/**
 * IPFS Service
 * Main service for IPFS operations including upload, retrieval, and pinning
 */

import { PinataSDK } from 'pinata-web3';
// Import helia types conditionally to avoid issues in test environments
type Helia = any;
type UnixFS = any;
import { getIPFSConfig, getIPFSUrl, validateIPFSConfig } from './config';
import {
	IPFSError,
	IPFSPinStatus,
	IPFSRetrievalOptions,
	IPFSUploadOptions,
	IPFSUploadResult,
	ProposalMetadata,
} from './types';
import {
	createIPFSError,
	fileToUint8Array,
	isValidIPFSHash,
	retryWithBackoff,
	sanitizeFilename,
	validateFile,
	withTimeout,
} from './utils';

class IPFSService {
	private config = getIPFSConfig();
	private pinata?: PinataSDK;
	private helia?: Helia;
	private fs?: UnixFS;
	private initialized = false;

	constructor() {
		this.initialize();
	}

	/**
	 * Initialize IPFS service with available providers
	 */
	private async initialize(): Promise<void> {
		try {
			const validation = validateIPFSConfig(this.config);
			if (!validation.valid) {
				console.warn('IPFS configuration issues:', validation.errors);
			}

			// Initialize Pinata if credentials are available
			if (this.config.pinataJWT) {
				this.pinata = new PinataSDK({
					pinataJwt: this.config.pinataJWT,
				});
			}
			// Note: pinata-web3 only supports JWT authentication,
			// API key + secret authentication is no longer supported

			// Initialize Helia IPFS client if URL is available
			if (this.config.ipfsApiUrl) {
				// Note: Helia doesn't support remote HTTP API connections like ipfs-http-client
				// For now, we'll create a local Helia node instead
				// In a production environment, you might want to use @helia/http for HTTP-only operations
				try {
					// Dynamic import with better error handling for test environments
					const heliaModule = await import('helia').catch(() => null);
					const unixfsModule = await import('@helia/unixfs').catch(() => null);
					
					if (heliaModule && unixfsModule) {
						this.helia = await heliaModule.createHelia();
						this.fs = unixfsModule.unixfs(this.helia);
					} else {
						console.warn('Helia modules not available, falling back to Pinata only');
					}
				} catch (error) {
					console.error('Failed to initialize Helia:', error);
					// Continue without Helia - will fall back to Pinata
				}
			}

			this.initialized = true;
		} catch (error) {
			console.error('Failed to initialize IPFS service:', error);
			throw createIPFSError(
				'Failed to initialize IPFS service',
				'NETWORK_ERROR',
				'INIT_FAILED',
				error as Record<string, unknown>,
			);
		}
	}

	/**
	 * Upload file to IPFS
	 */
	async uploadFile(file: File, options: IPFSUploadOptions = {}): Promise<IPFSUploadResult> {
		if (!this.initialized) {
			await this.initialize();
		}

		// Validate file
		const validation = validateFile(file);
		if (!validation.valid) {
			throw createIPFSError(validation.error!, 'VALIDATION_ERROR', 'INVALID_FILE');
		}

		const { pin = true, metadata = {}, onProgress } = options;

		try {
			onProgress?.(10); // Starting upload

			// Try Pinata first if available
			if (this.pinata) {
				return await this.uploadWithPinata();
			}

			// Fallback to Helia IPFS client
			if (this.helia && this.fs) {
				return await this.uploadWithIPFSClient(file, { pin, metadata, onProgress });
			}

			throw createIPFSError(
				'No IPFS upload service available',
				'UPLOAD_ERROR',
				'NO_SERVICE',
			);
		} catch (error) {
			if (error instanceof Error && (error as IPFSError).type) {
				throw error;
			}
			throw createIPFSError(
				`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'UPLOAD_ERROR',
				'UPLOAD_FAILED',
				error as Record<string, unknown>,
			);
		}
	}

	/**
	 * Upload multiple files to IPFS
	 */
	async uploadFiles(
		files: File[],
		options: IPFSUploadOptions = {},
	): Promise<IPFSUploadResult[]> {
		const results: IPFSUploadResult[] = [];
		const { onProgress } = options;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (!file) continue;

			const fileProgress = (progress: number) => {
				const totalProgress = (i * 100 + progress) / files.length;
				onProgress?.(totalProgress);
			};

			const result = await this.uploadFile(file, {
				...options,
				onProgress: fileProgress,
			});
			results.push(result);
		}

		return results;
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
				error as Record<string, unknown>,
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
				error as Record<string, unknown>,
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
				error as Record<string, unknown>,
			);
		}
	}

	/**
	 * Pin content to IPFS (placeholder - use client service for actual pinning)
	 */
	async pinContent(hash: string): Promise<IPFSPinStatus> {
		if (!isValidIPFSHash(hash)) {
			throw createIPFSError('Invalid IPFS hash format', 'VALIDATION_ERROR', 'INVALID_HASH');
		}

		// For server-side, we'll just return a success status
		// Actual pinning should be done client-side
		return {
			hash,
			pinned: true,
			pinDate: new Date().toISOString(),
		};
	}

	/**
	 * Upload with Pinata (placeholder - use client service for actual uploads)
	 */
	private async uploadWithPinata(): Promise<IPFSUploadResult> {
		// For server-side, we'll throw an error directing to use client service
		throw createIPFSError(
			'Server-side Pinata upload not available. Use client-side IPFS service.',
			'UPLOAD_ERROR',
			'USE_CLIENT_SERVICE',
		);
	}

	/**
	 * Upload file using Helia IPFS client
	 */
	private async uploadWithIPFSClient(
		file: File,
		options: IPFSUploadOptions,
	): Promise<IPFSUploadResult> {
		if (!this.helia || !this.fs) {
			throw createIPFSError('Helia client not initialized', 'UPLOAD_ERROR', 'NO_CLIENT');
		}

		const { pin = true, onProgress } = options;

		try {
			onProgress?.(30); // Preparing for IPFS upload

			const content = await fileToUint8Array(file);
			const sanitizedName = sanitizeFilename(file.name);

			onProgress?.(60); // Uploading to IPFS

			// Use Helia's UnixFS API to add the file
			const cid = await this.fs.addFile({
				path: sanitizedName,
				content: new Uint8Array(content),
			}, {
				onProgress: (evt: any) => {
					// Map Helia progress events to our progress callback
					// For now, we'll use a simple progress indication
					if (evt.type === 'unixfs:importer:progress:file:write') {
						onProgress?.(80);
					}
				}
			});

			onProgress?.(100); // Upload complete

			return {
				hash: cid.toString(),
				name: sanitizedName,
				size: file.size,
				url: getIPFSUrl(cid.toString()),
			};
		} catch (error) {
			throw createIPFSError(
				`Helia upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'UPLOAD_ERROR',
				'CLIENT_FAILED',
				error as Record<string, unknown>,
			);
		}
	}

	/**
	 * Check if service is properly configured
	 */
	isConfigured(): boolean {
		return !!(this.pinata || this.helia);
	}

	/**
	 * Get service status
	 */
	getStatus() {
		return {
			initialized: this.initialized,
			hasPinata: !!this.pinata,
			hasIPFSClient: !!this.helia,
			configured: this.isConfigured(),
		};
	}
}

// Export singleton instance
export const ipfsService = new IPFSService();
export default ipfsService;
