"use client";

import { Button } from "@/components/ui/Button";
import { ProposalState } from "@/lib/contracts/gnusDao";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface ExecutionModalProps {
  proposalId: bigint;
  proposalTitle: string;
  proposalState: ProposalState;
  onClose: () => void;
  onExecuted: () => void;
}

interface ExecutionInfo {
  canExecute: boolean;
  canQueue: boolean;
  isQueued: boolean;
  eta: bigint;
  timeUntilExecution: number;
  reason?: string;
}

export function ExecutionModal({
  proposalId,
  proposalTitle,
  proposalState,
  onClose,
  onExecuted,
}: ExecutionModalProps) {
  const { wallet } = useWeb3Store();
  const [loading, setLoading] = useState(false);
  const [executionInfo, setExecutionInfo] = useState<ExecutionInfo | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    loadExecutionInfo();
  }, [proposalId, wallet.address]);

  const loadExecutionInfo = async () => {
    setLoadingInfo(true);
    try {
      // Check if user is owner
      if (wallet.address) {
        const owner = await gnusDaoService.getOwner();
        setIsOwner(owner.toLowerCase() === wallet.address.toLowerCase());
      }

      // Get proposal details
      const proposal = await gnusDaoService.getProposal(proposalId);
      if (!proposal) {
        throw new Error("Proposal not found");
      }

      // Determine execution status
      const info: ExecutionInfo = {
        canExecute: false,
        canQueue: false,
        isQueued: proposal.eta > 0n,
        eta: proposal.eta,
        timeUntilExecution: 0,
      };

      const now = Math.floor(Date.now() / 1000);

      switch (proposalState) {
        case ProposalState.Succeeded:
          // Proposal succeeded, can be queued
          info.canQueue = true;
          info.reason = "Proposal succeeded and can be queued for execution";
          break;

        case ProposalState.Queued:
          // Proposal is queued, check if execution time has passed
          info.isQueued = true;
          info.timeUntilExecution = Number(proposal.eta) - now;
          
          if (info.timeUntilExecution <= 0) {
            info.canExecute = true;
            info.reason = "Proposal is ready for execution";
          } else {
            info.reason = `Proposal will be executable in ${formatTimeRemaining(info.timeUntilExecution)}`;
          }
          break;

        case ProposalState.Executed:
          info.reason = "Proposal has already been executed";
          break;

        case ProposalState.Canceled:
          info.reason = "Proposal has been canceled";
          break;

        case ProposalState.Defeated:
          info.reason = "Proposal was defeated and cannot be executed";
          break;

        case ProposalState.Expired:
          info.reason = "Proposal has expired and cannot be executed";
          break;

        default:
          info.reason = "Proposal is not ready for execution";
      }

      setExecutionInfo(info);
    } catch (error) {
      console.error("Error loading execution info:", error);
      toast.error("Failed to load execution information");
    } finally {
      setLoadingInfo(false);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return "Ready now";
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleQueue = async () => {
    if (!wallet.address || !executionInfo?.canQueue) return;

    setLoading(true);
    try {
      const tx = await gnusDaoService.queueProposal(proposalId);
      toast.success("Proposal queued successfully!");
      await loadExecutionInfo(); // Refresh info
      onExecuted();
    } catch (error: any) {
      console.error("Queue error:", error);
      toast.error(error.message || "Failed to queue proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!wallet.address || !executionInfo?.canExecute) return;

    setLoading(true);
    try {
      const tx = await gnusDaoService.executeProposal(proposalId);
      toast.success("Proposal executed successfully!");
      onExecuted();
      onClose();
    } catch (error: any) {
      console.error("Execution error:", error);
      toast.error(error.message || "Failed to execute proposal");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (loadingInfo) {
      return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>;
    }

    if (!executionInfo) return <XCircle className="w-5 h-5 text-red-500" />;

    if (executionInfo.canExecute) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }

    if (executionInfo.canQueue) {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    }

    if (executionInfo.isQueued) {
      return <Clock className="w-5 h-5 text-blue-500" />;
    }

    return <XCircle className="w-5 h-5 text-gray-500" />;
  };

  const getStatusColor = () => {
    if (!executionInfo) return "text-red-600";
    
    if (executionInfo.canExecute) return "text-green-600";
    if (executionInfo.canQueue) return "text-yellow-600";
    if (executionInfo.isQueued) return "text-blue-600";
    return "text-gray-600";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Execute Proposal
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {proposalTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Status Display */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              {getStatusIcon()}
              <span className={`font-medium ${getStatusColor()}`}>
                {loadingInfo ? "Loading..." : executionInfo?.reason || "Unknown status"}
              </span>
            </div>

            {executionInfo?.isQueued && executionInfo.timeUntilExecution > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    Execution available in {formatTimeRemaining(executionInfo.timeUntilExecution)}
                  </span>
                </div>
              </div>
            )}

            {!isOwner && (executionInfo?.canQueue || executionInfo?.canExecute) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                    Only the contract owner can queue and execute proposals
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Execution Details */}
          {executionInfo && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Execution Process
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    proposalState === ProposalState.Succeeded ? "bg-green-500" : "bg-gray-300"
                  }`}></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Proposal Succeeded
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    executionInfo.isQueued ? "bg-green-500" : 
                    executionInfo.canQueue ? "bg-yellow-500" : "bg-gray-300"
                  }`}></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Queue for Execution
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    executionInfo.canExecute ? "bg-green-500" : "bg-gray-300"
                  }`}></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Execute Proposal
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Close
            </Button>

            {executionInfo?.canQueue && isOwner && (
              <Button
                onClick={handleQueue}
                disabled={loading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Queuing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Queue</span>
                  </div>
                )}
              </Button>
            )}

            {executionInfo?.canExecute && isOwner && (
              <Button
                onClick={handleExecute}
                disabled={loading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Executing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    <span>Execute</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}