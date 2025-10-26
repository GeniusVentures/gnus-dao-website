"use client";

import React, { ReactNode } from "react";
import { useSiwe } from "@/lib/auth/useSiwe";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { Button } from "@/components/ui/Button";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface SiweGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  onAuthRequired?: () => void;
}

/**
 * SIWE Guard Component
 * Protects content that requires SIWE authentication
 * Shows sign-in prompt if user is not authenticated
 */
export function SiweGuard({
  children,
  fallback,
  requireAuth = true,
  onAuthRequired,
}: SiweGuardProps) {
  const { wallet } = useWeb3Store();
  const {
    isAuthenticated,
    isAuthenticating,
    signIn,
    needsAuthentication,
    canAuthenticate,
  } = useSiwe();

  // If auth not required, show children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If wallet not connected, show connect wallet message
  if (!wallet.isConnected) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-lg bg-muted/50">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wallet Required</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Please connect your wallet to access this feature
          </p>
        </div>
      )
    );
  }

  // If authenticated, show children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If authenticating, show loading state
  if (isAuthenticating) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-lg bg-muted/50">
          <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Authenticating...</h3>
          <p className="text-sm text-muted-foreground text-center">
            Please sign the message in your wallet
          </p>
        </div>
      )
    );
  }

  // If needs authentication, show sign-in prompt
  if (needsAuthentication() && canAuthenticate()) {
    const handleSignIn = async () => {
      try {
        await signIn();
        toast.success("Successfully authenticated!");
        onAuthRequired?.();
      } catch (error) {
        console.error("SIWE sign in failed:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to authenticate. Please try again."
        );
      }
    };

    return (
      fallback || (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-lg bg-muted/50">
          <Shield className="h-12 w-12 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Authentication Required
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
            This action requires you to sign in with Ethereum (SIWE) to verify
            your wallet ownership. This is a secure, gasless signature.
          </p>
          <Button onClick={handleSignIn} disabled={isAuthenticating}>
            {isAuthenticating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Sign In with Ethereum
              </>
            )}
          </Button>
        </div>
      )
    );
  }

  // Fallback: show children (shouldn't reach here normally)
  return <>{children}</>;
}

/**
 * Hook to check SIWE authentication before action
 * Returns a function that checks auth and executes callback if authenticated
 */
export function useSiweProtectedAction() {
  const { isAuthenticated, signIn, canAuthenticate } = useSiwe();
  const { wallet } = useWeb3Store();

  const executeProtected = async <T,>(
    action: () => Promise<T> | T,
    options?: {
      requireAuth?: boolean;
      onAuthRequired?: () => void;
      errorMessage?: string;
    }
  ): Promise<T | null> => {
    const {
      requireAuth = true,
      onAuthRequired,
      errorMessage = "Authentication required",
    } = options || {};

    // Check wallet connection
    if (!wallet.isConnected) {
      toast.error("Please connect your wallet first");
      return null;
    }

    // If auth not required, execute immediately
    if (!requireAuth) {
      return await action();
    }

    // If already authenticated, execute action
    if (isAuthenticated) {
      return await action();
    }

    // If can authenticate, prompt for sign-in
    if (canAuthenticate()) {
      try {
        await signIn();
        toast.success("Successfully authenticated!");
        onAuthRequired?.();
        return await action();
      } catch (error) {
        console.error("SIWE authentication failed:", error);
        toast.error(
          error instanceof Error ? error.message : errorMessage
        );
        return null;
      }
    }

    // Cannot authenticate
    toast.error(errorMessage);
    return null;
  };

  return {
    executeProtected,
    isAuthenticated,
    canAuthenticate: canAuthenticate(),
  };
}

