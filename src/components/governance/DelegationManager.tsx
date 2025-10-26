"use client";

import React, { useState, useEffect } from "react";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { ethers } from "ethers";
import { ArrowRight, X, Users, TrendingUp, Info } from "lucide-react";

interface DelegationInfo {
  delegatedTo: string;
  delegatedVotes: bigint;
  votingPower: bigint;
  isDelegating: boolean;
}

export function DelegationManager() {
  const { wallet } = useWeb3Store();
  const { address, isConnected } = wallet;
  const toast = useToast();

  const [delegationInfo, setDelegationInfo] = useState<DelegationInfo>({
    delegatedTo: ethers.ZeroAddress,
    delegatedVotes: 0n,
    votingPower: 0n,
    isDelegating: false,
  });

  const [delegateAddress, setDelegateAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Load delegation info
  useEffect(() => {
    if (isConnected && address) {
      loadDelegationInfo();
    }
  }, [isConnected, address]);

  const loadDelegationInfo = async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const [delegatedTo, delegatedVotes, votingPower] = await Promise.all([
        gnusDaoService.getDelegatedTo(address),
        gnusDaoService.getDelegatedVotes(address),
        gnusDaoService.getVotingPower(address),
      ]);

      setDelegationInfo({
        delegatedTo,
        delegatedVotes,
        votingPower,
        isDelegating: delegatedTo !== ethers.ZeroAddress && delegatedTo.toLowerCase() !== address.toLowerCase(),
      });
    } catch (error) {
      console.error("Error loading delegation info:", error);
      toast.error("Error", "Failed to load delegation information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelegate = async () => {
    if (!delegateAddress) {
      toast.error("Error", "Please enter a valid address");
      return;
    }

    if (!ethers.isAddress(delegateAddress)) {
      toast.error("Error", "Invalid Ethereum address");
      return;
    }

    if (delegateAddress.toLowerCase() === address?.toLowerCase()) {
      toast.error("Error", "Cannot delegate to yourself");
      return;
    }

    setIsDelegating(true);
    try {
      const tx = await gnusDaoService.delegate(delegateAddress);
      
      toast.info("Transaction Submitted", "Delegating voting power...");
      
      await tx.wait();
      
      toast.success(
        "Delegation Successful!",
        `You have delegated your voting power to ${delegateAddress.slice(0, 6)}...${delegateAddress.slice(-4)}`
      );

      // Reload delegation info
      await loadDelegationInfo();
      setDelegateAddress("");
    } catch (error: any) {
      console.error("Error delegating:", error);
      toast.error(
        "Delegation Failed",
        error.message || "Failed to delegate voting power"
      );
    } finally {
      setIsDelegating(false);
    }
  };

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      const tx = await gnusDaoService.revokeDelegation();
      
      toast.info("Transaction Submitted", "Revoking delegation...");
      
      await tx.wait();
      
      toast.success(
        "Delegation Revoked!",
        "Your voting power has been returned to you"
      );

      // Reload delegation info
      await loadDelegationInfo();
    } catch (error: any) {
      console.error("Error revoking delegation:", error);
      toast.error(
        "Revocation Failed",
        error.message || "Failed to revoke delegation"
      );
    } finally {
      setIsRevoking(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Connect your wallet to manage delegation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Delegation Status */}
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Delegation Status
        </h3>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading delegation info...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Voting Power */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your Voting Power</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {delegationInfo.votingPower.toString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-50" />
            </div>

            {/* Delegated Votes Received */}
            {delegationInfo.delegatedVotes > 0n && (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Votes Delegated to You</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {delegationInfo.delegatedVotes.toString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-600 dark:text-green-400 opacity-50" />
              </div>
            )}

            {/* Current Delegation */}
            {delegationInfo.isDelegating && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Currently Delegating To:
                    </p>
                    <p className="font-mono text-sm text-yellow-900 dark:text-yellow-100 break-all">
                      {delegationInfo.delegatedTo}
                    </p>
                  </div>
                  <Button
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    variant="outline"
                    size="sm"
                    className="ml-4 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
                  >
                    {isRevoking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Revoking...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Revoke
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delegate Voting Power */}
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ArrowRight className="w-5 h-5" />
          Delegate Voting Power
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Delegate your voting power to another address. They will be able to vote on your behalf,
              but you can revoke this delegation at any time.
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="0x... (Delegate Address)"
              value={delegateAddress}
              onChange={(e) => setDelegateAddress(e.target.value)}
              disabled={isDelegating}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <Button
              onClick={handleDelegate}
              disabled={!delegateAddress || isDelegating}
              className="w-full"
            >
              {isDelegating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Delegating...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Delegate Voting Power
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

