/**
 * Tests for utility formatters
 */
import {
	formatAddress,
	formatNumber,
	formatTokenAmount,
	formatRelativeTime,
} from '@/lib/utils';

describe('Formatters', () => {
	describe('formatAddress', () => {
		it('should format Ethereum address with default length', () => {
			const address = '0x1234567890123456789012345678901234567890';
			const formatted = formatAddress(address);

			expect(formatted).toBe('0x1234...7890');
		});

		it('should format address with custom length', () => {
			const address = '0x1234567890123456789012345678901234567890';
			const formatted = formatAddress(address, 6);

			expect(formatted).toBe('0x123456...567890');
		});

		it('should handle short addresses', () => {
			const address = '0x1234';
			const formatted = formatAddress(address);

			// Short addresses still get formatted with the pattern
			expect(formatted).toBe('0x1234...1234');
		});

		it('should handle empty address', () => {
			const formatted = formatAddress('');

			expect(formatted).toBe('');
		});
	});

	describe('formatNumber', () => {
		it('should format number with commas', () => {
			expect(formatNumber(1000, 0)).toBe('1,000');
			expect(formatNumber(1000000, 0)).toBe('1,000,000');
			expect(formatNumber(1234567, 0)).toBe('1,234,567');
		});

		it('should handle decimal numbers', () => {
			expect(formatNumber(1234.56, 2)).toBe('1,234.56');
		});

		it('should handle zero', () => {
			expect(formatNumber(0)).toBe('0');
		});

		it('should handle negative numbers', () => {
			expect(formatNumber(-1000, 0)).toBe('-1,000');
		});
	});

	describe('formatTokenAmount', () => {
		it('should format bigint token amounts', () => {
			const amount = 1000000000000000000n; // 1 ETH in wei
			const formatted = formatTokenAmount(amount, 18, 1);

			expect(formatted).toBe('1');
		});

		it('should handle different decimals', () => {
			const amount = 1000000n; // 1 USDC (6 decimals)
			const formatted = formatTokenAmount(amount, 6, 1);

			expect(formatted).toBe('1');
		});

		it('should handle zero amount', () => {
			const formatted = formatTokenAmount(0n, 18);

			expect(formatted).toBe('0');
		});

		it('should format with specified decimal places', () => {
			const amount = 1234567890000000000n;
			const formatted = formatTokenAmount(amount, 18, 4);

			expect(formatted).toContain('1.234');
		});
	});

	describe('formatRelativeTime', () => {
		it('should format recent time as "Just now"', () => {
			const now = Date.now();
			const formatted = formatRelativeTime(now);

			expect(formatted).toBe('Just now');
		});

		it('should format minutes ago', () => {
			const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
			const formatted = formatRelativeTime(fiveMinutesAgo);

			expect(formatted).toContain('minute');
		});

		it('should format hours ago', () => {
			const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
			const formatted = formatRelativeTime(twoHoursAgo);

			expect(formatted).toContain('hour');
		});

		it('should format days ago', () => {
			const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
			const formatted = formatRelativeTime(threeDaysAgo);

			expect(formatted).toContain('day');
		});
	});
});
