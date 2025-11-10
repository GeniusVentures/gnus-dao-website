"use client";

import React, { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

// Lazy load the CreateProposalModal to reduce initial bundle size
const CreateProposalModal = lazy(() =>
  import("./CreateProposalModal").then((module) => ({
    default: module.CreateProposalModal,
  })),
);

// Loading component for proposal modal
function ProposalModalLoading() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg p-6 w-full max-w-4xl">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">
            Loading proposal form...
          </span>
        </div>
      </div>
    </div>
  );
}

// Error fallback component
function ProposalModalErrorFallback({
  error,
  resetErrorBoundary,
  onClose,
}: {
  error: Error;
  resetErrorBoundary: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg p-6 w-full max-w-md">
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Proposal Form Error
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            {error.message || "Failed to load proposal creation form"}
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

interface LazyCreateProposalModalProps {
  onClose: () => void;
  onProposalCreated: () => void;
}

export function LazyCreateProposalModal(props: LazyCreateProposalModalProps) {
  const { onClose } = props;

  return (
    <ErrorBoundary
      fallback={
        <ProposalModalErrorFallback
          error={new Error("Proposal Modal Error")}
          resetErrorBoundary={() => window.location.reload()}
          onClose={onClose}
        />
      }
      onError={(error, errorInfo) => {
        console.error("Proposal Modal Error:", error, errorInfo);
      }}
      level="component"
    >
      <Suspense fallback={<ProposalModalLoading />}>
        <CreateProposalModal {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
