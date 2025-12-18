/**
 * Tests for ErrorBoundary component
 */

// Mock logger - must be at the top before any imports
jest.mock('@/lib/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    user: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import React from 'react';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch and display error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/This component failed to load properly/i)).toBeInTheDocument();
  });

  it('should show retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should reset error state when retry is clicked', () => {
    let shouldThrow = true;
    const DynamicComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <DynamicComponent />
      </ErrorBoundary>
    );

    // Verify error is shown
    expect(screen.getByText(/Component Error/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    
    // Change the component to not throw after retry
    shouldThrow = false;
    
    fireEvent.click(retryButton);

    // After retry, the error boundary should reset and show the non-error component
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should show report button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // The component only shows a Retry button, not a Report button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should display custom fallback if provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should handle different error levels', () => {
    render(
      <ErrorBoundary level="component">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
  });

  it('should show navigation button for page-level errors', () => {
    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const homeButton = screen.getByRole('button', { name: /home/i });
    expect(homeButton).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should have proper heading
    const heading = screen.getByRole('heading');
    expect(heading).toBeInTheDocument();

    // Buttons should be accessible
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
  });
});

