'use client'

import { ReactNode, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './ThemeProvider'
import { ReduxProvider } from './ReduxProvider'
import { LazyWeb3Provider } from './LazyWeb3Provider'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('4')) {
          return false
        }
        return failureCount < 3
      },
    },
  },
})

interface ProvidersProps {
  children: ReactNode
}

function WalletConnectInitializer() {
  // WalletConnect will be initialized on-demand when user clicks Connect Wallet
  // No need for automatic initialization to avoid conflicts and improve performance

  return null
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ReduxProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LazyWeb3Provider>
            <WalletConnectInitializer />
            {children}
          </LazyWeb3Provider>
        </ThemeProvider>
      </QueryClientProvider>
    </ReduxProvider>
  )
}
