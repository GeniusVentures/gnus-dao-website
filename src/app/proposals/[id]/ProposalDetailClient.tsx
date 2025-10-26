"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  MinusCircle,
  ExternalLink,
  Copy,
  Vote,
  Play,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthGuard } from "@/components/auth/AuthButton";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { ProposalState, VoteSupport } from "@/lib/contracts/gnusDao";
import type { Proposal, VoteReceipt } from "@/lib/contracts/gnusDao";
import { formatAddress } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { QuadraticVotingModal } from "@/components/voting/QuadraticVotingModal";

interface ProposalWithMetadata extends Proposal {
  title: string;
  description: string;
  state: ProposalState;
  totalVotes: bigint;
  quorumReached: boolean;
  timeRemaining: string;
}

export default function ProposalDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { wallet, provider, signer, gnusDaoInitialized } = useWeb3Store();

  const [proposal, setProposal] = useState<ProposalWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [userVote, setUserVote] = useState<VoteReceipt | null>(null);
  const [showQuadraticModal, setShowQuadraticModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [canExecute, setCanExecute] = useState(false);
  const [canCancel, setCanCancel] = useState(false);

  const proposalId = params.id as string;

  const calculateTimeRemaining = (endBlock: bigint): string => {
    // Simplified calculation using estimated current Sepolia block
    const currentBlock = 9241000; // Approximate current Sepolia block
    const blocksRemaining = Number(endBlock) - currentBlock;
    if (blocksRemaining <= 0) return "Voting ended";

    const secondsRemaining = blocksRemaining * 12; // 12 second blocks on Sepolia
    const hoursRemaining = Math.floor(secondsRemaining / 3600);
    if (hoursRemaining < 24) return `${hoursRemaining} hours remaining`;

    const daysRemaining = Math.floor(hoursRemaining / 24);
    return `${daysRemaining} days remaining`;
  };

  // Load proposal data function
  const loadProposal = async () => {
    if (!proposalId) {
      setLoading(false);
      return;
    }

      // Initialize service if not already done
      if (!gnusDaoInitialized && provider && signer) {
        try {
          const network = await provider.getNetwork();
          await gnusDaoService.initialize(
            provider,
            signer,
            Number(network.chainId),
          );
        } catch (error) {
          console.error("Failed to initialize DAO service:", error);
          setLoading(false);
          return;
        }
      }

      try {
        const id = BigInt(proposalId);
        const [proposalData, state, votingConfig] = await Promise.all([
          gnusDaoService.getProposal(id),
          gnusDaoService.getProposalState(id),
          gnusDaoService.getVotingConfig(),
        ]);

        if (proposalData) {
          // Calculate metadata
          const totalVotes =
            proposalData.forVotes +
            proposalData.againstVotes +
            proposalData.abstainVotes;

          // Get actual quorum threshold from voting config
          const quorumThreshold = votingConfig?.quorumThreshold
            ? BigInt(votingConfig.quorumThreshold)
            : 0n;

          // Only mark quorum as reached if:
          // 1. There are actual votes (totalVotes > 0)
          // 2. The votes meet or exceed the threshold
          // 3. The proposal is not in Pending state (voting has started)
          const quorumReached =
            totalVotes > 0n &&
            totalVotes >= quorumThreshold &&
            state !== ProposalState.Pending;

          const timeRemaining = calculateTimeRemaining(proposalData.endBlock);

          // Create meaningful title and description based on proposal data
          // Try to get real data from the proposal, fallback to generated content
          let title = proposalData.title || `Proposal #${id}`;
          let description = proposalData.ipfsHash
            ? `Proposal with IPFS metadata: ${proposalData.ipfsHash}`
            : `Governance proposal submitted by ${proposalData.proposer.slice(0, 6)}...${proposalData.proposer.slice(-4)}`;

          // If we have sample data, use it
          const sampleProposals = [
            {
              id: 1,
              title: "Increase GPU Provider Rewards",
              description:
                "Proposal to increase rewards for GPU providers to incentivize more participation in the network.",
            },
            {
              id: 2,
              title: "Mobile GPU Integration Program",
              description:
                "Initiative to integrate mobile GPU resources into the GNUS network for distributed computing.",
            },
            {
              id: 3,
              title: "IPFS Storage Optimization",
              description:
                "Optimize IPFS storage mechanisms to improve data retrieval speeds and reduce costs.",
            },
          ];

          const sampleProposal = sampleProposals.find(
            (p) => p.id === Number(id),
          );
          if (sampleProposal) {
            title = sampleProposal.title;
            description = sampleProposal.description;
          }

          const proposalWithMetadata: ProposalWithMetadata = {
            ...proposalData,
            title,
            description,
            state,
            totalVotes,
            quorumReached,
            timeRemaining,
          };

          setProposal(proposalWithMetadata);

          // Load user's vote if connected
          if (wallet.address) {
            const voteReceipt = await gnusDaoService.getVoteReceipt(
              id,
              wallet.address,
            );
            setUserVote(voteReceipt);
          }
        }
      } catch (error) {
        console.error("Failed to load proposal:", error);
        toast.error("Failed to load proposal");
      } finally {
        setLoading(false);
      }
  };

  // Load proposal data on mount and when dependencies change
  useEffect(() => {
    loadProposal();
  }, [gnusDaoInitialized, proposalId, wallet.address]);

  // Check if user can execute or cancel proposal
  useEffect(() => {
    const checkPermissions = async () => {
      if (!wallet.address || !proposal) return;

      try {
        // Can execute if proposal succeeded
        setCanExecute(proposal.state === ProposalState.Succeeded);

        // Can cancel if user is proposer or owner
        const owner = await gnusDaoService.getOwner();
        const isProposer = proposal.proposer.toLowerCase() === wallet.address.toLowerCase();
        const isOwner = owner.toLowerCase() === wallet.address.toLowerCase();
        setCanCancel((isProposer || isOwner) &&
          (proposal.state === ProposalState.Pending || proposal.state === ProposalState.Active));
      } catch (error) {
        console.error("Error checking permissions:", error);
      }
    };

    checkPermissions();
  }, [wallet.address, proposal]);

  const handleExecute = async () => {
    if (!proposal) return;

    setIsExecuting(true);
    try {
      const tx = await gnusDaoService.executeProposal(BigInt(proposalId));
      toast.success("Executing proposal...");

      await tx.wait();
      toast.success("Proposal executed successfully!");

      // Reload proposal data
      loadProposal();
    } catch (error: any) {
      console.error("Execution failed:", error);
      toast.error(error.message || "Failed to execute proposal");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = async () => {
    if (!proposal) return;

    setIsCanceling(true);
    try {
      const tx = await gnusDaoService.cancelProposal(BigInt(proposalId));
      toast.success("Canceling proposal...");

      await tx.wait();
      toast.success("Proposal canceled successfully!");

      // Reload proposal data
      loadProposal();
    } catch (error: any) {
      console.error("Cancellation failed:", error);
      toast.error(error.message || "Failed to cancel proposal");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleVote = async (support: VoteSupport) => {
    if (!proposal || !wallet.address) return;

    setVoting(true);
    try {
      const tx = await gnusDaoService.castVote(BigInt(proposalId), support);
      toast.success("Vote submitted successfully!");

      // Refresh vote receipt
      const voteReceipt = await gnusDaoService.getVoteReceipt(
        BigInt(proposalId),
        wallet.address,
      );
      setUserVote(voteReceipt);
    } catch (error) {
      console.error("Vote failed:", error);
      toast.error("Failed to submit vote");
    } finally {
      setVoting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStateColor = (state: ProposalState) => {
    switch (state) {
      case ProposalState.Active:
        return "text-green-600 bg-green-100";
      case ProposalState.Succeeded:
        return "text-blue-600 bg-blue-100";
      case ProposalState.Defeated:
        return "text-red-600 bg-red-100";
      case ProposalState.Executed:
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStateName = (state: ProposalState) => {
    switch (state) {
      case ProposalState.Pending:
        return "Pending";
      case ProposalState.Active:
        return "Active";
      case ProposalState.Canceled:
        return "Canceled";
      case ProposalState.Defeated:
        return "Defeated";
      case ProposalState.Succeeded:
        return "Succeeded";
      case ProposalState.Queued:
        return "Queued";
      case ProposalState.Expired:
        return "Expired";
      case ProposalState.Executed:
        return "Executed";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
              <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                <div className="h-4 bg-gray-300 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Proposals
          </Button>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Proposal Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The proposal you're looking for doesn't exist or hasn't been
              loaded yet.
            </p>
            <Button onClick={() => router.push("/proposals")}>
              View All Proposals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Proposals
        </Button>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1
                  className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
                  data-testid="proposal-title"
                >
                  Proposal #{proposalId}
                </h1>
                <p
                  className="text-gray-600 dark:text-gray-400"
                  data-testid="proposal-description"
                >
                  {proposal.description}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStateColor(proposal.state)}`}
                data-testid="proposal-status"
              >
                {getStateName(proposal.state)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <User className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm">Proposer</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatAddress(proposal.proposer)}
                  </p>
                </div>
              </div>

              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Calendar className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm">Start Block</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {proposal.startBlock.toString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Clock className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm">End Block</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {proposal.endBlock.toString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Voting Results */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Voting Results
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-900 dark:text-green-100">
                      For
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {proposal.forVotes.toString()}
                  </span>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="font-medium text-red-900 dark:text-red-100">
                      Against
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">
                    {proposal.againstVotes.toString()}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <MinusCircle className="w-5 h-5 text-gray-600 mr-2" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Abstain
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-gray-600">
                    {proposal.abstainVotes.toString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Proposal Actions - Execute/Cancel */}
          {wallet.isConnected && (canExecute || canCancel) && (
            <div className="p-8 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Proposal Actions
              </h2>
              <div className="flex gap-4">
                {canExecute && (
                  <Button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isExecuting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Execute Proposal
                      </>
                    )}
                  </Button>
                )}
                {canCancel && (
                  <Button
                    onClick={handleCancel}
                    disabled={isCanceling}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    {isCanceling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Canceling...
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4 mr-2" />
                        Cancel Proposal
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Voting Actions */}
          {(wallet.isConnected || true) &&
            proposal.state === ProposalState.Active && (
              <div className="p-8 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Cast Your Vote
                </h2>

                {userVote ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                    <p className="text-blue-900 dark:text-blue-100">
                      You have already voted:{" "}
                      <strong>
                        {userVote.support === VoteSupport.For
                          ? "For"
                          : userVote.support === VoteSupport.Against
                            ? "Against"
                            : "Abstain"}
                      </strong>
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Votes: {userVote.votes.toString()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <Button
                        onClick={() => handleVote(VoteSupport.For)}
                        disabled={voting}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="vote-for-button"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Vote For
                      </Button>

                      <Button
                        onClick={() => handleVote(VoteSupport.Against)}
                        disabled={voting}
                        className="bg-red-600 hover:bg-red-700"
                        data-testid="vote-against-button"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Vote Against
                      </Button>

                      <Button
                        onClick={() => handleVote(VoteSupport.Abstain)}
                        disabled={voting}
                        variant="outline"
                        data-testid="vote-abstain-button"
                      >
                        <MinusCircle className="w-4 h-4 mr-2" />
                        Abstain
                      </Button>

                      <Button
                        onClick={() => setShowQuadraticModal(true)}
                        disabled={voting}
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <Vote className="w-4 h-4 mr-2" />
                        Quadratic Vote
                      </Button>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your voting power: {/* Add voting power display here */}
                    </p>
                  </div>
                )}
              </div>
            )}

          {!wallet.isConnected && (
            <div className="p-8">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Connect your wallet to participate in governance
                </p>
                <AuthGuard>
                  <Button>Connect Wallet</Button>
                </AuthGuard>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quadratic Voting Modal */}
      {showQuadraticModal && (
        <QuadraticVotingModal
          proposalId={BigInt(proposalId)}
          proposalTitle={`Proposal #${proposalId}`}
          onClose={() => setShowQuadraticModal(false)}
          onVoteSubmitted={() => {
            setShowQuadraticModal(false);
            // Refresh vote receipt
            if (wallet.address) {
              gnusDaoService
                .getVoteReceipt(BigInt(proposalId), wallet.address)
                .then(setUserVote);
            }
          }}
        />
      )}
    </div>
  );
}
