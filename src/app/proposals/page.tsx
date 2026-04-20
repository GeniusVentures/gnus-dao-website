"use client";

import { AuthGuard } from "@/components/auth/AuthButton";
import { DelegationBanner } from "@/components/governance/DelegationBanner";
import { CreateProposalModal } from "@/components/proposals/CreateProposalModal";
import { ExecutionModal } from "@/components/proposals/ExecutionModal";
import { VotingModal } from "@/components/voting/VotingModal";
import { Button } from "@/components/ui/Button";
import type { Proposal } from "@/lib/contracts/gnusDao";
import { ProposalState } from "@/lib/contracts/gnusDao";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { ipfsMetadataService, type ProposalMetadata } from "@/lib/services/ipfsMetadataService";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import {
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Plus,
  Search,
  TrendingUp,
  Users,
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  metadata?: ProposalMetadata;
}

export default function ProposalsPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<ProposalWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState<ProposalState | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVotingModal, setShowVotingModal] = useState<{
    proposalId: bigint;
    title: string;
  } | null>(null);
  const [showExecutionModal, setShowExecutionModal] = useState<{
    proposalId: bigint;
    title: string;
    state: ProposalState;
  } | null>(null);

  // Helper functions
  const getProposerName = (address: string): string => {
    // TODO: Confirm this matches the actual deployer address in gnusDao.ts (GNUS_DAO_CONTRACTS[11155111].deployer)
    const knownAddresses: Record<string, string> = {
      "0x6Ec7f5dFb77c7CAbAB4Ed722660b1d8bA1605B43": "Core Team",
    };
    return knownAddresses[address] || `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const calculateTimeRemaining = (
    endTime: bigint | number,
    state?: ProposalState,
  ): string => {
    if (!endTime || endTime === 0n) return "Active (no deadline)";

    const endTimestamp = typeof endTime === "bigint" ? Number(endTime) : endTime;
    if (endTimestamp === 0) return "Active";

    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = endTimestamp - now;

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

      const totalVotes = proposal.totalVotes || 0n;
      const quorumThreshold = votingConfig?.quorumThreshold ? BigInt(votingConfig.quorumThreshold) : 0n;
      const quorumReached = totalVotes > 0n && totalVotes >= quorumThreshold && state !== ProposalState.Pending;
      const timeRemaining = proposal.endTime > 0n ? calculateTimeRemaining(proposal.endTime, state) : "No deadline";
      const title = proposal.title || `Proposal #${proposalId}`;
      const proposerName = getProposerName(proposal.proposer);
      const description = proposal.ipfsHash
        ? `IPFS: ${proposal.ipfsHash.slice(0, 20)}... | Submitted by ${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`
        : `Governance proposal submitted by ${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`;

      // Try to load IPFS metadata
      let metadata: ProposalMetadata | null = null;
      if (proposal.ipfsHash) {
        try {
          metadata = await ipfsMetadataService.fetchProposalMetadata(proposal.ipfsHash);
        } catch (error) {
          console.warn(`Failed to load IPFS metadata for proposal ${proposalId}:`, error);
        }
      }

      return {
        ...proposal,
        title: metadata?.title || title,
        description: metadata?.description || description,
        totalVotes,
        quorumReached,
        timeRemaining,
        state,
        proposerName,
        votingPeriodDays: 7,
        executionDelayDays: 3,
        metadata: metadata || undefined,
      };
    } catch (error) {
      console.error(`Failed to load proposal ${proposalId}:`, error);
      return null;
    }
  };

  // Load proposals function
  const loadProposals = async () => {
    try {
      setLoading(true);

      if (!gnusDaoService.isInitialized()) {
        const { ethers } = await import("ethers");
        // Try multiple public Sepolia RPCs in order
        const sepoliaRpcs = [
          "https://ethereum-sepolia-rpc.publicnode.com",
          "https://1rpc.io/sepolia",
          "https://sepolia.drpc.org",
          "https://rpc.ankr.com/eth_sepolia",
        ];
        let initialized = false;
        for (const rpc of sepoliaRpcs) {
          try {
            const p = new ethers.JsonRpcProvider(rpc);
            // Quick check: getBlockNumber with 5s timeout
            await Promise.race([
              p.getBlockNumber(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
            ]);
            await gnusDaoService.initialize(p, undefined, 11155111);
            initialized = true;
            break;
          } catch {
            console.warn(`RPC ${rpc} failed, trying next...`);
          }
        }
        if (!initialized) {
          toast.error("Could not connect to Sepolia network. Please connect your wallet.");
          setLoading(false);
          return;
        }
      }

      const [proposalCount, votingConfig] = await Promise.all([
        gnusDaoService.getProposalCount(),
        gnusDaoService.getVotingConfig(),
      ]);

      if (proposalCount === 0n) {
        // No proposals yet — show empty state (not mock data)
        setProposals([]);
        setLoading(false);
        return;
      }

      const proposalPromises: Promise<ProposalWithMetadata | null>[] = [];
      const startId = proposalCount > 20n ? proposalCount - 20n : 1n;

      for (let i = startId; i <= proposalCount; i++) {
        proposalPromises.push(loadProposalWithMetadata(i, votingConfig));
      }

      const loadedProposals = await Promise.all(proposalPromises);
      const validProposals = loadedProposals.filter((p): p is ProposalWithMetadata => p !== null);
      validProposals.sort((a, b) => Number(b.id - a.id));
      setProposals(validProposals);
    } catch (error) {
      console.error("Failed to load proposals:", error);
      toast.error("Failed to load proposals from the blockchain.");
    } finally {
      setLoading(false);
    }
  };

  // Load proposals on mount
  useEffect(() => {
    loadProposals();
  }, []);

  // Event handlers
  const handleVoteClick = (proposalId: bigint, title: string) => {
    setShowVotingModal({ proposalId, title });
  };

  const handleExecuteClick = (proposalId: bigint, title: string, state: ProposalState) => {
    setShowExecutionModal({ proposalId, title, state });
  };

  const handleVoteSubmitted = () => {
    loadProposals();
  };

  const handleProposalExecuted = () => {
    loadProposals();
  };

  // Filter proposals
  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch =
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterState === "all" || proposal.state === Number(filterState);
    return matchesSearch && matchesFilter;
  });

  return (
    <AuthGuard requireAuth={false}>
      <div className="container mx-auto px-4 py-8">
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
                <p className="text-sm font-medium text-muted-foreground">Total Proposals</p>
                <p className="text-2xl font-bold">{proposals.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {proposals.filter((p) => p.state === ProposalState.Active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Executed</p>
                <p className="text-2xl font-bold">
                  {proposals.filter((p) => p.state === ProposalState.Executed).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {proposals.filter((p) => p.state === ProposalState.Pending).length}
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
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterState}
              onChange={(e) => {
                const val = e.target.value;
                setFilterState(val === "all" ? "all" : Number(val) as ProposalState);
              }}
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
              <Button onClick={() => setShowCreateModal(true)}>Create First Proposal</Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id.toString()}
                proposal={proposal}
                router={router}
                onVoteClick={handleVoteClick}
                onExecuteClick={handleExecuteClick}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {showCreateModal && (
          <CreateProposalModal
            onClose={() => setShowCreateModal(false)}
            onProposalCreated={() => {
              setShowCreateModal(false);
              loadProposals();
            }}
          />
        )}

        {showVotingModal && (
          <VotingModal
            proposalId={showVotingModal.proposalId}
            proposalTitle={showVotingModal.title}
            onClose={() => setShowVotingModal(null)}
            onVoteSubmitted={handleVoteSubmitted}
          />
        )}

        {showExecutionModal && (
          <ExecutionModal
            proposalId={showExecutionModal.proposalId}
            proposalTitle={showExecutionModal.title}
            proposalState={showExecutionModal.state}
            onClose={() => setShowExecutionModal(null)}
            onExecuted={handleProposalExecuted}
          />
        )}
      </div>
    </AuthGuard>
  );
}

interface ProposalCardProps {
  proposal: ProposalWithMetadata;
  router: ReturnType<typeof useRouter>;
  onVoteClick: (proposalId: bigint, title: string) => void;
  onExecuteClick: (proposalId: bigint, title: string, state: ProposalState) => void;
}

function ProposalCard({ proposal, router, onVoteClick, onExecuteClick }: ProposalCardProps) {
  const { wallet } = useWeb3Store();

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

  return (
    <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{proposal.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(proposal.state)}`}>
              {getStateName(proposal.state)}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mb-2">Proposal #{proposal.id.toString()}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
            <span>👤 {proposal.proposerName || "Unknown"}</span>
            <span>📅 {Math.round(proposal.votingPeriodDays || 7)} day voting period</span>
            <span>⏱️ {Math.round(proposal.executionDelayDays || 3)} day execution delay</span>
          </div>
          <p className="text-sm line-clamp-2 whitespace-pre-line">{proposal.description}</p>
        </div>
        <div className="text-right mt-4 sm:mt-0">
          <p className="text-sm text-muted-foreground">{proposal.timeRemaining}</p>
          {proposal.quorumReached && (
            <p className="text-xs text-green-600 dark:text-green-400">Quorum reached</p>
          )}
        </div>
      </div>

      {/* Voting Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Total votes: <strong className="text-foreground">{proposal.totalVotes.toString()}</strong></span>
          <span>Quorum: {proposal.quorumReached ? <span className="text-green-600 font-medium">✓ Reached</span> : `${proposal.totalVotes.toString()} / 1000`}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, Number(proposal.totalVotes) / 1000 * 100)}%` }}
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
          <Button
            size="sm"
            onClick={() => onVoteClick(proposal.id, proposal.title)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Vote
          </Button>
        )}
        
        {(proposal.state === ProposalState.Succeeded || proposal.state === ProposalState.Queued) && wallet.isConnected && (
          <Button
            size="sm"
            onClick={() => onExecuteClick(proposal.id, proposal.title, proposal.state)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Play className="w-4 h-4 mr-1" />
            {proposal.state === ProposalState.Succeeded ? "Queue" : "Execute"}
          </Button>
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