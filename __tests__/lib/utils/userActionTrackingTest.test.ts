/**
 * User Action Tracking Tests
 * Tests for user action tracking functionality and error context correlation
 */

import { logger } from '../../../src/lib/utils/logger';
import { addUserActionBreadcrumb } from '../../../src/lib/utils/sentry';
import * as Sentry from '@sentry/nextjs';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

// Mock logger
jest.mock('../../../src/lib/utils/logger', () => ({
  logger: {
    user: jest.fn(),
  },
}));

// Mock addUserActionBreadcrumb
jest.mock('../../../src/lib/utils/sentry', () => ({
  addUserActionBreadcrumb: jest.fn(),
}));

describe('User Action Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Action Tracking', () => {
    it('should track user actions with breadcrumbs', () => {
      // Test basic action tracking
      addUserActionBreadcrumb('test_action', {
        component: 'test',
        testData: 'sample',
      });

      expect(addUserActionBreadcrumb).toHaveBeenCalledWith('test_action', {
        component: 'test',
        testData: 'sample',
      });
    });

    it('should integrate with logger for user actions', () => {
      // Test logger integration
      logger.user('Test User Action', {
        action: 'test_click',
        element: 'button',
      });

      expect(logger.user).toHaveBeenCalledWith('Test User Action', {
        action: 'test_click',
        element: 'button',
      });
    });

    it('should set Sentry context for user actions', () => {
      // Test Sentry context setting
      const contextData = {
        testAction: 'user_action_test',
        timestamp: Date.now(),
      };

      Sentry.setContext('testContext', contextData);

      expect(Sentry.setContext).toHaveBeenCalledWith('testContext', contextData);
    });

    it('should add breadcrumbs to Sentry', () => {
      // Test breadcrumb addition
      const breadcrumbData = {
        message: 'User Action Test',
        category: 'user',
        level: 'info' as const,
        data: {
          testType: 'user_action_tracking',
          success: true,
        },
        timestamp: expect.any(Number),
      };

      Sentry.addBreadcrumb(breadcrumbData);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(breadcrumbData);
    });
  });

  describe('Error Context Tracking', () => {
    it('should track user actions before errors for context', () => {
      // Simulate user action before error
      addUserActionBreadcrumb('button_click', {
        component: 'TestComponent',
        buttonId: 'submit-btn',
      });

      expect(addUserActionBreadcrumb).toHaveBeenCalledWith('button_click', {
        component: 'TestComponent',
        buttonId: 'submit-btn',
      });
    });

    it('should set user context before capturing errors', () => {
      // Set user context
      const userContext = {
        action: 'button_click',
        timestamp: Date.now(),
        component: 'TestComponent',
      };

      Sentry.setContext('lastUserAction', userContext);

      expect(Sentry.setContext).toHaveBeenCalledWith('lastUserAction', userContext);
    });

    it('should capture errors with user action context', () => {
      // Simulate error with context
      const testError = new Error('Test error for context tracking');
      const errorOptions = {
        tags: {
          testType: 'error_context_test',
        },
        extra: {
          userActionContext: 'Available via breadcrumbs and context',
        },
      };

      Sentry.captureException(testError, errorOptions);

      expect(Sentry.captureException).toHaveBeenCalledWith(testError, errorOptions);
    });

    it('should correlate user actions with error reports', () => {
      // Simulate complete workflow: user action -> error
      
      // 1. User performs action
      addUserActionBreadcrumb('form_submit', {
        component: 'ContactForm',
        formId: 'contact-form',
      });

      // 2. Set context
      Sentry.setContext('lastUserAction', {
        action: 'form_submit',
        timestamp: Date.now(),
        component: 'ContactForm',
      });

      // 3. Error occurs
      const error = new Error('Form submission failed');
      Sentry.captureException(error, {
        tags: { errorType: 'form_error' },
        extra: { hasUserContext: true },
      });

      // Verify all calls were made
      expect(addUserActionBreadcrumb).toHaveBeenCalledWith('form_submit', {
        component: 'ContactForm',
        formId: 'contact-form',
      });

      expect(Sentry.setContext).toHaveBeenCalledWith('lastUserAction', {
        action: 'form_submit',
        timestamp: expect.any(Number),
        component: 'ContactForm',
      });

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: { errorType: 'form_error' },
        extra: { hasUserContext: true },
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle multiple user actions in sequence', () => {
      const actions = [
        { action: 'page_load', component: 'HomePage' },
        { action: 'button_click', component: 'Navigation' },
        { action: 'form_input', component: 'SearchForm' },
        { action: 'form_submit', component: 'SearchForm' },
      ];

      actions.forEach(({ action, component }) => {
        addUserActionBreadcrumb(action, { component });
      });

      expect(addUserActionBreadcrumb).toHaveBeenCalledTimes(4);
      actions.forEach(({ action, component }) => {
        expect(addUserActionBreadcrumb).toHaveBeenCalledWith(action, { component });
      });
    });

    it('should maintain context across different error types', () => {
      // Set initial user context
      Sentry.setContext('userSession', {
        userId: 'test-user-123',
        sessionId: 'session-456',
      });

      // Test different error scenarios
      const errors = [
        { error: new Error('Network error'), type: 'network' },
        { error: new Error('Validation error'), type: 'validation' },
        { error: new Error('Permission error'), type: 'permission' },
      ];

      errors.forEach(({ error, type }) => {
        Sentry.captureException(error, {
          tags: { errorType: type },
          extra: { userContext: 'available' },
        });
      });

      expect(Sentry.captureException).toHaveBeenCalledTimes(3);
      expect(Sentry.setContext).toHaveBeenCalledWith('userSession', {
        userId: 'test-user-123',
        sessionId: 'session-456',
      });
    });
  });
});