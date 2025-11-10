/**
 * Unit tests for time utility functions
 */

import { formatDuration, formatRelativeTime } from '@/lib/utils';

describe('Time Utilities', () => {
	describe('formatDuration', () => {
		it('should format duration with days and hours', () => {
			const seconds = 2 * 86400 + 5 * 3600 + 30 * 60; // 2 days, 5 hours, 30 minutes
			const result = formatDuration(seconds);
			expect(result).toBe('2d 5h');
		});

		it('should format duration with hours and minutes', () => {
			const seconds = 5 * 3600 + 30 * 60 + 45; // 5 hours, 30 minutes, 45 seconds
			const result = formatDuration(seconds);
			expect(result).toBe('5h 30m');
		});

		it('should format duration with only minutes', () => {
			const seconds = 30 * 60 + 45; // 30 minutes, 45 seconds
			const result = formatDuration(seconds);
			expect(result).toBe('30m');
		});

		it('should handle zero duration', () => {
			const result = formatDuration(0);
			expect(result).toBe('0m');
		});
	});

	describe('formatRelativeTime', () => {
		it('should format days ago', () => {
			const now = Date.now();
			const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
			const result = formatRelativeTime(twoDaysAgo);
			expect(result).toBe('2 days ago');
		});

		it('should format hours ago', () => {
			const now = Date.now();
			const twoHoursAgo = now - 2 * 60 * 60 * 1000;
			const result = formatRelativeTime(twoHoursAgo);
			expect(result).toBe('2 hours ago');
		});

		it('should format minutes ago', () => {
			const now = Date.now();
			const fiveMinutesAgo = now - 5 * 60 * 1000;
			const result = formatRelativeTime(fiveMinutesAgo);
			expect(result).toBe('5 minutes ago');
		});

		it('should handle recent time', () => {
			const now = Date.now();
			const result = formatRelativeTime(now - 30000); // 30 seconds ago
			expect(result).toBe('Just now');
		});

		it('should handle singular forms', () => {
			const now = Date.now();
			const oneHourAgo = now - 60 * 60 * 1000;
			const result = formatRelativeTime(oneHourAgo);
			expect(result).toBe('1 hour ago');
		});
	});
});
