'use client';

/**
 * Secure IPFS Upload Service
 * Uses Cloudflare Workers to handle uploads without exposing API keys
 */

export interface UploadResult {
	success: boolean;
	ipfsHash?: string;
	pinSize?: number;
	timestamp?: string;
	error?: string;
}

export interface UploadMetadata {
	name?: string;
	keyvalues?: Record<string, string>;
}

export interface ProposalMetadataInput {
	title: string;
	description: string;
	actions?: Record<string, unknown>[];
	discussionUrl?: string;
}

export class SecureIPFSService {
	private static readonly API_BASE_URL =
		typeof window !== 'undefined'
			? window.location.origin
			: '';

	/**
	 * Upload file to IPFS using secure backend
	 */
	static async uploadFile(file: File, metadata?: UploadMetadata): Promise<UploadResult> {
		try {
			// Get auth token
			const token = localStorage.getItem('gnus-dao-auth-token');
			if (!token) {
				throw new Error('Authentication required for IPFS uploads');
			}

			// Create form data
			const formData = new FormData();
			formData.append('file', file);

			if (metadata) {
				formData.append('metadata', JSON.stringify(metadata));
			}

			// Upload via secure backend
			const response = await fetch(`${this.API_BASE_URL}/api/ipfs/upload`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Upload failed');
			}

			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Secure IPFS upload failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Upload failed',
			};
		}
	}

	/**
	 * Upload JSON data to IPFS
	 */
	static async uploadJSON(
		data: Record<string, unknown>,
		metadata?: UploadMetadata,
	): Promise<UploadResult> {
		try {
			// Convert JSON to Blob
			const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
				type: 'application/json',
			});

			// Create File from Blob
			const file = new File([jsonBlob], metadata?.name || 'data.json', {
				type: 'application/json',
			});

			return await this.uploadFile(file, metadata);
		} catch (error) {
			console.error('JSON upload failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Upload failed',
			};
		}
	}

	/**
	 * Get IPFS gateway URL for a hash
	 */
	static getGatewayUrl(ipfsHash: string, useBackup = false): string {
		const gateway = useBackup
			? 'https://gateway.pinata.cloud/ipfs/'
			: 'https://ipfs.io/ipfs/';

		return `${gateway}${ipfsHash}`;
	}

	/**
	 * Fetch content from IPFS
	 */
	static async fetchFromIPFS(ipfsHash: string): Promise<any> {
		try {
			// Try primary gateway first
			let response = await fetch(this.getGatewayUrl(ipfsHash), {
				signal: AbortSignal.timeout(10000), // 10 second timeout
			});

			// If primary fails, try backup
			if (!response.ok) {
				response = await fetch(this.getGatewayUrl(ipfsHash, true), {
					signal: AbortSignal.timeout(10000),
				});
			}

			if (!response.ok) {
				throw new Error('Failed to fetch from IPFS');
			}

			const contentType = response.headers.get('content-type');
			if (contentType?.includes('application/json')) {
				return await response.json();
			} else {
				return await response.text();
			}
		} catch (error) {
			console.error('IPFS fetch failed:', error);
			throw error;
		}
	}

	/**
	 * Validate file before upload
	 */
	static validateFile(
		file: File,
		maxSize = 10 * 1024 * 1024, // 10MB default
		allowedTypes?: string[],
	): { valid: boolean; error?: string } {
		// Check file size
		if (file.size > maxSize) {
			return {
				valid: false,
				error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
			};
		}

		// Check file type if specified
		if (allowedTypes && allowedTypes.length > 0) {
			const isAllowed = allowedTypes.some((type) => {
				if (type.endsWith('/*')) {
					const baseType = type.split('/')[0];
					return file.type.startsWith(baseType + '/');
				}
				return file.type === type;
			});

			if (!isAllowed) {
				return {
					valid: false,
					error: `File type ${file.type} is not allowed`,
				};
			}
		}

		return { valid: true };
	}

	/**
	 * Upload proposal metadata
	 */
	static async uploadProposalMetadata(
		metadata: ProposalMetadataInput,
	): Promise<UploadResult> {
		return await this.uploadJSON(metadata as unknown as Record<string, unknown>, {
			name: `proposal-${Date.now()}.json`,
			keyvalues: {
				type: 'proposal',
				timestamp: new Date().toISOString(),
			},
		});
	}

	/**
	 * Upload proposal attachment
	 */
	static async uploadProposalAttachment(
		file: File,
		proposalId?: string,
	): Promise<UploadResult> {
		// Validate file
		const validation = this.validateFile(file, 10 * 1024 * 1024, [
			'image/*',
			'application/pdf',
			'text/plain',
			'application/json',
		]);

		if (!validation.valid) {
			return {
				success: false,
				error: validation.error,
			};
		}

		return await this.uploadFile(file, {
			name: file.name,
			keyvalues: {
				type: 'proposal-attachment',
				proposalId: proposalId || 'unknown',
				timestamp: new Date().toISOString(),
			},
		});
	}
}
