/**
 * Input Validation Utilities
 * Provides comprehensive validation for user inputs to prevent XSS, injection attacks, and data corruption
 */

import { isAddress } from 'viem';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Ethereum Address Validation
 */
export function validateEthereumAddress(address: string): {
	isValid: boolean;
	error?: string;
	sanitized?: string;
} {
	if (!address || typeof address !== 'string') {
		return { isValid: false, error: 'Address is required' };
	}

	const trimmed = address.trim();

	if (!trimmed) {
		return { isValid: false, error: 'Address cannot be empty' };
	}

	// Check basic format: 0x followed by 40 hex characters
	const addressRegex = /^0x[a-fA-F0-9]{40}$/;
	if (!addressRegex.test(trimmed)) {
		return { isValid: false, error: 'Invalid Ethereum address format' };
	}

	// Use viem's isAddress for additional validation (checksum)
	// But don't fail if checksum is wrong, just warn
	const isValidChecksum = isAddress(trimmed);

	return { isValid: true, sanitized: trimmed };
}

/**
 * IPFS Hash (CID) Validation
 * Supports CIDv0 (Qm...) and CIDv1 (bafy...)
 */
export function validateIPFSHash(hash: string): {
	isValid: boolean;
	error?: string;
	sanitized?: string;
} {
	if (!hash || typeof hash !== 'string') {
		return { isValid: false, error: 'IPFS hash is required' };
	}

	const trimmed = hash.trim();

	if (!trimmed) {
		return { isValid: false, error: 'IPFS hash cannot be empty' };
	}

	// CIDv0: Qm + 44 base58 characters (total 46 chars)
	const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

	// CIDv1: bafy + base32 characters
	const cidv1Regex = /^bafy[a-z2-7]{50,}$/;

	if (!cidv0Regex.test(trimmed) && !cidv1Regex.test(trimmed)) {
		return {
			isValid: false,
			error: 'Invalid IPFS hash format. Must be CIDv0 (Qm...) or CIDv1 (bafy...)',
		};
	}

	return { isValid: true, sanitized: trimmed };
}

/**
 * Proposal Title Validation & Sanitization
 */
export function validateProposalTitle(title: string): {
	isValid: boolean;
	error?: string;
	sanitized?: string;
} {
	if (!title || typeof title !== 'string') {
		return { isValid: false, error: 'Title is required' };
	}

	const trimmed = title.trim();

	if (!trimmed) {
		return { isValid: false, error: 'Title cannot be empty' };
	}

	if (trimmed.length < 3) {
		return { isValid: false, error: 'Title must be at least 3 characters' };
	}

	if (trimmed.length > 100) {
		return { isValid: false, error: 'Title must be less than 100 characters' };
	}

	// Sanitize HTML/XSS
	const sanitized = DOMPurify.sanitize(trimmed, {
		ALLOWED_TAGS: [], // No HTML tags allowed in title
		ALLOWED_ATTR: [],
	});

	if (!sanitized) {
		return { isValid: false, error: 'Title contains invalid content' };
	}

	return { isValid: true, sanitized };
}

/**
 * Proposal Description Validation & Sanitization
 */
export function validateProposalDescription(description: string): {
	isValid: boolean;
	error?: string;
	sanitized?: string;
} {
	if (!description || typeof description !== 'string') {
		return { isValid: false, error: 'Description is required' };
	}

	const trimmed = description.trim();

	if (!trimmed) {
		return { isValid: false, error: 'Description cannot be empty' };
	}

	if (trimmed.length < 10) {
		return { isValid: false, error: 'Description must be at least 10 characters' };
	}

	if (trimmed.length > 2000) {
		return { isValid: false, error: 'Description must be less than 2,000 characters' };
	}

	// Sanitize HTML/XSS - Allow safe formatting tags
	const sanitized = DOMPurify.sanitize(trimmed, {
		ALLOWED_TAGS: [
			'p',
			'br',
			'strong',
			'em',
			'u',
			'a',
			'ul',
			'ol',
			'li',
			'h1',
			'h2',
			'h3',
			'code',
			'pre',
		],
		ALLOWED_ATTR: ['href', 'target', 'rel'],
		ALLOW_DATA_ATTR: false,
	});

	if (!sanitized) {
		return { isValid: false, error: 'Description contains invalid content' };
	}

	return { isValid: true, sanitized };
}

/**
 * File Upload Validation
 */
export interface FileValidationOptions {
	maxSizeBytes?: number;
	allowedTypes?: string[];
	allowedExtensions?: string[];
}

export function validateFile(
	file: File,
	options: FileValidationOptions = {},
): {
	isValid: boolean;
	error?: string;
} {
	const {
		maxSizeBytes = 10 * 1024 * 1024, // 10MB default
		allowedTypes = [
			'image/jpeg',
			'image/png',
			'image/gif',
			'image/webp',
			'application/pdf',
		],
		allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'],
	} = options;

	if (!file) {
		return { isValid: false, error: 'File is required' };
	}

	// Check file size
	if (file.size > maxSizeBytes) {
		const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
		return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
	}

	// Check file type
	if (!allowedTypes.includes(file.type)) {
		return {
			isValid: false,
			error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
		};
	}

	// Check file extension
	const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
	if (!allowedExtensions.includes(extension)) {
		return {
			isValid: false,
			error: `File extension ${extension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
		};
	}

	// Check for suspicious file names
	const suspiciousPatterns = [
		/\.exe$/i,
		/\.bat$/i,
		/\.cmd$/i,
		/\.sh$/i,
		/\.php$/i,
		/\.js$/i,
		/\.html$/i,
		/\.htm$/i,
	];

	if (suspiciousPatterns.some((pattern) => pattern.test(file.name))) {
		return { isValid: false, error: 'File name contains suspicious extension' };
	}

	return { isValid: true };
}

/**
 * URL Validation
 */
export function validateURL(url: string): {
	isValid: boolean;
	error?: string;
	sanitized?: string;
} {
	if (!url || typeof url !== 'string') {
		return { isValid: false, error: 'URL is required' };
	}

	const trimmed = url.trim();

	if (!trimmed) {
		return { isValid: false, error: 'URL cannot be empty' };
	}

	// Check for javascript: protocol and other dangerous protocols
	const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
	if (dangerousProtocols.some((protocol) => trimmed.toLowerCase().startsWith(protocol))) {
		return { isValid: false, error: 'URL contains dangerous protocol' };
	}

	// Validate URL format
	try {
		const urlObj = new URL(trimmed);

		// Only allow http and https
		if (!['http:', 'https:'].includes(urlObj.protocol)) {
			return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
		}

		return { isValid: true, sanitized: trimmed };
	} catch {
		return { isValid: false, error: 'Invalid URL format' };
	}
}

/**
 * Sanitize HTML content for safe rendering
 */
export function sanitizeHTML(html: string, allowTags: boolean = true): string {
	if (!html || typeof html !== 'string') {
		return '';
	}

	if (!allowTags) {
		// Strip all HTML tags
		return DOMPurify.sanitize(html, {
			ALLOWED_TAGS: [],
			ALLOWED_ATTR: [],
		});
	}

	// Allow safe HTML tags
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			'p',
			'br',
			'strong',
			'em',
			'u',
			'a',
			'ul',
			'ol',
			'li',
			'h1',
			'h2',
			'h3',
			'code',
			'pre',
			'blockquote',
		],
		ALLOWED_ATTR: ['href', 'target', 'rel'],
		ALLOW_DATA_ATTR: false,
		ALLOWED_URI_REGEXP: /^(?:(?:https?):\/\/)/i, // Only allow http/https links
	});
}

/**
 * Sanitize generic input (alias for sanitizeHTML with no tags)
 * Used for general XSS prevention and SQL injection prevention
 */
export function sanitizeInput(input: string): string {
	if (!input || typeof input !== 'string') {
		return '';
	}

	// First pass: DOMPurify to remove HTML/XSS
	let sanitized = DOMPurify.sanitize(input, {
		ALLOWED_TAGS: [],
		ALLOWED_ATTR: [],
	});

	// Second pass: Remove dangerous SQL patterns
	// Remove SQL keywords that could be used for injection
	const sqlPatterns = [
		/DROP\s+TABLE/gi,
		/DELETE\s+FROM/gi,
		/INSERT\s+INTO/gi,
		/UPDATE\s+SET/gi,
		/UNION\s+SELECT/gi,
		/EXEC\s*\(/gi,
		/EXECUTE\s*\(/gi,
		/--/g, // SQL comments
		/;/g, // Statement terminators
	];

	sqlPatterns.forEach((pattern) => {
		sanitized = sanitized.replace(pattern, '');
	});

	// Remove javascript: protocol
	sanitized = sanitized.replace(/javascript:/gi, '');

	// Remove data: protocol
	sanitized = sanitized.replace(/data:/gi, '');

	return sanitized;
}
