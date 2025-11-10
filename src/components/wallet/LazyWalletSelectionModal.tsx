"use client";

import React, { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { WalletConnector } from "@/lib/web3/types";

// Lazy load the WalletSelectionModal to reduce initial bundle size
const WalletSelectionModal = lazy(() =>
  import("./WalletSelectionModal").then((module) => ({
    default: module.WalletSelectionModal,
  })),
);

// Loading component for wallet modal
function WalletModalLoading() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">
            Loading wallets...
          </span>
        </div>
      </div>
    </div>
  );
}

// Error fallback component
function WalletModalErrorFallback({
  error,
  resetErrorBoundary,
  onClose,
}: {
  error: Error;
  resetErrorBoundary: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg p-6 w-full max-w-md">
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Wallet Loading Error
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            {error.message || "Failed to load wallet selection"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={resetErrorBoundary}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LazyWalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (connector: WalletConnector) => Promise<void>;
  connectors: WalletConnector[];
  isConnecting: boolean;
  connectingWallet?: string | undefined;
}

export function LazyWalletSelectionModal(props: LazyWalletSelectionModalProps) {
  const { isOpen, onClose } = props;

  if (!isOpen) {
    return null;
  }

  return (
    <ErrorBoundary
      fallback={
        <WalletModalErrorFallback
          error={new Error("Wallet Modal Error")}
          resetErrorBoundary={() => window.location.reload()}
          onClose={onClose}
        />
      }
      onError={(error, errorInfo) => {
        console.error("Wallet Modal Error:", error, errorInfo);
      }}
      level="component"
    >
      <Suspense fallback={<WalletModalLoading />}>
        <WalletSelectionModal {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
