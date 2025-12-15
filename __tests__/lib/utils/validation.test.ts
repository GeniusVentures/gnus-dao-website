/**
 * Tests for Input Validation Utilities
 * Critical for security and data integrity
 */

import { describe, it, expect } from '@jest/globals';
import {
	validateProposalTitle,
	validateProposalDescription,
	validateEthereumAddress,
	validateIPFSHash,
	sanitizeInput,
} from '@/lib/utils/validation';

describe('Validation Utilities', () => {
	describe('validateProposalTitle', () => {
		it('should accept valid titles', () => {
			const validTitles = [
				'Proposal for Treasury Allocation',
				'Update Governance Parameters',
				'Community Initiative 2024',
			];

			validTitles.forEach((title) => {
				const result = validateProposalTitle(title);
				expect(result.isValid).toBe(true);
				expect(result.sanitized).toBeDefined();
			});
		});

		it('should reject empty titles', () => {
			const result = validateProposalTitle('');
			expect(result.isValid).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject titles that are too short', () => {
			const result = validateProposalTitle('Hi');
			expect(result.isValid).toBe(false);
		});

		it('should reject titles that are too long', () => {
			const longTitle = 'A'.repeat(101);
			const result = validateProposalTitle(longTitle);
			expect(result.isValid).toBe(false);
		});

		it('should sanitize XSS attempts', () => {
			const maliciousTitle = '<script>alert("xss")</script>Proposal';
			const result = validateProposalTitle(maliciousTitle);

			if (result.isValid) {
				expect(result.sanitized).not.toContain('<script>');
				expect(result.sanitized).not.toContain('alert');
			}
		});

		it('should handle special characters safely', () => {
			const title = 'Proposal & Update: "New" <Features>';
			const result = validateProposalTitle(title);

			if (result.isValid) {
				expect(result.sanitized).toBeDefined();
				// Should escape HTML entities
				expect(result.sanitized).not.toContain('<Features>');
			}
		});
	});

	describe('validateProposalDescription', () => {
		it('should accept valid descriptions', () => {
			const validDesc =
				'This is a detailed proposal description with multiple sentences. It explains the rationale and expected outcomes.';
			const result = validateProposalDescription(validDesc);

			expect(result.isValid).toBe(true);
			expect(result.sanitized).toBeDefined();
		});

		it('should reject empty descriptions', () => {
			const result = validateProposalDescription('');
			expect(result.isValid).toBe(false);
		});

		it('should reject descriptions that are too short', () => {
			const result = validateProposalDescription('Too short');
			expect(result.isValid).toBe(false);
		});

		it('should reject descriptions that are too long', () => {
			const longDesc = 'A'.repeat(2001);
			const result = validateProposalDescription(longDesc);
			expect(result.isValid).toBe(false);
		});

		it('should sanitize malicious content', () => {
			const maliciousDesc = '<img src=x onerror=alert(1)>Description';
			const result = validateProposalDescription(maliciousDesc);

			if (result.isValid) {
				expect(result.sanitized).not.toContain('onerror');
				expect(result.sanitized).not.toContain('alert');
			}
		});
	});

	describe('validateEthereumAddress', () => {
		it('should accept valid Ethereum addresses', () => {
			const validAddresses = [
				'0x1234567890123456789012345678901234567890',
				'0xABCDEF1234567890123456789012345678901234',
				'0x0000000000000000000000000000000000000000',
			];

			validAddresses.forEach((address) => {
				const result = validateEthereumAddress(address);
				expect(result.isValid).toBe(true);
			});
		});

		it('should reject invalid addresses', () => {
			const invalidAddresses = [
				'',
				'0x123', // Too short
				'1234567890123456789012345678901234567890', // Missing 0x
				'0xGGGG567890123456789012345678901234567890', // Invalid hex
				'0x12345678901234567890123456789012345678901', // Too long
			];

			invalidAddresses.forEach((address) => {
				const result = validateEthereumAddress(address);
				expect(result.isValid).toBe(false);
			});
		});

		it('should handle null and undefined', () => {
			expect(validateEthereumAddress(null as any).isValid).toBe(false);
			expect(validateEthereumAddress(undefined as any).isValid).toBe(false);
		});

		it('should be case-insensitive', () => {
			const address = '0xabcdef1234567890123456789012345678901234';
			const upperAddress = '0xABCDEF1234567890123456789012345678901234';
			const mixedAddress = '0xAbCdEf1234567890123456789012345678901234';

			expect(validateEthereumAddress(address).isValid).toBe(true);
			expect(validateEthereumAddress(upperAddress).isValid).toBe(true);
			expect(validateEthereumAddress(mixedAddress).isValid).toBe(true);
		});
	});

	describe('validateIPFSHash', () => {
		it('should accept valid IPFS hashes', () => {
			const validHashes = [
				'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
				'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB',
				'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
			];

			validHashes.forEach((hash) => {
				const result = validateIPFSHash(hash);
				expect(result.isValid).toBe(true);
			});
		});

		it('should reject invalid IPFS hashes', () => {
			const invalidHashes = [
				'',
				'invalid',
				'Qm123', // Too short
				'NotAnIPFSHash',
				'<script>alert(1)</script>',
			];

			invalidHashes.forEach((hash) => {
				const result = validateIPFSHash(hash);
				expect(result.isValid).toBe(false);
			});
		});

		it('should handle null and undefined', () => {
			expect(validateIPFSHash(null as any).isValid).toBe(false);
			expect(validateIPFSHash(undefined as any).isValid).toBe(false);
		});
	});

	describe('sanitizeInput', () => {
		it('should remove script tags', () => {
			const input = '<script>alert("xss")</script>Hello';
			const sanitized = sanitizeInput(input);

			expect(sanitized).not.toContain('<script>');
			expect(sanitized).not.toContain('alert');
		});

		it('should escape HTML entities', () => {
			const input = '<div>Test & "quotes"</div>';
			const sanitized = sanitizeInput(input);

			expect(sanitized).not.toContain('<div>');
			expect(sanitized).toContain('&');
		});

		it('should handle event handlers', () => {
			const input = '<img src=x onerror=alert(1)>';
			const sanitized = sanitizeInput(input);

			expect(sanitized).not.toContain('onerror');
			expect(sanitized).not.toContain('alert');
		});

		it('should preserve safe content', () => {
			const input = 'This is a safe string with numbers 123 and symbols !@#';
			const sanitized = sanitizeInput(input);

			expect(sanitized).toContain('safe string');
			expect(sanitized).toContain('123');
		});

		it('should handle empty strings', () => {
			expect(sanitizeInput('')).toBe('');
		});

		it('should handle null and undefined', () => {
			expect(sanitizeInput(null as any)).toBe('');
			expect(sanitizeInput(undefined as any)).toBe('');
		});
	});

	describe('SQL Injection Prevention', () => {
		it('should sanitize SQL injection attempts', () => {
			const sqlInjections = [
				{ input: "'; DROP TABLE users; --", shouldNotContain: ['DROP TABLE'] },
				{ input: "1' OR '1'='1", shouldNotContain: [] }, // This is just text after sanitization
				{ input: "admin'--", shouldNotContain: ['--'] },
				{
					input: "' UNION SELECT * FROM users--",
					shouldNotContain: ['UNION SELECT', '--'],
				},
			];

			sqlInjections.forEach(({ input, shouldNotContain }) => {
				const sanitized = sanitizeInput(input);
				shouldNotContain.forEach((pattern) => {
					expect(sanitized).not.toContain(pattern);
				});
			});
		});
	});

	describe('XSS Prevention', () => {
		it('should prevent various XSS attacks', () => {
			const xssAttempts = [
				{
					input: '<script>alert(document.cookie)</script>',
					shouldNotContain: ['<script>'],
				},
				{ input: '<img src=x onerror=alert(1)>', shouldNotContain: ['onerror'] },
				{ input: '<iframe src="javascript:alert(1)">', shouldNotContain: ['<iframe'] },
				{ input: '<body onload=alert(1)>', shouldNotContain: ['onload'] },
				{ input: '<svg onload=alert(1)>', shouldNotContain: ['<svg'] },
				{ input: 'javascript:alert(1)', shouldNotContain: ['javascript:'] },
			];

			xssAttempts.forEach(({ input, shouldNotContain }) => {
				const sanitized = sanitizeInput(input);
				shouldNotContain.forEach((pattern) => {
					expect(sanitized).not.toContain(pattern);
				});
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle very long strings', () => {
			const longString = 'A'.repeat(10000);
			const sanitized = sanitizeInput(longString);
			expect(sanitized).toBeDefined();
		});

		it('should handle unicode characters', () => {
			const unicode = '你好世界 🌍 مرحبا';
			const sanitized = sanitizeInput(unicode);
			expect(sanitized).toBeDefined();
		});

		it('should handle mixed content', () => {
			const mixed = 'Normal text <script>bad</script> more text';
			const sanitized = sanitizeInput(mixed);
			expect(sanitized).toContain('Normal text');
			expect(sanitized).toContain('more text');
			expect(sanitized).not.toContain('<script>');
		});
	});
});
