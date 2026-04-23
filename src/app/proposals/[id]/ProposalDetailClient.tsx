"use client";

import { AuthGuard } from "@/components/auth/AuthButton";
import { Button } from "@/components/ui/Button";
import { QuadraticVotingModal } from "@/components/voting/QuadraticVotingModal";
import type { Proposal, VoteReceipt } from "@/lib/contracts/gnusDao";
import { ProposalState, VoteSupport } from "@/lib/contracts/gnusDao";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { formatAddress, resolveEnsName } from "@/lib/utils";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { useSiwe } from "@/lib/auth/useSiwe";
import { ethers } from "ethers";
import {
  ArrowLeft, Ban, Calendar, CheckCircle, Clock,
  MinusCircle, Play, User, Vote, XCircle, Info,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface ProposalWithMetadata extends Proposal {
  title: string;
  description: string;
  state: ProposalState;
  totalVotes: bigint;
  quorumReached: boolean;
  timeRemaining: string;
  quorumThreshold: bigint;
  forVotes?: bigint;
  againstVotes?: bigint;
  abstainVotes?: bigint;
}

export default function ProposalDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { wallet, provider, signer, gnusDaoInitialized, votingPower } = useWeb3Store();
  const { isAuthenticated, signIn } = useSiwe();

  const [proposal, setProposal] = useState<ProposalWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [userVote, setUserVote] = useState<VoteReceipt | null>(null);
  const [showQuadraticModal, setShowQuadraticModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [proposerEns, setProposerEns] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [canExecute, setCanExecute] = useState(false);
  const [canCancel, setCanCancel] = useState(false);

  const proposalId = params.id as string;

  const formatTimestamp = (ts: bigint): string => {
    if (!ts || ts === 0n) return "—";
    return new Date(Number(ts) * 1000).toLocaleString();
  };

  const formatTimeRemaining = (startTime: bigint, endTime: bigint, state: ProposalState): string => {
    const now = Math.floor(Date.now() / 1000);
    const start = Number(startTime);
    const end = Number(endTime);

    if (state === ProposalState.Pending && start > now) {
      const secs = start - now;
      const hours = Math.floor(secs / 3600);
      const days = Math.floor(hours / 24);
      if (days > 0) return `Voting starts in ${days}d ${hours % 24}h`;
      if (hours > 0) return `Voting starts in ${hours}h ${Math.floor((secs % 3600) / 60)}m`;
      return `Voting starts in ${Math.floor(secs / 60)}m`;
    }
    if (!end || end === 0) return "No deadline";
    if (now >= end) return "Voting ended";
    const secs = end - now;
    const hours = Math.floor(secs / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    if (hours > 0) return `${hours}h ${Math.floor((secs % 3600) / 60)}m remaining`;
    return `${Math.floor(secs / 60)}m remaining`;
  };

  const loadProposal = async () => {
    if (!proposalId) { setLoading(false); return; }

    // Ensure service is initialized — use wallet if available, else fall back to public RPC
    if (!gnusDaoService.isInitialized()) {
      if (provider && signer) {
        try {
          const network = await provider.getNetwork();
          await gnusDaoService.initialize(provider, signer, Number(network.chainId));
        } catch { /* fall through to public RPC */ }
      }

      if (!gnusDaoService.isInitialized()) {
        // No wallet — use public Sepolia RPC (read-only)
        try {
          const { ethers } = await import('ethers');
          const rpcs = [
            'https://ethereum-sepolia-rpc.publicnode.com',
            'https://1rpc.io/sepolia',
            'https://sepolia.drpc.org',
          ];
          for (const rpc of rpcs) {
            try {
              const p = new ethers.JsonRpcProvider(rpc);
              await Promise.race([p.getBlockNumber(), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000))]);
              await gnusDaoService.initialize(p, undefined, 11155111);
              break;
            } catch { continue; }
          }
        } catch { /* ignore */ }
      }
    }

    try {
      const id = BigInt(proposalId);
      const [proposalData, state, votingConfig] = await Promise.all([
        gnusDaoService.getProposal(id),
        gnusDaoService.getProposalState(id),
        gnusDaoService.getVotingConfig(),
      ]);

      if (!proposalData) { setLoading(false); return; }

      const totalVotes = proposalData.totalVotes || 0n;
      const quorumThreshold = votingConfig?.quorumThreshold ? BigInt(votingConfig.quorumThreshold) : 1000n;
      const quorumReached = totalVotes >= quorumThreshold && state !== ProposalState.Pending;
      const timeRemaining = formatTimeRemaining(proposalData.startTime || 0n, proposalData.endTime || 0n, state);

      // Fetch vote breakdown (For/Against/Abstain)
      let breakdown = null;
      try {
        breakdown = await gnusDaoService.getVoteBreakdown(id);
      } catch (e) {
        console.warn('Could not fetch vote breakdown:', e);
      }

      let description = `Submitted by ${proposalData.proposer.slice(0, 6)}...${proposalData.proposer.slice(-4)}`;
      if (proposalData.ipfsHash && !proposalData.ipfsHash.startsWith('QmPlaceholder')) {
        try {
          const { SecureIPFSService } = await import('@/lib/ipfs/secureUpload');
          const metadata = await SecureIPFSService.fetchFromIPFS(proposalData.ipfsHash);
          if (metadata?.description) description = metadata.description;
        } catch { /* use fallback */ }
      }

      setProposal({
        ...proposalData,
        title: proposalData.title || `Proposal #${id}`,
        description,
        state,
        totalVotes,
        quorumReached,
        timeRemaining,
        quorumThreshold,
        forVotes: breakdown?.forVotes || 0n,
        againstVotes: breakdown?.againstVotes || 0n,
        abstainVotes: breakdown?.abstainVotes || 0n,
      });

      // Resolve proposer ENS name
      resolveEnsName(proposalData.proposer).then(setProposerEns);

      if (wallet.address) {
        const voteReceipt = await gnusDaoService.getVoteReceipt(id, wallet.address);
        setUserVote(voteReceipt);
      }
    } catch (error) {
      console.error("Failed to load proposal:", error);
      toast.error("Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProposal(); }, [gnusDaoInitialized, proposalId, wallet.address]);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!wallet.address || !proposal) return;
      try {
        setCanExecute(proposal.state === ProposalState.Succeeded && !proposal.executed);

        // Check if proposer or owner — derive from proposal data directly
        const isProposer = proposal.proposer.toLowerCase() === wallet.address.toLowerCase();

        // Try to get owner from service, fall back to known deployer
        let isOwner = false;
        try {
          const owner = await gnusDaoService.getOwner();
          isOwner = owner.toLowerCase() === wallet.address.toLowerCase();
        } catch {
          // If service not ready, check against known deployer address
          isOwner = wallet.address.toLowerCase() === '0xd4467da256cd3fc5751f2bc358f52cfa441741a1';
        }

        // Can only cancel if not executed and not already cancelled
        setCanCancel(
          (isProposer || isOwner) &&
          !proposal.executed &&
          !proposal.canceled &&
          (proposal.state === ProposalState.Pending || proposal.state === ProposalState.Active)
        );
      } catch (e) {
        console.error('checkPermissions error:', e);
      }
    };
    checkPermissions();
  }, [wallet.address, proposal]);

  const handleVote = async (votes: bigint = 1n) => {
    if (!proposal || !wallet.address) return;

    if (!isAuthenticated) {
      try {
        await signIn();
      } catch { return; }
    }

    setVoting(true);
    try {
      const tx = await gnusDaoService.castVote(BigInt(proposalId), VoteSupport.For, votes);
      toast.loading("Waiting for confirmation...", { id: "vote-tx" });
      await tx.wait();
      toast.dismiss("vote-tx");
      toast.success("Vote submitted!");
      const voteReceipt = await gnusDaoService.getVoteReceipt(BigInt(proposalId), wallet.address);
      setUserVote(voteReceipt);
      loadProposal();
    } catch (error: any) {
      toast.dismiss("vote-tx");
      const msg = error?.reason || error?.message || "Vote failed";
      toast.error(msg.includes("VotingNotStarted") ? "Voting hasn't started yet" : msg);
    } finally {
      setVoting(false);
    }
  };

  const handleExecute = async () => {
    if (!proposal) return;
    setIsExecuting(true);
    try {
      const tx = await gnusDaoService.executeProposal(BigInt(proposalId));
      await tx.wait();
      toast.success("Proposal executed!");
      loadProposal();
    } catch (error: any) {
      toast.error(error.message || "Execution failed");
    } finally { setIsExecuting(false); }
  };

  const handleCancel = async () => {
    if (!proposal) return;

    if (!wallet.isConnected || !wallet.address) {
      alert("Please connect your wallet to cancel this proposal.");
      return;
    }

    if (!confirm(`Cancel proposal "${proposal.title}"? This cannot be undone.`)) return;

    setIsCanceling(true);
    try {
      // Ensure service is initialized with current signer
      if (provider && signer) {
        const network = await provider.getNetwork();
        await gnusDaoService.initialize(provider, signer, Number(network.chainId));
      }

      toast.loading("Canceling proposal...", { id: "cancel-tx" });
      const tx = await gnusDaoService.cancelProposal(BigInt(proposalId));
      await tx.wait();
      toast.dismiss("cancel-tx");
      toast.success("Proposal canceled");
      loadProposal();
    } catch (error: any) {
      toast.dismiss("cancel-tx");
      
      // Decode custom errors
      let errorMsg = "Cancel failed";
      if (error?.data?.includes("0x60bf3177")) {
        errorMsg = "Cannot cancel: Proposal has already been executed";
      } else if (error?.data?.includes("0x54e37625")) {
        errorMsg = "Proposal has already been cancelled";
      } else if (error?.data?.includes("0xb7e8bcb6")) {
        errorMsg = "Only proposer or owner can cancel this proposal";
      } else {
        errorMsg = error?.reason || error?.data?.message || error?.message || "Cancel failed";
      }
      
      toast.error(errorMsg);
      
      // Reload proposal to get fresh state
      loadProposal();
    } finally {
      setIsCanceling(false);
    }
  };

  const stateBadge = (state: ProposalState) => {
    const map: Record<number, { label: string; cls: string }> = {
      [ProposalState.Pending]:   { label: "Pending",        cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
      [ProposalState.Active]:    { label: "Active",         cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
      [ProposalState.Succeeded]: { label: "Succeeded",      cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
      [ProposalState.Defeated]:  { label: "Defeated",       cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
      [ProposalState.Executed]:  { label: "Executed",       cls: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
      [ProposalState.Canceled]:  { label: "Canceled",       cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
      [ProposalState.Queued]:    { label: "Queued",         cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
      [ProposalState.Expired]:   { label: "Quorum Not Met", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
    };
    const { label, cls } = map[state] ?? { label: "Unknown", cls: "bg-gray-100 text-gray-600" };
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">Proposal not found</p>
        <Button onClick={() => router.push("/proposals")}>Back to Proposals</Button>
      </div>
    );
  }

  const isPending = proposal.state === ProposalState.Pending;
  const isActive  = proposal.state === ProposalState.Active;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Back */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Proposals
        </Button>

        {/* Title card */}
        <div className="bg-card border rounded-xl p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Proposal #{proposalId}</p>
              <h1 className="text-2xl font-bold">{proposal.title}</h1>
            </div>
            {stateBadge(proposal.state)}
          </div>

          <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">{proposal.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-xs">Proposer</p>
                <p className="font-medium text-foreground">
                  {proposerEns || formatAddress(proposal.proposer)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-xs">Voting starts</p>
                <p className="font-medium text-foreground">{formatTimestamp(proposal.startTime || 0n)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-xs">Voting ends</p>
                <p className="font-medium text-foreground">{formatTimestamp(proposal.endTime || 0n)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending info banner */}
        {isPending && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                {proposal.timeRemaining}
              </p>
            </div>
          </div>
        )}

        {/* Defeated banner - community rejected */}
        {proposal.state === ProposalState.Defeated && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">Proposal Defeated</p>
              <p className="text-sm text-red-800 dark:text-red-200 mt-0.5">
                The community voted against this proposal. Against votes exceeded For votes.
              </p>
            </div>
          </div>
        )}

        {/* Expired banner - quorum not met */}
        {proposal.state === ProposalState.Expired && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-orange-900 dark:text-orange-100">Quorum Not Met</p>
              <p className="text-sm text-orange-800 dark:text-orange-200 mt-0.5">
                Not enough voters participated. Required {proposal.quorumThreshold.toString()} votes, got {proposal.totalVotes.toString()}.
              </p>
            </div>
          </div>
        )}

        {/* Votes */}
        <div className="bg-card border rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Votes</h2>
            <span className="text-sm text-muted-foreground">
              Quorum: {proposal.totalVotes.toString()} / {proposal.quorumThreshold.toString()} votes
              {proposal.quorumReached && <span className="ml-2 text-green-600 font-medium">✓ Met</span>}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-3 mb-4">
            <div
              className="bg-primary h-3 rounded-full transition-all"
              style={{ width: `${Math.min(100, Number(proposal.totalVotes) / Number(proposal.quorumThreshold) * 100)}%` }}
            />
          </div>

          {/* Vote Breakdown - For/Against/Abstain */}
          {!isPending && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">For</span>
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {proposal.forVotes?.toString() || "0"}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">Against</span>
                </div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {proposal.againstVotes?.toString() || "0"}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MinusCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Abstain</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {proposal.abstainVotes?.toString() || "0"}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <div>
              <div className="text-3xl font-bold text-foreground">{proposal.totalVotes.toString()}</div>
              <div className="text-sm text-muted-foreground mt-1">Total votes cast</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{proposal.totalVoters?.toString() ?? "—"}</div>
              <div className="text-sm text-muted-foreground mt-1">Unique voters</div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            This contract uses quadratic voting with For/Against/Abstain support.
            Cost = votes². Need {proposal.quorumThreshold.toString()} total votes for quorum.
            {(proposal.forVotes === 0n && proposal.againstVotes === 0n && proposal.abstainVotes === 0n && proposal.totalVotes > 0n) && (
              <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
                Note: Votes cast before the upgrade don't have For/Against/Abstain data.
              </span>
            )}
          </div>

          {userVote?.hasVoted && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              ✓ You voted — {userVote.votes.toString()} vote{userVote.votes !== 1n ? 's' : ''}
            </div>
          )}
        </div>

        {/* Vote / Actions */}
        <div className="bg-card border rounded-xl p-6 mb-4">
          {!wallet.isConnected ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">Connect your wallet to participate</p>
              <AuthGuard><Button>Connect Wallet</Button></AuthGuard>
            </div>
          ) : isActive && !userVote?.hasVoted ? (
            <div>
              <h2 className="text-lg font-semibold mb-3">Cast Your Vote</h2>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-xs text-blue-800 dark:text-blue-200">
                Voting uses your GDAO balance at the time the proposal was created — tokens are <strong>not burned or locked</strong>.
                Quadratic formula: 1 vote requires 1 GDAO, 2 votes require 4 GDAO, 3 votes require 9 GDAO.
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Your voting power: <strong>{Number(ethers.formatEther(votingPower)).toLocaleString()} GDAO</strong>.
                Quadratic formula: votes² GDAO required (not spent). 1 vote needs 1 GDAO, 10 votes need 100 GDAO.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => handleVote(1n)} disabled={voting} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" /> Vote For (1 vote · 1 GDAO)
                </Button>
                <Button 
                  onClick={async () => {
                    if (!proposal || !wallet.address) return;
                    setVoting(true);
                    try {
                      const tx = await gnusDaoService.castVote(BigInt(proposalId), VoteSupport.Against, 1n);
                      toast.loading("Waiting for confirmation...", { id: "vote-tx" });
                      await tx.wait();
                      toast.dismiss("vote-tx");
                      toast.success("Vote submitted!");
                      const voteReceipt = await gnusDaoService.getVoteReceipt(BigInt(proposalId), wallet.address);
                      setUserVote(voteReceipt);
                      loadProposal();
                    } catch (error: any) {
                      toast.dismiss("vote-tx");
                      const msg = error?.reason || error?.message || "Vote failed";
                      toast.error(msg.includes("VotingNotStarted") ? "Voting hasn't started yet" : msg);
                    } finally {
                      setVoting(false);
                    }
                  }}
                  disabled={voting} 
                  className="bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Vote Against (1 vote · 1 GDAO)
                </Button>
                <Button 
                  onClick={async () => {
                    if (!proposal || !wallet.address) return;
                    setVoting(true);
                    try {
                      const tx = await gnusDaoService.castVote(BigInt(proposalId), VoteSupport.Abstain, 1n);
                      toast.loading("Waiting for confirmation...", { id: "vote-tx" });
                      await tx.wait();
                      toast.dismiss("vote-tx");
                      toast.success("Vote submitted!");
                      const voteReceipt = await gnusDaoService.getVoteReceipt(BigInt(proposalId), wallet.address);
                      setUserVote(voteReceipt);
                      loadProposal();
                    } catch (error: any) {
                      toast.dismiss("vote-tx");
                      const msg = error?.reason || error?.message || "Vote failed";
                      toast.error(msg.includes("VotingNotStarted") ? "Voting hasn't started yet" : msg);
                    } finally {
                      setVoting(false);
                    }
                  }}
                  disabled={voting} 
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  <MinusCircle className="w-4 h-4 mr-2" /> Abstain (1 vote · 1 GDAO)
                </Button>
                <Button onClick={() => setShowQuadraticModal(true)} disabled={voting} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300">
                  <Vote className="w-4 h-4 mr-2" /> Choose vote count
                </Button>
              </div>
            </div>
          ) : isActive && userVote?.hasVoted ? (
            <p className="text-muted-foreground text-center py-2">You have already voted on this proposal.</p>
          ) : isPending ? (
            <p className="text-muted-foreground text-center py-2">Voting has not started yet.</p>
          ) : (
            <p className="text-muted-foreground text-center py-2">Voting is closed for this proposal.</p>
          )}

          {/* Execute / Cancel */}
          {(canExecute || canCancel) && (
            <div className="flex gap-3 mt-4 pt-4 border-t">
              {canExecute && (
                <Button onClick={handleExecute} disabled={isExecuting} className="bg-green-600 hover:bg-green-700">
                  {isExecuting ? "Executing..." : <><Play className="w-4 h-4 mr-2" />Execute</>}
                </Button>
              )}
              {canCancel && (
                <Button onClick={handleCancel} disabled={isCanceling} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                  {isCanceling ? "Canceling..." : <><Ban className="w-4 h-4 mr-2" />Cancel</>}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* IPFS hash */}
        {proposal.ipfsHash && (
          <div className="bg-card border rounded-xl p-4 text-sm text-muted-foreground">
            <span className="font-medium">IPFS: </span>
            <a
              href={`https://ipfs.io/ipfs/${proposal.ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-primary underline break-all"
            >
              {proposal.ipfsHash}
            </a>
          </div>
        )}
      </div>

      {showQuadraticModal && (
        <QuadraticVotingModal
          proposalId={BigInt(proposalId)}
          proposalTitle={proposal.title}
          onClose={() => setShowQuadraticModal(false)}
          onVoteSubmitted={() => {
            setShowQuadraticModal(false);
            if (wallet.address) {
              gnusDaoService.getVoteReceipt(BigInt(proposalId), wallet.address).then(setUserVote);
            }
            loadProposal();
          }}
        />
      )}
    </div>
  );
}
