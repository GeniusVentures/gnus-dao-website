"use client";

import {
  getCachedRuntimeEnv,
  isRuntimeEnvLoaded,
  preloadRuntimeEnv,
} from "@/lib/config/runtime-env";
import React, { createContext, useContext, useEffect, useState } from "react";

interface RuntimeEnvContextType {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  walletConnectProjectId: string | null;
  contractAddress: string | null;
}

const RuntimeEnvContext = createContext<RuntimeEnvContextType>({
  isLoaded: false,
  isLoading: true,
  error: null,
  walletConnectProjectId: null,
  contractAddress: null,
});

export function useRuntimeEnv() {
  return useContext(RuntimeEnvContext);
}

interface RuntimeEnvProviderProps {
  children: React.ReactNode;
}

export function RuntimeEnvProvider({ children }: RuntimeEnvProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletConnectProjectId, setWalletConnectProjectId] = useState<
    string | null
  >(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);

  useEffect(() => {
    // Check if already loaded
    if (isRuntimeEnvLoaded()) {
      const env = getCachedRuntimeEnv();
      if (env) {
        setWalletConnectProjectId(
          env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || null,
        );
        setContractAddress(env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS || null);
        setIsLoaded(true);
        setIsLoading(false);
        return;
      }
    }

    // Load runtime environment
    const loadEnv = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const env = await preloadRuntimeEnv();

        setWalletConnectProjectId(
          env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || null,
        );
        setContractAddress(env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS || null);
        setIsLoaded(true);

        // Set global indicators for debugging
        if (typeof window !== "undefined") {
          window.__RUNTIME_ENV_LOADED__ = true;
          window.__WALLETCONNECT_PROJECT_ID__ =
            env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
          window.__RUNTIME_ENV__ = env;
        }

        console.log(
          "[RuntimeEnvProvider] Runtime environment loaded successfully",
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load runtime environment";
        setError(errorMessage);
        console.error(
          "[RuntimeEnvProvider] Failed to load runtime environment:",
          err,
        );

        // Set fallback values
        setWalletConnectProjectId("805f6520f2f2934352c65fe6bd70d15d");
        setContractAddress("0x84Ba28d277ded98b3488C906E90B6435B116D5b4");
        setIsLoaded(true);

        // Set global indicators for debugging (fallback)
        if (typeof window !== "undefined") {
          window.__RUNTIME_ENV_LOADED__ = true;
          window.__WALLETCONNECT_PROJECT_ID__ =
            "805f6520f2f2934352c65fe6bd70d15d";
          window.__RUNTIME_ENV_ERROR__ = errorMessage;
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadEnv();
  }, []);

  const contextValue: RuntimeEnvContextType = {
    isLoaded,
    isLoading,
    error,
    walletConnectProjectId,
    contractAddress,
  };

  return (
    <div data-runtime-env-provider="true">
      <RuntimeEnvContext.Provider value={contextValue}>
        {children}
      </RuntimeEnvContext.Provider>
    </div>
  );
}

/**
 * Loading component for runtime environment.
 * Renders children immediately — config loads in the background.
 * Only blocks rendering if config is still loading AND walletConnectProjectId
 * is not yet available (i.e. nothing useful to show yet).
 */
export function RuntimeEnvLoader({ children }: { children: React.ReactNode }) {
  // Don't block rendering — let the app load while config resolves in background
  return <>{children}</>;
}
