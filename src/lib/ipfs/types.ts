/**
 * IPFS Types and Interfaces
 * Defines TypeScript interfaces for IPFS operations and metadata
 */

export interface IPFSFile {
	name: string;
	content: Uint8Array | string;
	path?: string;
}

export interface IPFSUploadResult {
	hash: string;
	name: string;
	size: number;
	url: string;
}

export interface IPFSUploadOptions {
	pin?: boolean;
	wrapWithDirectory?: boolean;
	metadata?: Record<string, unknown>;
	onProgress?: (progress: number) => void;
}

export interface ProposalMetadata {
	title: string;
	description: string;
	category: 'treasury' | 'protocol' | 'governance' | 'community';
	author: string;
	created: number;
	version: string;
	attachments?: IPFSUploadResult[];
	tags?: string[];
	discussionUrl?: string;
	votingPeriod?: {
		start: number;
		end: number;
	};
	executionDelay?: number;
}

export interface IPFSPinStatus {
	hash: string;
	pinned: boolean;
	pinDate?: string;
	size?: number;
}

export interface IPFSGatewayConfig {
	primary: string;
	fallbacks: string[];
	timeout: number;
}

export interface IPFSServiceConfig {
	pinataApiKey?: string;
	pinataSecretKey?: string;
	pinataJWT?: string;
	ipfsApiUrl?: string;
	ipfsApiKey?: string;
	ipfsApiSecret?: string;
	gateways: IPFSGatewayConfig;
	maxFileSize: number;
	allowedTypes: string[];
	pinToCluster: boolean;
}

export interface IPFSError extends Error {
	code?: string;
	type:
		| 'UPLOAD_ERROR'
		| 'RETRIEVAL_ERROR'
		| 'PIN_ERROR'
		| 'VALIDATION_ERROR'
		| 'NETWORK_ERROR';
	details?: Record<string, unknown>;
}

export interface IPFSRetrievalOptions {
	timeout?: number;
	preferredGateway?: string;
	fallbackToOtherGateways?: boolean;
}

export interface IPFSListResult {
	hash: string;
	name: string;
	size: number;
	type: 'file' | 'directory';
	links?: IPFSListResult[];
}

// Utility type for file validation
export interface FileValidationResult {
	valid: boolean;
	error?: string;
	size?: number;
	type?: string;
}

// Progress tracking for uploads
export interface UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
	stage: 'preparing' | 'uploading' | 'pinning' | 'complete';
}
