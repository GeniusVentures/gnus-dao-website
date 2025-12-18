/**
 * Test suite for session information in error reports
 */

import * as Sentry from '@sentry/nextjs';
import { 
  initializeSession, 
  captureError, 
  captureWeb3Error, 
  captureApiError,
  getCurrentSession,
  incrementUserAction,
  incrementPageView
} from '../../../src/lib/utils/sentry';
import logger from '../../../src/lib/utils/logger';

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
    randomUUID: jest.fn(() => 'test-session-id-123'),
  },
});

// Mock window and navigator
Object.defineProperty(global, 'window', {
  value: {
    location: {
      pathname: '/test-page',
      href: 'https://test.com/test-page',
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
    userAgent: 'Mozilla/5.0 (Test Browser)',
    language: 'en-US',
  },
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: {
    referrer: 'https://referrer.com',
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

describe('Session Information in Error Reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset session state by clearing the module cache
    delete require.cache[require.resolve('../../../src/lib/utils/sentry')];
    
    // Setup window.__sentryModule for logger integration
    if (typeof window !== 'undefined') {
      (window as any).__sentryModule = {
        getCurrentSession: () => ({
          sessionId: 'test-session-id-123',
          pageViews: 1,
          userActions: 0,
          duration: 1000,
        }),
        incrementUserAction: jest.fn(),
        incrementPageView: jest.fn(),
        updateSessionActivity: jest.fn(),
      };
    }
  });

  describe('Session Initialization', () => {
    it('should initialize session with comprehensive information', () => {
      const session = initializeSession();

      expect(session).toMatchObject({
        sessionId: 'test-session-id-123',
        pageViews: 1,
        userActions: 0,
        currentPage: '/test-page',
        referrer: 'https://referrer.com',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        viewport: {
          width: 1920,
          height: 1080,
        },
        language: 'en-US',
        timezone: 'America/New_York',
      });

      expect(session.startTime).toBeDefined();
      expect(session.lastActivity).toBeDefined();
      expect(session.duration).toBeGreaterThanOrEqual(0);
    });

    it('should set session context in Sentry', () => {
      initializeSession();

      expect(Sentry.setContext).toHaveBeenCalledWith('session', expect.objectContaining({
        sessionId: 'test-session-id-123',
        pageViews: 1,
        userActions: 0,
      }));
    });
  });

  describe('Error Capture with Session Information', () => {
    it('should include session information in JavaScript error reports', () => {
      const session = initializeSession();
      const testError = new Error('Test JavaScript error');
      const context = { component: 'TestComponent' };

      captureError(testError, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(testError, expect.objectContaining({
        contexts: expect.objectContaining({
          custom: context,
          session: expect.objectContaining({
            sessionId: 'test-session-id-123',
            pageViews: 1,
            userActions: 0,
          }),
        }),
        tags: expect.objectContaining({
          sessionId: 'test-session-id-123',
        }),
        extra: expect.objectContaining({
          sessionDuration: expect.any(Number),
          pageViews: 1,
          userActions: 0,
        }),
      }));
    });

    it('should include session information in Web3 error reports', () => {
      const session = initializeSession();
      const testError = new Error('Test Web3 error');
      const web3Context = {
        action: 'transaction',
        chainId: 1,
        walletType: 'MetaMask',
        transactionHash: '0x123',
      };

      captureWeb3Error(testError, web3Context);

      expect(Sentry.captureException).toHaveBeenCalledWith(testError, expect.objectContaining({
        contexts: expect.objectContaining({
          web3: web3Context,
          session: expect.objectContaining({
            sessionId: 'test-session-id-123',
          }),
        }),
        tags: expect.objectContaining({
          sessionId: 'test-session-id-123',
          errorType: 'web3',
          chainId: '1',
          walletType: 'MetaMask',
        }),
        extra: expect.objectContaining({
          sessionDuration: expect.any(Number),
          pageViews: 1,
          userActions: 0,
        }),
      }));
    });

    it('should include session information in API error reports', () => {
      const session = initializeSession();
      const testError = new Error('Test API error');
      const apiContext = {
        endpoint: '/api/test',
        method: 'POST',
        statusCode: 500,
        requestId: 'req-123',
      };

      captureApiError(testError, apiContext);

      expect(Sentry.captureException).toHaveBeenCalledWith(testError, expect.objectContaining({
        contexts: expect.objectContaining({
          api: apiContext,
          session: expect.objectContaining({
            sessionId: 'test-session-id-123',
          }),
        }),
        tags: expect.objectContaining({
          sessionId: 'test-session-id-123',
          errorType: 'api',
          endpoint: '/api/test',
          method: 'POST',
          statusCode: '500',
        }),
        extra: expect.objectContaining({
          sessionDuration: expect.any(Number),
          pageViews: 1,
          userActions: 0,
        }),
      }));
    });
  });

  describe('Session Activity Tracking', () => {
    it('should update user action count when incrementUserAction is called', () => {
      const session = initializeSession();
      
      incrementUserAction();
      incrementUserAction();
      
      const updatedSession = getCurrentSession();
      expect(updatedSession?.userActions).toBe(2);
    });

    it('should update page view count when incrementPageView is called', () => {
      const session = initializeSession();
      
      incrementPageView('/new-page');
      incrementPageView('/another-page');
      
      const updatedSession = getCurrentSession();
      expect(updatedSession?.pageViews).toBe(3); // Initial + 2 increments
      expect(updatedSession?.currentPage).toBe('/another-page');
    });

    it('should update session duration over time', async () => {
      const session = initializeSession();
      const initialDuration = session.duration;
      
      // Wait a small amount of time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Trigger an activity update
      incrementUserAction();
      
      const updatedSession = getCurrentSession();
      expect(updatedSession?.duration).toBeGreaterThan(initialDuration);
    });
  });

  describe('Logger Integration with Session Information', () => {
    it('should include session information in logger error reports', () => {
      initializeSession();
      const testError = new Error('Test logger error');
      
      logger.error('Test error message', { component: 'TestComponent' }, testError);

      expect(Sentry.captureException).toHaveBeenCalledWith(testError, expect.objectContaining({
        contexts: expect.objectContaining({
          session: expect.objectContaining({
            sessionId: 'test-session-id-123',
          }),
        }),
        tags: expect.objectContaining({
          sessionId: 'test-session-id-123',
        }),
        extra: expect.objectContaining({
          sessionDuration: expect.any(Number),
          pageViews: expect.any(Number),
          userActions: expect.any(Number),
        }),
      }));
    });

    it('should include session information in logger warning reports', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      initializeSession();
      
      logger.warn('Test warning message', { component: 'TestComponent' });

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test warning message', expect.objectContaining({
        contexts: expect.objectContaining({
          session: expect.objectContaining({
            sessionId: 'test-session-id-123',
          }),
        }),
        tags: expect.objectContaining({
          sessionId: 'test-session-id-123',
        }),
        extra: expect.objectContaining({
          sessionDuration: expect.any(Number),
          pageViews: expect.any(Number),
          userActions: expect.any(Number),
        }),
      }));

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Session Context Updates', () => {
    it('should update Sentry context when session information changes', () => {
      initializeSession();
      
      // Clear previous calls
      jest.clearAllMocks();
      
      incrementUserAction();
      
      // Should have updated the session context
      expect(Sentry.setContext).toHaveBeenCalledWith('session', expect.objectContaining({
        sessionId: 'test-session-id-123',
        userActions: 1,
      }));
    });
  });
});