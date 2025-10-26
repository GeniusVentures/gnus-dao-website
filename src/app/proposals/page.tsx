"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthGuard } from "@/components/auth/AuthButton";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { ProposalState, VoteSupport } from "@/lib/contracts/gnusDao";
import type { Proposal } from "@/lib/contracts/gnusDao";
import { CreateProposalModal } from "@/components/proposals/CreateProposalModal";
import { DelegationBanner } from "@/components/governance/DelegationBanner";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface ProposalWithMetadata extends Proposal {
  title: string;
  description: string;
  totalVotes: bigint;
  quorumReached: boolean;
  timeRemaining: string;
  state: ProposalState;
  proposerName?: string;
  votingPeriodDays?: number;
  executionDelayDays?: number;
}

export default function ProposalsPage() {
  const { provider, signer } = useWeb3Store();
  const router = useRouter();
  const [proposals, setProposals] = useState<ProposalWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState<ProposalState | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load proposals
  useEffect(() => {
    const loadProposals = async () => {
      try {
        setLoading(true);

        // Initialize service with read-only provider if not already initialized
        if (!gnusDaoService.isInitialized()) {
          const { ethers } = await import("ethers");
          const provider = new ethers.JsonRpcProvider(
            "https://sepolia.infura.io/v3/a9555646b9fb4da6ab4cc08c782f85ee",
          );
          await gnusDaoService.initialize(provider, undefined, 11155111); // Sepolia chain ID
        }

        const proposalCount = await gnusDaoService.getProposalCount();

        // Get voting configuration
        const votingConfig = await gnusDaoService.getVotingConfig();

        if (proposalCount === 0n) {
          // Create mock proposals for demonstration when no real proposals exist
          const mockProposals: ProposalWithMetadata[] = [
            {
              id: 1n,
              proposer: "0x1234567890123456789012345678901234567890",
              title: "Increase Treasury Allocation for Development",
              ipfsHash: "QmExample1234567890abcdef",
              startTime: BigInt(Math.floor(Date.now() / 1000) - 86400), // Started 1 day ago
              endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 6), // Ends in 6 days
              totalVotes: 150000n,
              totalVoters: 45n,
              executed: false,
              cancelled: false,
              eta: 0n,
              startBlock: 0n,
              endBlock: 0n,
              forVotes: 120000n,
              againstVotes: 30000n,
              abstainVotes: 0n,
              canceled: false,
              description: "Proposal to allocate additional funds from treasury for development initiatives",
              quorumReached: true,
              timeRemaining: "6 days remaining",
              state: ProposalState.Active,
              proposerName: "Core Team",
              votingPeriodDays: 7,
              executionDelayDays: 3,
            },
            {
              id: 2n,
              proposer: "0x2345678901234567890123456789012345678901",
              title: "Update Governance Parameters",
              ipfsHash: "QmExample2345678901bcdefg",
              startTime: BigInt(Math.floor(Date.now() / 1000) - 172800), // Started 2 days ago
              endTime: BigInt(Math.floor(Date.now() / 1000) + 432000), // Ends in 5 days
              totalVotes: 80000n,
              totalVoters: 25n,
              executed: false,
              cancelled: false,
              eta: 0n,
              startBlock: 0n,
              endBlock: 0n,
              forVotes: 60000n,
              againstVotes: 20000n,
              abstainVotes: 0n,
              canceled: false,
              description: "Proposal to update voting period and quorum requirements",
              quorumReached: false,
              timeRemaining: "5 days remaining",
              state: ProposalState.Active,
              proposerName: "Community Member",
              votingPeriodDays: 7,
              executionDelayDays: 3,
            },
            {
              id: 3n,
              proposer: "0x3456789012345678901234567890123456789012",
              title: "Community Grant Program",
              ipfsHash: "QmExample3456789012cdefgh",
              startTime: BigInt(Math.floor(Date.now() / 1000) - 604800), // Started 7 days ago
              endTime: BigInt(Math.floor(Date.now() / 1000) - 86400), // Ended 1 day ago
              totalVotes: 200000n,
              totalVoters: 67n,
              executed: false,
              cancelled: false,
              eta: 0n,
              startBlock: 0n,
              endBlock: 0n,
              forVotes: 180000n,
              againstVotes: 20000n,
              abstainVotes: 0n,
              canceled: false,
              description: "Proposal to establish a community grant program for ecosystem development",
              quorumReached: true,
              timeRemaining: "Succeeded",
              state: ProposalState.Succeeded,
              proposerName: "DAO Foundation",
              votingPeriodDays: 7,
              executionDelayDays: 3,
            },
          ];
          setProposals(mockProposals);
          setLoading(false);
          return;
        }

        const proposalPromises: Promise<ProposalWithMetadata | null>[] = [];

        // Load last 20 proposals or all if less than 20
        const startId = proposalCount > 20n ? proposalCount - 20n : 1n;
        for (let i = startId; i <= proposalCount; i++) {
          proposalPromises.push(loadProposalWithMetadata(i, votingConfig));
        }

        const loadedProposals = await Promise.all(proposalPromises);
        const validProposals = loadedProposals.filter(
          (p): p is ProposalWithMetadata => p !== null,
        );

        // Sort by ID descending (newest first)
        validProposals.sort((a, b) => Number(b.id - a.id));
        setProposals(validProposals);
      } catch (error) {
        console.error("Failed to load proposals:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProposals();
  }, []); // Remove dependency on gnusDaoInitialized

  const getProposerName = (address: string): string => {
    // Could be enhanced with ENS lookup or known addresses
    const knownAddresses: Record<string, string> = {
      "0xd446c8Ab1C2765f5185c5A2C2fF5A86d41A1": "Core Team",
      // Add more known addresses here
    };

    return (
      knownAddresses[address] || `${address.slice(0, 6)}...${address.slice(-4)}`
    );
  };

  const loadProposalWithMetadata = async (
    proposalId: bigint,
    votingConfig: any,
  ): Promise<ProposalWithMetadata | null> => {
    try {
      const [proposal, state] = await Promise.all([
        gnusDaoService.getProposal(proposalId),
        gnusDaoService.getProposalState(proposalId),
      ]);

      if (!proposal) return null;

      // Calculate metadata
      const totalVotes = proposal.totalVotes || 0n;

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

      const timeRemaining =
        proposal.endTime > 0n
          ? calculateTimeRemaining(proposal.endTime, state)
          : "No deadline";

      // Use actual proposal data
      const title = proposal.title || `Proposal #${proposalId}`;

      // Add voting configuration metadata
      // If contract returns 0, use reasonable defaults
      const rawVotingPeriod = votingConfig
        ? Number(votingConfig.votingPeriod)
        : 0;
      const rawVotingDelay = votingConfig
        ? Number(votingConfig.votingDelay)
        : 0;

      const votingPeriodDays =
        rawVotingPeriod > 0 ? rawVotingPeriod / (24 * 60 * 60) : 7; // Convert seconds to days or use default
      const executionDelayDays =
        rawVotingDelay > 0 ? rawVotingDelay / (24 * 60 * 60) : 3; // Convert seconds to days or use default

      // Get proposer name (could be enhanced with ENS lookup)
      const proposerName = getProposerName(proposal.proposer);
      const description = proposal.ipfsHash
        ? `IPFS: ${proposal.ipfsHash.slice(0, 20)}... | Submitted by ${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`
        : `Governance proposal submitted by ${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`;

      return {
        ...proposal,
        title,
        description,
        totalVotes,
        quorumReached,
        timeRemaining,
        state,
        proposerName,
        votingPeriodDays,
        executionDelayDays,
      };
    } catch (error) {
      console.error(`Failed to load proposal ${proposalId}:`, error);
      return null;
    }
  };

  const calculateTimeRemaining = (endTime: bigint | number, state?: ProposalState): string => {
    if (!endTime || endTime === 0n) return "Active (no deadline)";

    const endTimestamp =
      typeof endTime === "bigint" ? Number(endTime) : endTime;

    // If endTime is 0, it means the proposal doesn't have a proper end time set
    if (endTimestamp === 0) return "Active";

    const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const secondsRemaining = endTimestamp - now;

    // Use the actual proposal state if provided
    if (state !== undefined) {
      switch (state) {
        case ProposalState.Pending:
          return "Pending";
        case ProposalState.Active:
          if (secondsRemaining <= 0) return "Active (ending soon)";
          break;
        case ProposalState.Succeeded:
          return "Succeeded";
        case ProposalState.Defeated:
          return "Defeated";
        case ProposalState.Executed:
          return "Executed";
        case ProposalState.Canceled:
          return "Canceled";
        case ProposalState.Queued:
          return "Queued";
        case ProposalState.Expired:
          return "Expired";
      }
    }

    if (secondsRemaining <= 0) return "Voting ended";

    const hoursRemaining = secondsRemaining / 3600;

    if (hoursRemaining < 1) {
      const minutesRemaining = Math.ceil(secondsRemaining / 60);
      return `${minutesRemaining} minutes remaining`;
    } else if (hoursRemaining < 24) {
      return `${Math.ceil(hoursRemaining)} hours remaining`;
    } else {
      const daysRemaining = Math.ceil(hoursRemaining / 24);
      return `${daysRemaining} days remaining`;
    }
  };



  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch =
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterState === "all" || proposal.state === filterState;
    return matchesSearch && matchesFilter;
  });

  // Show proposals interface even when not initialized (with mock data)

  return (
    <AuthGuard requireAuth={false}>
      <div className="container mx-auto px-4 py-8">
        {/* Delegation Banner */}
        <DelegationBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Governance Proposals</h1>
            <p className="text-muted-foreground">
              Participate in GNUS DAO governance by voting on proposals
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 flex items-center gap-2"
            data-testid="create-proposal-button"
          >
            <Plus className="h-4 w-4" />
            Create Proposal
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Proposals
                </p>
                <p className="text-2xl font-bold">{proposals.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Active
                </p>
                <p className="text-2xl font-bold">
                  {
                    proposals.filter((p) => p.state === ProposalState.Active)
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Executed
                </p>
                <p className="text-2xl font-bold">
                  {
                    proposals.filter((p) => p.state === ProposalState.Executed)
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-2xl font-bold">
                  {
                    proposals.filter((p) => p.state === ProposalState.Pending)
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="search-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterState}
              onChange={(e) =>
                setFilterState(e.target.value as ProposalState | "all")
              }
              className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All States</option>
              <option value={ProposalState.Active}>Active</option>
              <option value={ProposalState.Pending}>Pending</option>
              <option value={ProposalState.Succeeded}>Succeeded</option>
              <option value={ProposalState.Executed}>Executed</option>
              <option value={ProposalState.Defeated}>Defeated</option>
              <option value={ProposalState.Canceled}>Canceled</option>
            </select>
          </div>
        </div>

        {/* Proposals List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading proposals...</p>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No proposals found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterState !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Be the first to create a proposal for the DAO."}
            </p>
            {!searchTerm && filterState === "all" && (
              <Button onClick={() => setShowCreateModal(true)}>
                Create First Proposal
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id.toString()}
                proposal={proposal}
                router={router}
              />
            ))}
          </div>
        )}

        {/* Create Proposal Modal */}
        {showCreateModal && (
          <CreateProposalModal
            onClose={() => setShowCreateModal(false)}
            onProposalCreated={() => {
              setShowCreateModal(false);
              // Reload proposals
              window.location.reload();
            }}
          />
        )}
      </div>
    </AuthGuard>
  );
}

interface ProposalCardProps {
  proposal: ProposalWithMetadata;
  router: any;
}

function ProposalCard({ proposal, router }: ProposalCardProps) {
  const { wallet } = useWeb3Store();
  const [voting, setVoting] = useState(false);

  const getStateColor = (state: ProposalState): string => {
    switch (state) {
      case ProposalState.Active:
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case ProposalState.Succeeded:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case ProposalState.Defeated:
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case ProposalState.Pending:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case ProposalState.Executed:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case ProposalState.Canceled:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStateName = (state: ProposalState): string => {
    switch (state) {
      case ProposalState.Active:
        return "Active";
      case ProposalState.Succeeded:
        return "Succeeded";
      case ProposalState.Defeated:
        return "Defeated";
      case ProposalState.Pending:
        return "Pending";
      case ProposalState.Executed:
        return "Executed";
      case ProposalState.Canceled:
        return "Canceled";
      default:
        return "Unknown";
    }
  };

  const handleVote = async (support: VoteSupport) => {
    if (!wallet.isConnected || !wallet.address) {
      toast.error("Please connect your wallet to vote");
      return;
    }

    setVoting(true);
    try {
      const tx = await gnusDaoService.castVote(proposal.id, support);
      toast.success("Vote submitted! Waiting for confirmation...");

      await tx.wait();
      toast.success("Vote confirmed!");

      // Refresh the page to show updated vote counts
      window.location.reload();
    } catch (error) {
      console.error("Vote failed:", error);
      toast.error("Failed to submit vote");
    } finally {
      setVoting(false);
    }
  };

  return (
    <div
      className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow"
      data-testid="proposal-card"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{proposal.title}</h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(proposal.state)}`}
              data-testid="proposal-state"
            >
              {getStateName(proposal.state)}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mb-2">
            Proposal #{proposal.id.toString()}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
            <span>👤 {proposal.proposerName || "Unknown"}</span>
            <span>
              📅 {Math.round(proposal.votingPeriodDays || 7)} day voting period
            </span>
            <span>
              ⏱️ {Math.round(proposal.executionDelayDays || 3)} day execution
              delay
            </span>
          </div>
          <p className="text-sm line-clamp-2">{proposal.description}</p>
        </div>
        <div className="text-right mt-4 sm:mt-0">
          <p className="text-sm text-muted-foreground">
            {proposal.timeRemaining}
          </p>
          {proposal.quorumReached && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Quorum reached
            </p>
          )}
        </div>
      </div>

      {/* Voting Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span>For: {proposal.forVotes.toString()}</span>
          <span>Against: {proposal.againstVotes.toString()}</span>
          <span>Abstain: {proposal.abstainVotes.toString()}</span>
          <span data-testid="total-votes" className="hidden">
            {proposal.totalVotes.toString()}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-l-full"
            style={{
              width: `${
                proposal.totalVotes > 0n
                  ? Number((proposal.forVotes * 100n) / proposal.totalVotes)
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/proposals/${proposal.id}`)}
        >
          View Details
        </Button>
        {proposal.state === ProposalState.Active && wallet.isConnected && (
          <>
            <Button
              size="sm"
              onClick={() => handleVote(VoteSupport.For)}
              disabled={voting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Vote For
            </Button>
            <Button
              size="sm"
              onClick={() => handleVote(VoteSupport.Against)}
              disabled={voting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Vote Against
            </Button>
          </>
        )}
        {proposal.state === ProposalState.Active && !wallet.isConnected && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.error("Please connect your wallet to vote")}
          >
            Connect to Vote
          </Button>
        )}
      </div>
    </div>
  );
}
