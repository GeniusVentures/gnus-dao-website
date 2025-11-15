/**
 * Tests for Providers component
 */
import { render, screen } from '@testing-library/react';
import { Providers } from '@/components/providers/Providers';
import React from 'react';

// Mock all the provider dependencies
jest.mock('@/components/providers/LazyWeb3Provider', () => ({
  LazyWeb3Provider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="lazy-web3-provider">{children}</div>
  ),
}));

jest.mock('@/components/providers/ReduxProvider', () => ({
  ReduxProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="redux-provider">{children}</div>
  ),
}));

jest.mock('@/components/providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-client-provider">{children}</div>
  ),
}));

describe('Providers', () => {
  it('should render children', () => {
    render(
      <Providers>
        <div data-testid="test-child">Test Content</div>
      </Providers>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should wrap children with all providers', () => {
    render(
      <Providers>
        <div>Test</div>
      </Providers>
    );

    expect(screen.getByTestId('redux-provider')).toBeInTheDocument();
    expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByTestId('lazy-web3-provider')).toBeInTheDocument();
  });

  it('should render multiple children', () => {
    render(
      <Providers>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </Providers>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('should handle empty children', () => {
    const { container } = render(<Providers>{null}</Providers>);
    expect(container).toBeInTheDocument();
  });
});

