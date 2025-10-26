'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { preloadRuntimeEnv, isRuntimeEnvLoaded, getCachedRuntimeEnv } from '@/lib/config/runtime-env'

interface RuntimeEnvContextType {
  isLoaded: boolean
  isLoading: boolean
  error: string | null
  walletConnectProjectId: string | null
  contractAddress: string | null
}

const RuntimeEnvContext = createContext<RuntimeEnvContextType>({
  isLoaded: false,
  isLoading: true,
  error: null,
  walletConnectProjectId: null,
  contractAddress: null,
})

export function useRuntimeEnv() {
  return useContext(RuntimeEnvContext)
}

interface RuntimeEnvProviderProps {
  children: React.ReactNode
}

export function RuntimeEnvProvider({ children }: RuntimeEnvProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [walletConnectProjectId, setWalletConnectProjectId] = useState<string | null>(null)
  const [contractAddress, setContractAddress] = useState<string | null>(null)

  useEffect(() => {
    // Check if already loaded
    if (isRuntimeEnvLoaded()) {
      const env = getCachedRuntimeEnv()
      if (env) {
        setWalletConnectProjectId(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)
        setContractAddress(env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS)
        setIsLoaded(true)
        setIsLoading(false)
        return
      }
    }

    // Load runtime environment
    const loadEnv = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const env = await preloadRuntimeEnv()
        
        setWalletConnectProjectId(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)
        setContractAddress(env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS)
        setIsLoaded(true)

        // Set global indicators for debugging
        if (typeof window !== 'undefined') {
          window.__RUNTIME_ENV_LOADED__ = true
          window.__WALLETCONNECT_PROJECT_ID__ = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
          window.__RUNTIME_ENV__ = env
        }

        console.log('[RuntimeEnvProvider] Runtime environment loaded successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load runtime environment'
        setError(errorMessage)
        console.error('[RuntimeEnvProvider] Failed to load runtime environment:', err)
        
        // Set fallback values
        setWalletConnectProjectId('805f6520f2f2934352c65fe6bd70d15d')
        setContractAddress('0x57AE78C65F7Dd6d158DE9F4cA9CCeaA98C988199')
        setIsLoaded(true)

        // Set global indicators for debugging (fallback)
        if (typeof window !== 'undefined') {
          window.__RUNTIME_ENV_LOADED__ = true
          window.__WALLETCONNECT_PROJECT_ID__ = '805f6520f2f2934352c65fe6bd70d15d'
          window.__RUNTIME_ENV_ERROR__ = errorMessage
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadEnv()
  }, [])

  const contextValue: RuntimeEnvContextType = {
    isLoaded,
    isLoading,
    error,
    walletConnectProjectId,
    contractAddress,
  }

  return (
    <div data-runtime-env-provider="true">
      <RuntimeEnvContext.Provider value={contextValue}>
        {children}
      </RuntimeEnvContext.Provider>
    </div>
  )
}

/**
 * Loading component for runtime environment
 */
export function RuntimeEnvLoader({ children }: { children: React.ReactNode }) {
  const { isLoading, error } = useRuntimeEnv()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="text-red-500 text-lg">⚠️</div>
          <h3 className="text-lg font-semibold">Configuration Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
