"use client";

import React from "react";
import { Shield, ShieldCheck, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { useSiwe } from "@/lib/auth/useSiwe";
import { toast } from "react-hot-toast";

interface AuthButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
}

export function AuthButton({
  variant = "default",
  size = "md",
  showStatus = true,
  className,
}: AuthButtonProps) {
  const { wallet } = useWeb3Store();
  const {
    isAuthenticated,
    isAuthenticating,
    error,
    signIn,
    signOut,
    sessionInfo,
    needsAuthentication,
    canAuthenticate,
    clearError,
  } = useSiwe();

  const handleSignIn = async () => {
    if (!canAuthenticate()) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      clearError();
      await signIn();
      toast.success("Successfully authenticated with Ethereum!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      toast.error(message);
    }
  };

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out successfully");
  };

  // Don't show if wallet is not connected
  if (!wallet.isConnected) {
    return null;
  }

  // Show authentication status
  if (isAuthenticated && showStatus) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Authenticated
            </span>
            {sessionInfo.timeUntilExpiry && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expires in {sessionInfo.timeUntilExpiry}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
        >
          Sign Out
        </Button>
      </div>
    );
  }

  // Show authentication needed
  if (needsAuthentication()) {
    return (
      <div className="flex items-center gap-2">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              ⚠️
            </span>
          </div>
        )}
        <Button
          variant={variant}
          size={size === "md" ? "default" : size}
          onClick={handleSignIn}
          disabled={isAuthenticating}
          className={`flex items-center gap-2 ${className || ""}`}
        >
          <Shield className="h-4 w-4" />
          {isAuthenticating ? "Authenticating..." : "SIWE"}
        </Button>
      </div>
    );
  }

  return null;
}

interface AuthStatusProps {
  compact?: boolean;
  className?: string;
}

export function AuthStatus({ compact = false, className }: AuthStatusProps) {
  const { wallet } = useWeb3Store();
  const { isAuthenticated, sessionInfo, needsAuthentication } = useSiwe();

  if (!wallet.isConnected) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-2 w-2 bg-gray-400 rounded-full" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Not connected
        </span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Authenticated
          </span>
          {!compact && sessionInfo.timeUntilExpiry && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Expires in {sessionInfo.timeUntilExpiry}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (needsAuthentication()) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
        <span className="text-sm text-yellow-700 dark:text-yellow-300">
          ⚠️
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 w-2 bg-gray-400 rounded-full" />
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Ready to authenticate
      </span>
    </div>
  );
}

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({
  children,
  fallback,
  requireAuth = true,
}: AuthGuardProps) {
  const { wallet } = useWeb3Store();
  const { isAuthenticated, needsAuthentication } = useSiwe();

  // If auth is not required, skip all checks and show children
  if (!requireAuth) {
    return <>{children}</>;
  }

  if (!wallet.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Shield className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Wallet Connection Required
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Please connect your wallet to access this feature.
        </p>
      </div>
    );
  }

  if (requireAuth && needsAuthentication()) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Shield className="h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            ⚠️
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please sign in with Ethereum to access governance features.
          </p>
          <AuthButton />
        </div>
      )
    );
  }

  if (requireAuth && !isAuthenticated) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Authentication Failed
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your authentication session is invalid. Please sign in again.
          </p>
          <AuthButton />
        </div>
      )
    );
  }

  return <>{children}</>;
}
