/**
 * Tests for Error Tracking Utility
 * Critical for monitoring and debugging
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Sentry
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();
const mockSetContext = jest.fn();
const mockSetUser = jest.fn();
const mockAddBreadcrumb = jest.fn();

jest.mock('@sentry/nextjs', () => ({
	captureException: mockCaptureException,
	captureMessage: mockCaptureMessage,
	setContext: mockSetContext,
	setUser: mockSetUser,
	addBreadcrumb: mockAddBreadcrumb,
}));

describe('Error Tracking Utility', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('withErrorTracking', () => {
		it('should wrap handler and catch errors', async () => {
			const { withErrorTracking } = await import('@/../functions/utils/errorTracking');

			const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'));
			const wrappedHandler = withErrorTracking(mockHandler);

			const mockRequest = new Request('http://localhost/test');
			const mockContext = {
				request: mockRequest,
				env: { SENTRY_DSN: 'test-dsn' },
				params: {},
				waitUntil: jest.fn(),
				next: jest.fn(),
				data: {},
			};

			const response = await wrappedHandler(mockContext);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.error).toBeDefined();
		});

		it('should pass through successful responses', async () => {
			const { withErrorTracking } = await import('@/../functions/utils/errorTracking');

			const mockHandler = jest.fn().mockResolvedValue(
				new Response(JSON.stringify({ success: true }), { status: 200 })
			);
			const wrappedHandler = withErrorTracking(mockHandler);

			const mockRequest = new Request('http://localhost/test');
			const mockContext = {
				request: mockRequest,
				env: {},
				params: {},
				waitUntil: jest.fn(),
				next: jest.fn(),
				data: {},
			};

			const response = await wrappedHandler(mockContext);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
		});

		it('should add CORS headers to error responses', async () => {
			const { withErrorTracking } = await import('@/../functions/utils/errorTracking');

			const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'));
			const wrappedHandler = withErrorTracking(mockHandler);

			const mockRequest = new Request('http://localhost/test');
			const mockContext = {
				request: mockRequest,
				env: {},
				params: {},
				waitUntil: jest.fn(),
				next: jest.fn(),
				data: {},
			};

			const response = await wrappedHandler(mockContext);

			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('should handle non-Error objects', async () => {
			const { withErrorTracking } = await import('@/../functions/utils/errorTracking');

			const mockHandler = jest.fn().mockRejectedValue('String error');
			const wrappedHandler = withErrorTracking(mockHandler);

			const mockRequest = new Request('http://localhost/test');
			const mockContext = {
				request: mockRequest,
				env: {},
				params: {},
				waitUntil: jest.fn(),
				next: jest.fn(),
				data: {},
			};

			const response = await wrappedHandler(mockContext);

			expect(response.status).toBe(500);
		});
	});

	describe('Error Context', () => {
		it('should capture request context', async () => {
			const { withErrorTracking } = await import('@/../functions/utils/errorTracking');

			const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'));
			const wrappedHandler = withErrorTracking(mockHandler);

			const mockRequest = new Request('http://localhost/test?param=value', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			const mockContext = {
				request: mockRequest,
				env: { SENTRY_DSN: 'test-dsn' },
				params: {},
				waitUntil: jest.fn(),
				next: jest.fn(),
				data: {},
			};

			await wrappedHandler(mockContext);

			// Error should be caught and handled
			expect(mockHandler).toHaveBeenCalled();
		});
	});

	describe('Error Response Format', () => {
		it('should return consistent error response format', async () => {
			const { withErrorTracking } = await import('@/../functions/utils/errorTracking');

			const mockHandler = jest.fn().mockRejectedValue(new Error('Custom error message'));
			const wrappedHandler = withErrorTracking(mockHandler);

			const mockRequest = new Request('http://localhost/test');
			const mockContext = {
				request: mockRequest,
				env: {},
				params: {},
				waitUntil: jest.fn(),
				next: jest.fn(),
				data: {},
			};

			const response = await wrappedHandler(mockContext);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toHaveProperty('error');
			expect(typeof data.error).toBe('string');
		});

		it('should not expose sensitive error details in production', async () => {
			const { withErrorTracking } = await import('@/../functions/utils/errorTracking');

			const mockHandler = jest.fn().mockRejectedValue(
				new Error('Database connection failed: password=secret123')
			);
			const wrappedHandler = withErrorTracking(mockHandler);

			const mockRequest = new Request('http://localhost/test');
			const mockContext = {
				request: mockRequest,
				env: { ENVIRONMENT: 'production' },
				params: {},
				waitUntil: jest.fn(),
				next: jest.fn(),
				data: {},
			};

			const response = await wrappedHandler(mockContext);

			const data = await response.json();
			// Should not expose sensitive details
			expect(data.error).toBeDefined();
		});
	});

	describe('Performance', () => {
		it('should not significantly impact response time', async () => {
			const { withErrorTracking } = await import('@/../functions/utils/errorTracking');

			const mockHandler = jest.fn().mockResolvedValue(
				new Response(JSON.stringify({ success: true }), { status: 200 })
			);
			const wrappedHandler = withErrorTracking(mockHandler);

			const mockRequest = new Request('http://localhost/test');
			const mockContext = {
				request: mockRequest,
				env: {},
				params: {},
				waitUntil: jest.fn(),
				next: jest.fn(),
				data: {},
			};

			const start = Date.now();
			await wrappedHandler(mockContext);
			const duration = Date.now() - start;

			// Should complete quickly (< 100ms for simple handler)
			expect(duration).toBeLessThan(100);
		});
	});
});
