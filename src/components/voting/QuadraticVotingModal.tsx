"use client";

import { Button } from "@/components/ui/Button";
import { VoteSupport } from "@/lib/contracts/gnusDao";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { checkRateLimit } from "@/lib/utils/clientRateLimiter";
import {
  AlertTriangle,
  Calculator,
  CheckCircle,
  Info,
  MinusCircle,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";

interface QuadraticVotingModalProps {
  proposalId: bigint;
  proposalTitle: string;
  onClose: () => void;
  onVoteSubmitted: () => void;
}

export function QuadraticVotingModal({
  proposalId,
  proposalTitle,
  onClose,
  onVoteSubmitted,
}: QuadraticVotingModalProps) {
  const { wallet } = useWeb3Store();
  const [selectedSupport, setSelectedSupport] = useState<VoteSupport | null>(null);
  const [votesToCast, setVotesToCast] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [maxVotesPerWallet, setMaxVotesPerWallet] = useState<bigint>(0n);

  useEffect(() => {
    loadUserBalance();
    loadVotingConfig();
  }, [wallet.address]);

  const loadUserBalance = async () => {
    if (!wallet.address) return;
    try {
      const balance = await gnusDaoService.getTokenBalance(wallet.address);
      setTokenBalance(balance);
    } catch (error) {
      console.error("Failed to load token balance:", error);
    }
  };

  const loadVotingConfig = async () => {
    try {
      const config = await gnusDaoService.getVotingConfig();
      if (config) {
        setMaxVotesPerWallet(config.maxVotesPerWallet);
      }
    } catch (error) {
      console.error("Failed to load voting config:", error);
    }
  };

  const handleVote = async () => {
    if (selectedSupport === null || !wallet.address) return;

    const rateLimitCheck = checkRateLimit('VOTE_CAST');
    if (!rateLimitCheck.allowed) {
      toast.error(`Too many votes. Please wait ${rateLimitCheck.resetIn} seconds.`);
      return;
    }

    const cost = votesToCast * votesToCast;
    const balanceInTokens = Number(ethers.formatEther(tokenBalance));
    
    if (cost > balanceInTokens) {
      toast.error(`Insufficient balance. Need ${cost} GDAO, have ${balanceInTokens.toFixed(0)} GDAO`);
      return;
    }

    try {
      setLoading(true);
      const tx = await gnusDaoService.castVote(proposalId, selectedSupport, BigInt(votesToCast));
      toast.success("Vote submitted! Waiting for confirmation...");
      await tx.wait();
      toast.success("Vote confirmed!");
      onVoteSubmitted();
      onClose();
    } catch (error) {
      console.error("Failed to submit vote:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit vote");
    } finally {
      setLoading(false);
    }
  };

  const getSupportName = (support: VoteSupport): string => {
    switch (support) {
      case VoteSupport.For: return "For";
      case VoteSupport.Against: return "Against";
      case VoteSupport.Abstain: return "Abstain";
      default: return "Unknown";
    }
  };

  const getSupportIcon = (support: VoteSupport) => {
    switch (support) {
      case VoteSupport.For: return <CheckCircle className="h-5 w-5 text-green-500" />;
      case VoteSupport.Against: return <XCircle className="h-5 w-5 text-red-500" />;
      case VoteSupport.Abstain: return <MinusCircle className="h-5 w-5 text-gray-500" />;
      default: return null;
    }
  };

  const getSupportColor = (support: VoteSupport): string => {
    switch (support) {
      case VoteSupport.For: return "border-green-500 bg-green-50 dark:bg-green-900/20";
      case VoteSupport.Against: return "border-red-500 bg-red-50 dark:bg-red-900/20";
      case VoteSupport.Abstain: return "border-gray-500 bg-gray-50 dark:bg-gray-900/20";
      default: return "border-input hover:bg-accent";
    }
  };

  // Calculate values
  const quadraticCost = votesToCast * votesToCast;
  const balanceInTokens = Number(ethers.formatEther(tokenBalance));
  const formattedBalance = balanceInTokens.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const maxVotes = Math.min(
    Number(maxVotesPerWallet),
    Math.floor(Math.sqrt(balanceInTokens))
  );
  const hasEnoughBalance = quadraticCost <= balanceInTokens;
  const remainingBalance = Math.max(0, balanceInTokens - quadraticCost);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center">
              <Zap className="h-5 w-5 mr-2 text-purple-500" />
              Quadratic Voting
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{proposalTitle}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
        </div>

        {/* Explanation */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                How Quadratic Voting Works
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                Cast multiple votes to express stronger support or opposition. 
                The cost increases quadratically to prevent vote buying.
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Formula:</strong> Cost = Votes² tokens
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Examples: 1 vote = 1 token • 5 votes = 25 tokens • 10 votes = 100 tokens
              </p>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Your GDAO Balance</span>
            <span className="text-lg font-bold">{formattedBalance} GDAO</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${maxVotes > 0 ? Math.min(100, (votesToCast / maxVotes) * 100) : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Cost: {quadraticCost} GDAO</span>
            <span>Max: {maxVotes} votes</span>
          </div>
        </div>

        {/* Vote Direction Selection */}
        <div className="space-y-3 mb-6">
          <h4 className="font-medium">Select Your Vote</h4>

          <button
            onClick={() => setSelectedSupport(VoteSupport.For)}
            className={`w-full p-4 border rounded-lg text-left transition-colors ${
              selectedSupport === VoteSupport.For ? getSupportColor(VoteSupport.For) : "border-input hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3">
              {getSupportIcon(VoteSupport.For)}
              <div>
                <span className="font-medium">Vote For</span>
                <p className="text-sm text-muted-foreground">Support this proposal</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedSupport(VoteSupport.Against)}
            className={`w-full p-4 border rounded-lg text-left transition-colors ${
              selectedSupport === VoteSupport.Against ? getSupportColor(VoteSupport.Against) : "border-input hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3">
              {getSupportIcon(VoteSupport.Against)}
              <div>
                <span className="font-medium">Vote Against</span>
                <p className="text-sm text-muted-foreground">Oppose this proposal</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedSupport(VoteSupport.Abstain)}
            className={`w-full p-4 border rounded-lg text-left transition-colors ${
              selectedSupport === VoteSupport.Abstain ? getSupportColor(VoteSupport.Abstain) : "border-input hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3">
              {getSupportIcon(VoteSupport.Abstain)}
              <div>
                <span className="font-medium">Abstain</span>
                <p className="text-sm text-muted-foreground">Neither support nor oppose</p>
              </div>
            </div>
          </button>
        </div>

        {/* Vote Count Slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="font-medium">Number of Votes</label>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Cost: {quadraticCost} GDAO
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="range"
              min="1"
              max={maxVotes}
              value={votesToCast}
              onChange={(e) => setVotesToCast(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1 vote (1 token)</span>
              <span>{maxVotes} votes ({maxVotes * maxVotes} tokens)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min="1"
                max={maxVotes}
                value={votesToCast}
                onChange={(e) => setVotesToCast(Math.max(1, Math.min(maxVotes, Number(e.target.value))))}
                className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Votes"
              />
              <div className="px-3 py-2 border border-input bg-muted rounded-md flex items-center justify-center">
                <span className="text-sm font-medium">{quadraticCost} GDAO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Warning */}
        {!hasEnoughBalance && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                  Insufficient Balance
                </h4>
                <p className="text-sm text-red-800 dark:text-red-200">
                  You need {quadraticCost} GDAO but only have {formattedBalance} GDAO.
                  Reduce votes to {Math.floor(Math.sqrt(balanceInTokens))} or fewer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vote Summary */}
        {selectedSupport !== null && (
          <div className="bg-card border rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-3">Vote Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Direction:</span>
                <span className="font-medium">{getSupportName(selectedSupport)}</span>
              </div>
              <div className="flex justify-between">
                <span>Votes:</span>
                <span className="font-medium">{votesToCast}</span>
              </div>
              <div className="flex justify-between">
                <span>Cost:</span>
                <span className="font-medium">{quadraticCost} GDAO</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-medium">
                  {remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} GDAO
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleVote}
            disabled={selectedSupport === null || loading || !hasEnoughBalance}
            className="flex-1"
          >
            {loading ? "Submitting..." : `Cast ${votesToCast} Vote${votesToCast !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
