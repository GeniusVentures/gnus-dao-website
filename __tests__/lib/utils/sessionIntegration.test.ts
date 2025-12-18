/**
 * Integration test to demonstrate session information in error reports
 */

import * as Sentry from '@sentry/nextjs';
import { 
  initializeSession, 
  captureError, 
  incrementUserAction,
  incrementPageView,
  getCurrentSession
} from '../../../src/lib/utils/sentry';
import { logger } from '../../../src/lib/utils/logger';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'integration-test-session-id'),
  },
});

// Mock window and navigator
Object.defineProperty(global, 'window', {
  value: {
    location: {
      pathname: '/integration-test',
      href: 'https://test.com/integration-test',
    },
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Integration Test Browser)',
    language: 'en-US',
  },
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: {
    referrer: 'https://integration-referrer.com',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    hidden: false,
    visibilityState: 'visible',
  },
  writable: true,
});

// Mock Intl.DateTimeFormat
Object.defineProperty(Intl, 'DateTimeFormat', {
  value: jest.fn(() => ({
    resolvedOptions: () => ({ timeZone: 'America/New_York' }),
  })),
});

describe('Session Information Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should demonstrate complete session tracking workflow', async () => {
    // 1. Initialize session
    const session = initializeSession();
    expect(session.sessionId).toBe('integration-test-session-id');
    expect(session.pageViews).toBe(1);
    expect(session.userActions).toBe(0);

    // 2. Simulate user activity
    incrementUserAction(); // User clicks something
    incrementUserAction(); // User clicks again
    incrementPageView('/new-page'); // User navigates

    // 3. Get updated session
    const updatedSession = getCurrentSession();
    expect(updatedSession?.userActions).toBe(2);
    expect(updatedSession?.pageViews).toBe(2);
    expect(updatedSession?.currentPage).toBe('/new-page');

    // 4. Simulate an error occurring
    const testError = new Error('Integration test error');
    const errorContext = {
      component: 'IntegrationTestComponent',
      action: 'user_interaction',
      severity: 'high',
    };

    captureError(testError, errorContext);

    // 5. Verify that Sentry received comprehensive session information
    expect(Sentry.captureException).toHaveBeenCalledWith(testError, expect.objectContaining({
      level: 'error',
      contexts: expect.objectContaining({
        custom: errorContext,
        session: expect.objectContaining({
          sessionId: 'integration-test-session-id',
          pageViews: 2,
          userActions: 2,
          currentPage: '/new-page',
          referrer: 'https://integration-referrer.com',
          userAgent: 'Mozilla/5.0 (Integration Test Browser)',
          viewport: {
            width: 1920,
            height: 1080,
          },
          language: 'en-US',
          timezone: 'America/New_York',
        }),
      }),
      tags: expect.objectContaining({
        errorType: 'javascript',
        sessionId: 'integration-test-session-id',
      }),
      extra: expect.objectContaining({
        sessionDuration: expect.any(Number),
        pageViews: 2,
        userActions: 2,
      }),
    }));

    // 6. Test logger integration
    logger.error('Integration test logger error', { 
      testType: 'integration',
      userId: 'test-user-123' 
    }, testError);

    // Verify logger also includes session information
    expect(Sentry.captureException).toHaveBeenCalledWith(testError, expect.objectContaining({
      contexts: expect.objectContaining({
        session: expect.objectContaining({
          sessionId: 'integration-test-session-id',
          userActions: 2,
          pageViews: 2,
        }),
      }),
      tags: expect.objectContaining({
        sessionId: 'integration-test-session-id',
      }),
      extra: expect.objectContaining({
        sessionDuration: expect.any(Number),
        pageViews: 2,
        userActions: 2,
      }),
    }));
  });

  it('should track session across multiple error types', async () => {
    // Initialize session
    initializeSession();
    
    // Simulate user activity
    incrementUserAction();
    incrementUserAction();
    incrementUserAction();

    // Test different error types all include session info
    const errors = [
      { type: 'JavaScript', error: new Error('JS Error'), context: { type: 'js' } },
      { type: 'Web3', error: new Error('Web3 Error'), context: { action: 'connect', chainId: 1 } },
      { type: 'API', error: new Error('API Error'), context: { endpoint: '/api/test', method: 'POST', statusCode: 500 } },
    ];

    for (const { error, context } of errors) {
      if (context.action) {
        // Web3 error
        const { captureWeb3Error } = await import('../../../src/lib/utils/sentry');
        captureWeb3Error(error, context as any);
      } else if (context.endpoint) {
        // API error
        const { captureApiError } = await import('../../../src/lib/utils/sentry');
        captureApiError(error, context as any);
      } else {
        // JavaScript error
        captureError(error, context);
      }
    }

    // All errors should have been captured with session information
    expect(Sentry.captureException).toHaveBeenCalledTimes(3);
    
    // Check that each call included session information
    const calls = (Sentry.captureException as jest.Mock).mock.calls;
    calls.forEach(([error, options]) => {
      expect(options.contexts.session).toEqual(expect.objectContaining({
        sessionId: 'integration-test-session-id',
        userActions: 3, // All should have the same user action count
      }));
      expect(options.tags.sessionId).toBe('integration-test-session-id');
      expect(options.extra.userActions).toBe(3);
    });
  });

  it('should maintain session state across page navigation', async () => {
    // Initialize session
    const initialSession = initializeSession();
    const initialSessionId = initialSession.sessionId;

    // Simulate navigation
    incrementPageView('/page1');
    incrementPageView('/page2');
    incrementPageView('/page3');

    // Simulate user actions on different pages
    incrementUserAction(); // Action on page3
    incrementUserAction(); // Another action

    // Get current session
    const currentSession = getCurrentSession();
    
    // Session ID should remain the same
    expect(currentSession?.sessionId).toBe(initialSessionId);
    
    // But page views and actions should be updated
    expect(currentSession?.pageViews).toBe(4); // Initial + 3 navigations
    expect(currentSession?.userActions).toBe(2);
    expect(currentSession?.currentPage).toBe('/page3');

    // Trigger an error and verify session continuity
    const error = new Error('Navigation test error');
    captureError(error, { page: 'navigation_test' });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.objectContaining({
      contexts: expect.objectContaining({
        session: expect.objectContaining({
          sessionId: initialSessionId,
          pageViews: 4,
          userActions: 2,
          currentPage: '/page3',
        }),
      }),
    }));
  });
});