/**
 * Tests for utility functions in lib/utils.ts
 */
import {
	cn,
	formatNumber,
	formatCompactNumber,
	formatAddress,
	formatTxHash,
	formatTokenAmount,
	formatPercentage,
	formatDuration,
	debounce,
	throttle,
	generateId,
	isValidAddress,
	isValidTxHash,
	sleep,
	truncateText,
	copyToClipboard,
} from '@/lib/utils';

describe('Utils', () => {
	describe('cn (className merger)', () => {
		it('should merge class names', () => {
			expect(cn('foo', 'bar')).toBe('foo bar');
		});

		it('should handle conditional classes', () => {
			expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
		});

		it('should merge Tailwind classes correctly', () => {
			expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
		});
	});

	describe('formatNumber', () => {
		it('should format numbers with commas', () => {
			expect(formatNumber(1000)).toBe('1,000');
			expect(formatNumber(1000000)).toBe('1,000,000');
		});

		it('should handle decimals', () => {
			expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
			expect(formatNumber(1234.5678, 0)).toBe('1,235');
		});

		it('should handle string input', () => {
			expect(formatNumber('1234.56')).toBe('1,234.56');
		});

		it('should return 0 for invalid input', () => {
			expect(formatNumber('invalid')).toBe('0');
			expect(formatNumber(NaN)).toBe('0');
		});
	});

	describe('formatCompactNumber', () => {
		it('should format large numbers with suffixes', () => {
			expect(formatCompactNumber(1000)).toBe('1K');
			expect(formatCompactNumber(1000000)).toBe('1M');
			expect(formatCompactNumber(1000000000)).toBe('1B');
		});

		it('should handle decimals in compact format', () => {
			expect(formatCompactNumber(1500)).toBe('1.5K');
			expect(formatCompactNumber(2500000)).toBe('2.5M');
		});

		it('should handle string input', () => {
			expect(formatCompactNumber('1000000')).toBe('1M');
		});

		it('should return 0 for invalid input', () => {
			expect(formatCompactNumber('invalid')).toBe('0');
		});
	});

	describe('formatAddress', () => {
		it('should format Ethereum addresses', () => {
			const address = '0x1234567890123456789012345678901234567890';
			expect(formatAddress(address)).toBe('0x1234...7890');
		});

		it('should handle custom character count', () => {
			const address = '0x1234567890123456789012345678901234567890';
			expect(formatAddress(address, 6)).toBe('0x123456...567890');
		});

		it('should return empty string for empty input', () => {
			expect(formatAddress('')).toBe('');
		});
	});

	describe('formatTxHash', () => {
		it('should format transaction hashes', () => {
			const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
			expect(formatTxHash(hash)).toBe('0x123456...abcdef');
		});

		it('should handle custom character count', () => {
			const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
			expect(formatTxHash(hash, 8)).toBe('0x12345678...90abcdef');
		});

		it('should return empty string for empty input', () => {
			expect(formatTxHash('')).toBe('');
		});
	});

	describe('formatTokenAmount', () => {
		it('should format bigint token amounts', () => {
			const amount = BigInt('1000000000000000000'); // 1 ETH in wei
			expect(formatTokenAmount(amount, 18, 4)).toBe('1');
		});

		it('should format string token amounts', () => {
			expect(formatTokenAmount('1.5', 18, 2)).toBe('1.5');
		});

		it('should format number token amounts', () => {
			expect(formatTokenAmount(1234.5678, 18, 2)).toBe('1,234.57');
		});

		it('should handle very small numbers with exponential notation', () => {
			const result = formatTokenAmount(0.00001, 18, 4);
			expect(result).toBe('1.00e-5');
		});

		it('should return 0 for invalid input', () => {
			expect(formatTokenAmount('invalid', 18, 4)).toBe('0');
		});
	});

	describe('formatPercentage', () => {
		it('should format percentages', () => {
			expect(formatPercentage(50)).toBe('50%');
			expect(formatPercentage(75.5)).toBe('75.5%');
		});

		it('should handle decimal precision', () => {
			expect(formatPercentage(33.333333, 2)).toBe('33.33%');
			expect(formatPercentage(66.666666, 1)).toBe('66.7%');
		});
	});

	describe('formatDuration', () => {
		it('should format seconds to human readable', () => {
			expect(formatDuration(60)).toBe('1m');
			expect(formatDuration(3600)).toBe('1h 0m');
			expect(formatDuration(86400)).toBe('1d 0h');
		});

		it('should handle multiple units', () => {
			expect(formatDuration(90061)).toBe('1d 1h');
			expect(formatDuration(3661)).toBe('1h 1m');
		});

		it('should handle zero', () => {
			expect(formatDuration(0)).toBe('0m');
		});
	});

	describe('debounce', () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should debounce function calls', () => {
			const func = jest.fn();
			const debouncedFunc = debounce(func, 100);

			debouncedFunc();
			debouncedFunc();
			debouncedFunc();

			expect(func).not.toHaveBeenCalled();

			jest.advanceTimersByTime(100);

			expect(func).toHaveBeenCalledTimes(1);
		});

		it('should pass arguments correctly', () => {
			const func = jest.fn();
			const debouncedFunc = debounce(func, 100);

			debouncedFunc('arg1', 'arg2');

			jest.advanceTimersByTime(100);

			expect(func).toHaveBeenCalledWith('arg1', 'arg2');
		});
	});

	describe('throttle', () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should throttle function calls', () => {
			const func = jest.fn();
			const throttledFunc = throttle(func, 100);

			throttledFunc();
			throttledFunc();
			throttledFunc();

			expect(func).toHaveBeenCalledTimes(1);

			jest.advanceTimersByTime(100);

			throttledFunc();

			expect(func).toHaveBeenCalledTimes(2);
		});
	});

	describe('generateId', () => {
		// Mock crypto.randomUUID to return a predictable value
		const originalCrypto = global.crypto;

		beforeEach(() => {
			// Mock crypto with getRandomValues
			Object.defineProperty(global, 'crypto', {
				value: {
					getRandomValues: (arr: Uint8Array) => {
						for (let i = 0; i < arr.length; i++) {
							arr[i] = Math.floor(Math.random() * 256);
						}
						return arr;
					},
				},
				writable: true,
				configurable: true,
			});
		});

		afterEach(() => {
			Object.defineProperty(global, 'crypto', {
				value: originalCrypto,
				writable: true,
				configurable: true,
			});
		});

		it('should generate random IDs', () => {
			const id1 = generateId();
			const id2 = generateId();

			expect(id1).toHaveLength(8);
			expect(id2).toHaveLength(8);
			expect(id1).not.toBe(id2);
		});

		it('should generate IDs of custom length', () => {
			const id = generateId(16);
			expect(id).toHaveLength(16);
		});

		it('should generate alphanumeric IDs', () => {
			const id = generateId(20);
			expect(id).toMatch(/^[A-Za-z0-9]+$/);
		});
	});

	describe('isValidAddress', () => {
		it('should validate Ethereum addresses', () => {
			expect(isValidAddress('0x1234567890123456789012345678901234567890')).toBe(true);
			expect(isValidAddress('0xAbCdEf1234567890123456789012345678901234')).toBe(true);
		});

		it('should reject invalid addresses', () => {
			expect(isValidAddress('0x123')).toBe(false);
			expect(isValidAddress('1234567890123456789012345678901234567890')).toBe(false);
			expect(isValidAddress('0xGGGG567890123456789012345678901234567890')).toBe(false);
		});
	});

	describe('isValidTxHash', () => {
		it('should validate transaction hashes', () => {
			const validHash =
				'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
			expect(isValidTxHash(validHash)).toBe(true);
		});

		it('should reject invalid hashes', () => {
			expect(isValidTxHash('0x123')).toBe(false);
			expect(
				isValidTxHash('0xGGGG567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
			).toBe(false);
		});
	});

	describe('sleep', () => {
		it('should sleep for specified milliseconds', async () => {
			const start = Date.now();
			await sleep(100);
			const end = Date.now();

			expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
		});
	});

	describe('truncateText', () => {
		it('should truncate long text', () => {
			const text = 'This is a very long text that needs to be truncated';
			expect(truncateText(text, 20)).toBe('This is a very long ...');
		});

		it('should not truncate short text', () => {
			const text = 'Short text';
			expect(truncateText(text, 20)).toBe('Short text');
		});

		it('should handle exact length', () => {
			const text = 'Exactly twenty chars';
			expect(truncateText(text, 20)).toBe('Exactly twenty chars');
		});
	});

	describe('copyToClipboard', () => {
		it('should copy text using clipboard API', async () => {
			const mockWriteText = jest.fn().mockResolvedValue(undefined);
			Object.assign(navigator, {
				clipboard: {
					writeText: mockWriteText,
				},
			});

			const result = await copyToClipboard('test text');

			expect(result).toBe(true);
			expect(mockWriteText).toHaveBeenCalledWith('test text');
		});

		it('should handle clipboard API failure', async () => {
			const mockWriteText = jest.fn().mockRejectedValue(new Error('Failed'));
			Object.assign(navigator, {
				clipboard: {
					writeText: mockWriteText,
				},
			});

			// Mock document.execCommand
			document.execCommand = jest.fn().mockReturnValue(true);

			const result = await copyToClipboard('test text');

			expect(result).toBe(true);
		});
	});
});
