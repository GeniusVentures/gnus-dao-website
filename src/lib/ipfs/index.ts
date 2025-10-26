/**
 * IPFS Module
 * Main exports for IPFS functionality
 */

// Main service (client-side only to avoid SSR issues)
export { default as ipfsService } from './client';

// Types
export type {
	IPFSFile,
	IPFSUploadResult,
	IPFSUploadOptions,
	ProposalMetadata,
	IPFSPinStatus,
	IPFSGatewayConfig,
	IPFSServiceConfig,
	IPFSError,
	IPFSRetrievalOptions,
	IPFSListResult,
	FileValidationResult,
	UploadProgress,
} from './types';

// Configuration
export {
	getIPFSConfig,
	validateIPFSConfig,
	getIPFSUrl,
	isIPFSConfigured,
	DEFAULT_IPFS_GATEWAYS,
	DEFAULT_MAX_FILE_SIZE,
	DEFAULT_ALLOWED_TYPES,
} from './config';

// Utilities
export {
	validateFile,
	formatFileSize,
	fileToUint8Array,
	createIPFSError,
	isValidIPFSHash,
	extractIPFSHash,
	generateUniqueFilename,
	retryWithBackoff,
	withTimeout,
	sanitizeFilename,
} from './utils';
