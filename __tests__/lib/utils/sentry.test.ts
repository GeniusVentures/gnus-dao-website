/**
 * Tests for Sentry error tracking utilities
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Sentry
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();
const mockSetUser = jest.fn();
const mockSetContext = jest.fn();
const mockAddBreadcrumb = jest.fn();
const mockStartTransaction = jest.fn();

jest.mock('@sentry/nextjs', () => ({
	captureException: mockCaptureException,
	captureMessage: mockCaptureMessage,
	setUser: mockSetUser,
	setContext: mockSetContext,
	addBreadcrumb: mockAddBreadcrumb,
	startTransaction: mockStartTransaction,
}));

// Mock environment
jest.mock('@/lib/config/env', () => ({
	isProduction: jest.fn(() => false),
	isDevelopment: jest.fn(() => true),
}));

describe('Sentry Error Tracking', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('captureError', () => {
		it('should capture JavaScript errors with context', async () => {
			const { captureError } = await import('@/lib/utils/sentry');

			const error = new Error('Test error');
			const context = { action: 'test', page: 'home' };

			captureError(error, context);

			expect(mockCaptureException).toHaveBeenCalledWith(error, expect.objectContaining({
				level: 'error',
				contexts: expect.objectContaining({
					custom: context,
					session: expect.any(Object),
				}),
				tags: expect.objectContaining({
					errorType: 'javascript',
					environment: process.env.NODE_ENV,
					sessionId: expect.any(String),
				}),
				extra: expect.objectContaining({
					sessionDuration: expect.any(Number),
					pageViews: expect.any(Number),
					userActions: expect.any(Number),
				}),
			}));
		});

		it('should capture errors with different levels', async () => {
			const { captureError } = await import('@/lib/utils/sentry');

			const error = new Error('Warning error');

			captureError(error, {}, 'warning');

			expect(mockCaptureException).toHaveBeenCalledWith(
				error,
				expect.objectContaining({
					level: 'warning',
				}),
			);
		});
	});

	describe('captureWeb3Error', () => {
		it('should capture Web3 errors with enhanced context', async () => {
			const { captureWeb3Error } = await import('@/lib/utils/sentry');

			const error = new Error('Web3 connection failed');
			const context = {
				action: 'connect',
				chainId: 1,
				walletType: 'metamask',
			};

			captureWeb3Error(error, context);

			expect(mockCaptureException).toHaveBeenCalledWith(error, expect.objectContaining({
				level: 'error',
				contexts: expect.objectContaining({
					web3: context,
					session: expect.any(Object),
				}),
				tags: expect.objectContaining({
					errorType: 'web3',
					action: 'connect',
					chainId: '1',
					walletType: 'metamask',
					sessionId: expect.any(String),
				}),
				extra: expect.objectContaining({
					web3Context: context,
					sessionDuration: expect.any(Number),
					pageViews: expect.any(Number),
					userActions: expect.any(Number),
				}),
				fingerprint: ['web3-error', 'connect', 'unknown'],
			}));
		});
	});

	describe('captureApiError', () => {
		it('should capture API errors with request context', async () => {
			const { captureApiError } = await import('@/lib/utils/sentry');

			const error = new Error('API request failed');
			const context = {
				endpoint: '/api/proposals',
				method: 'GET',
				statusCode: 500,
				requestId: 'req-123',
			};

			captureApiError(error, context);

			expect(mockCaptureException).toHaveBeenCalledWith(error, expect.objectContaining({
				level: 'error',
				contexts: expect.objectContaining({
					api: context,
					session: expect.any(Object),
				}),
				tags: expect.objectContaining({
					errorType: 'api',
					endpoint: '/api/proposals',
					method: 'GET',
					statusCode: '500',
					sessionId: expect.any(String),
				}),
				extra: expect.objectContaining({
					apiContext: context,
					sessionDuration: expect.any(Number),
					pageViews: expect.any(Number),
					userActions: expect.any(Number),
				}),
			}));
		});
	});

	describe('initializeSentryUser', () => {
		it('should set user context with wallet information', async () => {
			const { initializeSentryUser } = await import('@/lib/utils/sentry');

			const user = {
				id: 'user-123',
				walletAddress: '0x1234567890123456789012345678901234567890',
				chainId: 1,
				walletType: 'metamask',
			};

			initializeSentryUser(user);

			expect(mockSetUser).toHaveBeenCalledWith({
				id: 'user-123',
				email: undefined,
				username: '0x1234567890123456789012345678901234567890',
				walletAddress: '0x1234567890123456789012345678901234567890',
			});

			expect(mockSetContext).toHaveBeenCalledWith('wallet', {
				address: '0x1234567890123456789012345678901234567890',
				chainId: 1,
				type: 'metamask',
			});
		});
	});

	describe('addUserActionBreadcrumb', () => {
		it('should add breadcrumb for user actions', async () => {
			const { addUserActionBreadcrumb } = await import('@/lib/utils/sentry');

			const action = 'click_proposal';
			const data = { proposalId: '123', page: 'proposals' };

			addUserActionBreadcrumb(action, data);

			expect(mockAddBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
				message: 'User Action: click_proposal',
				category: 'user',
				level: 'info',
				data: expect.objectContaining({
					proposalId: '123',
					page: 'proposals',
					timestamp: expect.any(Number),
					sessionId: expect.any(String),
					sessionDuration: expect.any(Number),
					actionSequence: expect.any(Number),
				}),
				timestamp: expect.any(Number),
			}));
		});
	});

	describe('addWeb3ActionBreadcrumb', () => {
		it('should add breadcrumb for Web3 actions', async () => {
			const { addWeb3ActionBreadcrumb } = await import('@/lib/utils/sentry');

			const action = 'connect_wallet';
			const data = {
				walletType: 'metamask',
				chainId: 1,
			};

			addWeb3ActionBreadcrumb(action, data);

			expect(mockAddBreadcrumb).toHaveBeenCalledWith({
				message: 'Web3 Action: connect_wallet',
				category: 'web3',
				level: 'info',
				data,
			});
		});
	});

	describe('withErrorTracking', () => {
		it('should wrap async functions with error tracking', async () => {
			const { withErrorTracking, captureError } = await import('@/lib/utils/sentry');

			const originalFunction = jest.fn().mockRejectedValue(new Error('Function failed'));
			const wrappedFunction = withErrorTracking(originalFunction, { component: 'test' });

			await expect(wrappedFunction('arg1', 'arg2')).rejects.toThrow('Function failed');

			expect(originalFunction).toHaveBeenCalledWith('arg1', 'arg2');
			expect(mockCaptureException).toHaveBeenCalled();
		});

		it('should pass through successful function calls', async () => {
			const { withErrorTracking } = await import('@/lib/utils/sentry');

			const originalFunction = jest.fn().mockResolvedValue('success');
			const wrappedFunction = withErrorTracking(originalFunction);

			const result = await wrappedFunction('arg1');

			expect(result).toBe('success');
			expect(originalFunction).toHaveBeenCalledWith('arg1');
			expect(mockCaptureException).not.toHaveBeenCalled();
		});
	});

	describe('capturePerformanceIssue', () => {
		it('should capture performance issues with context', async () => {
			const { capturePerformanceIssue } = await import('@/lib/utils/sentry');

			const message = 'Slow page load';
			const context = {
				metric: 'pageLoad',
				value: 5000,
				threshold: 2000,
				page: '/proposals',
			};

			capturePerformanceIssue(message, context);

			expect(mockCaptureMessage).toHaveBeenCalledWith(
				'Performance Issue: Slow page load',
				'warning',
			);
			expect(mockAddBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
				message: 'Performance: pageLoad = 5000ms',
				category: 'performance',
				level: 'warning',
				data: context,
				timestamp: expect.any(Number),
			}));
		});
	});
});
