"use client";

import React, { useState, useEffect } from "react";
import {
  Calculator,
  Info,
  CheckCircle,
  XCircle,
  MinusCircle,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { VoteSupport } from "@/lib/contracts/gnusDao";
import { toast } from "react-hot-toast";

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
  const { wallet, voteCredits } = useWeb3Store();
  const [selectedSupport, setSelectedSupport] = useState<VoteSupport | null>(
    null,
  );
  const [creditsToSpend, setCreditsToSpend] = useState<number>(1);
  const [votingPower, setVotingPower] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [userCredits, setUserCredits] = useState<bigint>(0n);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [maxVotesPerWallet, setMaxVotesPerWallet] = useState<bigint>(0n);
  const [validationResult, setValidationResult] = useState<{valid: boolean; cost: bigint} | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    loadUserCredits();
    loadVotingConfig();
  }, [wallet.address]);

  useEffect(() => {
    // Calculate quadratic voting power: sqrt(credits)
    setVotingPower(Math.floor(Math.sqrt(creditsToSpend)));

    // Validate vote when credits change
    validateVoteAmount();
  }, [creditsToSpend, tokenBalance, maxVotesPerWallet]);

  const loadUserCredits = async () => {
    if (!wallet.address) return;

    try {
      // Get token balance instead of vote credits
      const balance = await gnusDaoService.getTokenBalance(wallet.address);
      setUserCredits(balance);
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

  const validateVoteAmount = async () => {
    if (!wallet.address || creditsToSpend <= 0) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    try {
      const result = await gnusDaoService.validateVote(
        BigInt(votingPower),
        maxVotesPerWallet,
        tokenBalance
      );
      setValidationResult(result);
    } catch (error) {
      console.error("Failed to validate vote:", error);
      setValidationResult({ valid: false, cost: 0n });
    } finally {
      setIsValidating(false);
    }
  };

  const handleVote = async () => {
    if (selectedSupport === null || !wallet.address) return;

    // Check validation before submitting
    if (validationResult && !validationResult.valid) {
      toast.error("Invalid vote amount");
      return;
    }

    try {
      setLoading(true);

      // Cast vote with the calculated voting power (number of votes)
      // The contract will calculate the quadratic cost internally
      const tx = await gnusDaoService.castVote(
        proposalId,
        selectedSupport,
        BigInt(votingPower), // Pass the number of votes (not credits)
      );

      toast.success("Vote submitted! Waiting for confirmation...");
      await tx.wait();
      toast.success("Vote confirmed!");

      onVoteSubmitted();
      onClose();
    } catch (error) {
      console.error("Failed to submit vote:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit vote",
      );
    } finally {
      setLoading(false);
    }
  };

  const getSupportName = (support: VoteSupport): string => {
    switch (support) {
      case VoteSupport.For:
        return "For";
      case VoteSupport.Against:
        return "Against";
      case VoteSupport.Abstain:
        return "Abstain";
      default:
        return "Unknown";
    }
  };

  const getSupportIcon = (support: VoteSupport) => {
    switch (support) {
      case VoteSupport.For:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case VoteSupport.Against:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case VoteSupport.Abstain:
        return <MinusCircle className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getSupportColor = (support: VoteSupport): string => {
    switch (support) {
      case VoteSupport.For:
        return "border-green-500 bg-green-50 dark:bg-green-900/20";
      case VoteSupport.Against:
        return "border-red-500 bg-red-50 dark:bg-red-900/20";
      case VoteSupport.Abstain:
        return "border-gray-500 bg-gray-50 dark:bg-gray-900/20";
      default:
        return "border-input hover:bg-accent";
    }
  };

  const maxCredits = Math.min(Number(userCredits), 10000); // Cap at 10k for UI
  const efficiency =
    creditsToSpend > 0 ? (votingPower / creditsToSpend) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center">
              <Zap className="h-5 w-5 mr-2 text-purple-500" />
              Quadratic Voting
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {proposalTitle}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Quadratic Voting Explanation */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                How Quadratic Voting Works
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                Quadratic voting allows you to express the intensity of your
                preferences. The more credits you spend, the more voting power
                you get, but with diminishing returns.
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Formula:</strong> Voting Power = √(Credits Spent)
              </p>
            </div>
          </div>
        </div>

        {/* Vote Credits Status */}
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Available Token Balance</span>
            <span className="text-lg font-bold">{userCredits.toString()}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${maxCredits > 0 ? (creditsToSpend / maxCredits) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Voting Power: {votingPower}</span>
            <span>Max Votes: {maxVotesPerWallet.toString()}</span>
          </div>
        </div>

        {/* Vote Validation Status */}
        {validationResult && (
          <div className={`p-4 rounded-lg mb-6 ${
            validationResult.valid
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-3">
              {validationResult.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  validationResult.valid
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {validationResult.valid ? 'Vote is valid' : 'Vote is invalid'}
                </p>
                <p className={`text-sm mt-1 ${
                  validationResult.valid
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {validationResult.valid
                    ? `Estimated cost: ${validationResult.cost.toString()} tokens`
                    : 'Voting power exceeds maximum allowed or insufficient balance'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {isValidating && (
          <div className="flex items-center justify-center gap-2 p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700 dark:text-blue-300">Validating vote...</span>
          </div>
        )}

        {/* Vote Options */}
        <div className="space-y-3 mb-6">
          <h4 className="font-medium">Select Your Vote</h4>

          <button
            onClick={() => setSelectedSupport(VoteSupport.For)}
            className={`w-full p-4 border rounded-lg text-left transition-colors ${
              selectedSupport === VoteSupport.For
                ? getSupportColor(VoteSupport.For)
                : "border-input hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3">
              {getSupportIcon(VoteSupport.For)}
              <div>
                <span className="font-medium">Vote For</span>
                <p className="text-sm text-muted-foreground">
                  Support this proposal
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedSupport(VoteSupport.Against)}
            className={`w-full p-4 border rounded-lg text-left transition-colors ${
              selectedSupport === VoteSupport.Against
                ? getSupportColor(VoteSupport.Against)
                : "border-input hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3">
              {getSupportIcon(VoteSupport.Against)}
              <div>
                <span className="font-medium">Vote Against</span>
                <p className="text-sm text-muted-foreground">
                  Oppose this proposal
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedSupport(VoteSupport.Abstain)}
            className={`w-full p-4 border rounded-lg text-left transition-colors ${
              selectedSupport === VoteSupport.Abstain
                ? getSupportColor(VoteSupport.Abstain)
                : "border-input hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-3">
              {getSupportIcon(VoteSupport.Abstain)}
              <div>
                <span className="font-medium">Abstain</span>
                <p className="text-sm text-muted-foreground">
                  Neither support nor oppose
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Credits Slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="font-medium">Credits to Spend</label>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Voting Power: {votingPower}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="range"
              min="1"
              max={maxCredits}
              value={creditsToSpend}
              onChange={(e) => setCreditsToSpend(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1 credit</span>
              <span>{maxCredits} credits</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min="1"
                max={maxCredits}
                value={creditsToSpend}
                onChange={(e) =>
                  setCreditsToSpend(
                    Math.max(1, Math.min(maxCredits, Number(e.target.value))),
                  )
                }
                className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Credits"
              />
              <div className="px-3 py-2 border border-input bg-muted rounded-md flex items-center">
                <span className="text-sm">Power: {votingPower}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Efficiency */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                Voting Efficiency: {efficiency.toFixed(1)}%
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {efficiency > 50
                  ? "High efficiency - you're getting good value for your credits"
                  : efficiency > 25
                    ? "Moderate efficiency - consider if this level of conviction is worth the cost"
                    : "Low efficiency - spending many credits for diminishing returns"}
              </p>
            </div>
          </div>
        </div>

        {/* Vote Summary */}
        {selectedSupport !== null && (
          <div className="bg-card border rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-3">Vote Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Vote:</span>
                <span className="font-medium">
                  {getSupportName(selectedSupport)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Credits Spent:</span>
                <span className="font-medium">{creditsToSpend}</span>
              </div>
              <div className="flex justify-between">
                <span>Voting Power:</span>
                <span className="font-medium">{votingPower}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining Credits:</span>
                <span className="font-medium">
                  {Number(userCredits) - creditsToSpend}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVote}
            disabled={
              selectedSupport === null ||
              loading ||
              creditsToSpend > Number(userCredits)
            }
            className="flex-1"
          >
            {loading ? "Submitting..." : "Submit Quadratic Vote"}
          </Button>
        </div>

        {/* Warning for insufficient credits */}
        {creditsToSpend > Number(userCredits) && (
          <div className="mt-3 text-sm text-red-600 dark:text-red-400 text-center">
            Insufficient vote credits. You need{" "}
            {creditsToSpend - Number(userCredits)} more credits.
          </div>
        )}
      </div>
    </div>
  );
}
