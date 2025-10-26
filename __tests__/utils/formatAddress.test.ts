/**
 * Unit tests for formatAddress utility function
 */

import { formatAddress } from '@/lib/utils';

describe('formatAddress', () => {
	it('should format a valid Ethereum address correctly', () => {
		const address = '0x1234567890123456789012345678901234567890';
		const result = formatAddress(address);
		expect(result).toBe('0x1234...7890');
	});

	it('should handle short addresses', () => {
		const address = '0x123456';
		const result = formatAddress(address);
		expect(result).toBe('0x1234...3456');
	});

	it('should handle empty string', () => {
		const result = formatAddress('');
		expect(result).toBe('');
	});

	it('should handle undefined', () => {
		const result = formatAddress(undefined as any);
		expect(result).toBe('');
	});

	it('should handle null', () => {
		const result = formatAddress(null as any);
		expect(result).toBe('');
	});

	it('should format with custom length', () => {
		const address = '0x1234567890123456789012345678901234567890';
		const result = formatAddress(address, 6);
		expect(result).toBe('0x123456...567890');
	});

	it('should handle addresses without 0x prefix', () => {
		const address = '1234567890123456789012345678901234567890';
		const result = formatAddress(address);
		expect(result).toBe('123456...7890');
	});

	it('should handle very short addresses gracefully', () => {
		const address = '0x12';
		const result = formatAddress(address);
		expect(result).toBe('0x12...0x12');
	});
});
