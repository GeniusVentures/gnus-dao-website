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
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface VotingModalProps {
  proposalId: bigint;
  proposalTitle: string;
  onClose: () => void;
  onVoteSubmitted: () => void;
}

export function VotingModal({
  proposalId,
  proposalTitle,
  onClose,
  onVoteSubmitted,
}: VotingModalProps) {
  const { wallet } = useWeb3Store();
  const [selectedSupport, setSelectedSupport] = useState<VoteSupport | null>(null);
  const [creditsToSpend, setCreditsToSpend] = useState<number>(1);
  const [votingPower, setVotingPower] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [userCredits, setUserCredits] = useState<bigint>(0n);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [maxVotesPerWallet, setMaxVotesPerWallet] = useState<bigint>(0n);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    cost: bigint;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [supportsAllVoteTypes, setSupportsAllVoteTypes] = useState(false);

  useEffect(() => {
    loadUserCredits();
    checkVoteTypeSupport();
  }, [wallet.address]);

  useEffect(() => {
    if (creditsToSpend > 0) {
      validateVote();
    }
  }, [creditsToSpend, selectedSupport]);

  const checkVoteTypeSupport = async () => {
    try {
      // Check if contract supports all vote types by examining the ABI
      const facets = await gnusDaoService.getFacets();
      const votingFacet = facets.find(f => 
        f.functionSelectors.some(selector => 
          selector.includes('castVoteWithReason') || 
          selector.includes('castVote') && selector.includes('support')
        )
      );
      setSupportsAllVoteTypes(!!votingFacet);
    } catch (error) {
      console.warn('Could not determine vote type support:', error);
      setSupportsAllVoteTypes(false);
    }
  };

  const loadUserCredits = async () => {
    if (!wallet.address) return;

    try {
      const [balance, config] = await Promise.all([
        gnusDaoService.getTokenBalance(wallet.address),
        gnusDaoService.getVotingConfig(),
      ]);

      setTokenBalance(balance);
      setUserCredits(balance);
      
      if (config) {
        setMaxVotesPerWallet(config.maxVotesPerWallet);
      }
    } catch (error) {
      console.error("Error loading user credits:", error);
      toast.error("Failed to load voting credits");
    }
  };

  const validateVote = async () => {
    if (!selectedSupport || creditsToSpend <= 0) return;

    setIsValidating(true);
    try {
      const votes = BigInt(votingPower);
      const validation = await gnusDaoService.validateVote(
        votes,
        maxVotesPerWallet,
        tokenBalance,
      );

      const cost = await gnusDaoService.calculateQuadraticCost(votes);
      setValidationResult({ valid: validation.valid, cost });
    } catch (error) {
      console.error("Validation error:", error);
      setValidationResult({ valid: false, cost: 0n });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreditsChange = (value: number) => {
    const clampedValue = Math.max(1, Math.min(value, Number(userCredits)));
    setCreditsToSpend(clampedValue);
    
    // Calculate voting power (square root of credits for quadratic voting)
    const power = Math.floor(Math.sqrt(clampedValue));
    setVotingPower(Math.max(1, power));
  };

  const handleVotingPowerChange = (value: number) => {
    const clampedValue = Math.max(1, Math.min(value, Math.floor(Math.sqrt(Number(userCredits)))));
    setVotingPower(clampedValue);
    
    // Calculate required credits (square of voting power)
    const credits = clampedValue * clampedValue;
    setCreditsToSpend(credits);
  };

  const handleVote = async () => {
    if (!selectedSupport || !wallet.address || !validationResult?.valid) return;

    // Rate limiting check
    const rateLimitCheck = checkRateLimit('VOTE_CAST');
    if (!rateLimitCheck.allowed) {
      toast.error(`Please wait ${rateLimitCheck.resetIn} seconds before voting again`);
      return;
    }

    setLoading(true);
    try {
      const votes = BigInt(votingPower);
      
      // Cast the vote
      const tx = await gnusDaoService.castVote(proposalId, selectedSupport, votes);
      
      toast.success("Vote submitted successfully!");
      onVoteSubmitted();
      onClose();
    } catch (error: any) {
      console.error("Voting error:", error);
      
      if (error.message?.includes("only supports FOR votes")) {
        toast.error("This contract only supports FOR votes currently");
      } else if (error.message?.includes("already voted")) {
        toast.error("You have already voted on this proposal");
      } else if (error.message?.includes("insufficient")) {
        toast.error("Insufficient tokens to cast this vote");
      } else {
        toast.error(error.message || "Failed to submit vote");
      }
    } finally {
      setLoading(false);
    }
  };

  const getVoteTypeIcon = (voteType: VoteSupport) => {
    switch (voteType) {
      case VoteSupport.For:
        return <ThumbsUp className="w-5 h-5" />;
      case VoteSupport.Against:
        return <ThumbsDown className="w-5 h-5" />;
      case VoteSupport.Abstain:
        return <Minus className="w-5 h-5" />;
    }
  };

  const getVoteTypeColor = (voteType: VoteSupport) => {
    switch (voteType) {
      case VoteSupport.For:
        return "bg-green-500 hover:bg-green-600 text-white";
      case VoteSupport.Against:
        return "bg-red-500 hover:bg-red-600 text-white";
      case VoteSupport.Abstain:
        return "bg-gray-500 hover:bg-gray-600 text-white";
    }
  };

  const getVoteTypeLabel = (voteType: VoteSupport) => {
    switch (voteType) {
      case VoteSupport.For:
        return "For";
      case VoteSupport.Against:
        return "Against";
      case VoteSupport.Abstain:
        return "Abstain";
    }
  };

  const maxVotingPower = Math.floor(Math.sqrt(Number(userCredits)));
  const efficiency = votingPower > 0 ? (votingPower / creditsToSpend) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Cast Your Vote
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

          {/* Vote Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Vote Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {/* For Vote */}
              <button
                onClick={() => setSelectedSupport(VoteSupport.For)}
                className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  selectedSupport === VoteSupport.For
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-green-300"
                }`}
              >
                <ThumbsUp className={`w-5 h-5 ${
                  selectedSupport === VoteSupport.For ? "text-green-600" : "text-gray-400"
                }`} />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">For</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Support this proposal
                  </div>
                </div>
              </button>

              {/* Against Vote */}
              <button
                onClick={() => setSelectedSupport(VoteSupport.Against)}
                disabled={!supportsAllVoteTypes}
                className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  !supportsAllVoteTypes 
                    ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-600"
                    : selectedSupport === VoteSupport.Against
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-red-300"
                }`}
              >
                <ThumbsDown className={`w-5 h-5 ${
                  selectedSupport === VoteSupport.Against ? "text-red-600" : "text-gray-400"
                }`} />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Against</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {supportsAllVoteTypes ? "Oppose this proposal" : "Not supported"}
                  </div>
                </div>
              </button>

              {/* Abstain Vote */}
              <button
                onClick={() => setSelectedSupport(VoteSupport.Abstain)}
                disabled={!supportsAllVoteTypes}
                className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  !supportsAllVoteTypes 
                    ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-600"
                    : selectedSupport === VoteSupport.Abstain
                    ? "border-gray-500 bg-gray-50 dark:bg-gray-700/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                }`}
              >
                <Minus className={`w-5 h-5 ${
                  selectedSupport === VoteSupport.Abstain ? "text-gray-600" : "text-gray-400"
                }`} />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Abstain</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {supportsAllVoteTypes ? "Neither for nor against" : "Not supported"}
                  </div>
                </div>
              </button>
            </div>

            {!supportsAllVoteTypes && (
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                    This contract currently only supports FOR votes
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Voting Power Configuration */}
          {selectedSupport && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Voting Power: {votingPower} votes
                </label>
                <input
                  type="range"
                  min="1"
                  max={maxVotingPower}
                  value={votingPower}
                  onChange={(e) => handleVotingPowerChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 vote</span>
                  <span>{maxVotingPower} votes (max)</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Token Cost: {creditsToSpend} tokens
                </label>
                <input
                  type="range"
                  min="1"
                  max={Number(userCredits)}
                  value={creditsToSpend}
                  onChange={(e) => handleCreditsChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 token</span>
                  <span>{Number(userCredits)} tokens (balance)</span>
                </div>
              </div>

              {/* Vote Statistics */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Efficiency</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {efficiency.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Remaining Balance</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {Number(userCredits) - creditsToSpend} tokens
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Status */}
              {isValidating ? (
                <div className="flex items-center gap-2 text-blue-600 mb-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Validating vote...</span>
                </div>
              ) : validationResult ? (
                <div className={`flex items-center gap-2 mb-4 ${
                  validationResult.valid ? "text-green-600" : "text-red-600"
                }`}>
                  {validationResult.valid ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm">
                    {validationResult.valid 
                      ? "Vote is valid" 
                      : `Insufficient tokens (need ${validationResult.cost})`
                    }
                  </span>
                </div>
              ) : null}

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVote}
                  disabled={
                    loading || 
                    !selectedSupport || 
                    !validationResult?.valid ||
                    (!supportsAllVoteTypes && selectedSupport !== VoteSupport.For)
                  }
                  className={`flex-1 ${getVoteTypeColor(selectedSupport || VoteSupport.For)}`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Voting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {selectedSupport && getVoteTypeIcon(selectedSupport)}
                      <span>Vote {selectedSupport && getVoteTypeLabel(selectedSupport)}</span>
                    </div>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}