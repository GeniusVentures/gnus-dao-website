"use client";

import { Button } from "@/components/ui/Button";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { AlertCircle, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export function DelegationBanner() {
  const { wallet, provider, signer } = useWeb3Store();
  const [isDelegated, setIsDelegated] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [votingPower, setVotingPower] = useState<bigint>(0n);

  useEffect(() => {
    const checkVotingPower = async () => {
      if (!wallet.isConnected || !wallet.address || !provider) {
        setIsDelegated(null);
        return;
      }

      try {
        // Initialize service
        const network = await provider.getNetwork();
        await gnusDaoService.initialize(
          provider,
          signer,
          Number(network.chainId),
        );

        // Get voting power
        const power = await gnusDaoService.getVotingPower(wallet.address);
        setVotingPower(power);

        // Check if user has delegated their voting power to someone else
        const hasOwnVotingPower = await gnusDaoService.isDelegatedToSelf(
          wallet.address,
        );
        setIsDelegated(hasOwnVotingPower);

        // Auto-dismiss if user has voting power
        if (power > 0n && hasOwnVotingPower) {
          setIsDismissed(true);
        }
      } catch (error) {
        console.error("Failed to check voting power:", error);
        setIsDelegated(null);
      }
    };

    checkVotingPower();
  }, [wallet.isConnected, wallet.address, provider, signer]);

  // NOTE: This contract does NOT support self-delegation (reverts with CannotDelegateToSelf).
  // Voting power is derived directly from token balance — no activation step needed.
  // The banner is shown only when a user has delegated their votes AWAY to someone else.

  const handleRevoke = async () => {
    if (!wallet.isConnected || !provider || !signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      // Create a fresh initialization right before the transaction
      const network = await provider.getNetwork();
      await gnusDaoService.initialize(
        provider,
        signer,
        Number(network.chainId),
      );

      const tx = await gnusDaoService.revokeDelegation();
      toast.success("Revocation transaction submitted. Waiting for confirmation...");
      await tx.wait();
      toast.success("Delegation revoked successfully! You now have your own voting power.");
      setIsDelegated(true);
      setIsDismissed(true);
    } catch (error: any) {
      console.error("Failed to revoke delegation:", error);
      let errMsg =
        error.reason ||
        error.data?.message ||
        error.message ||
        "Failed to revoke delegation";
      // Match the custom error NoActiveDelegation (selector 0xba970e57)
      if (
        errMsg.includes("NoActiveDelegation") ||
        error.data === "0xba970e57" ||
        errMsg.includes("0xba970e57")
      ) {
        errMsg =
          "You have not delegated your voting power, so there is nothing to revoke.";
      }
      toast.error(errMsg);
    }
  };

  // Don't show if:
  // - Wallet not connected
  // - Voting power status unknown
  // - User has voting power (tokens and hasn't delegated away)
  // - User dismissed the banner
  if (
    !wallet.isConnected ||
    isDelegated === null ||
    (isDelegated === true && votingPower > 0n) ||
    isDismissed
  ) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
            Voting Power Delegated Away
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            {votingPower === 0n ? (
              <>
                You have delegated your voting power to another address and
                currently have 0 active votes. To vote on proposals yourself,
                revoke the delegation below.
              </>
            ) : (
              <>
                You have delegated your voting power to another address. To vote
                yourself, you need to revoke the delegation. Your current voting
                power: <strong>{votingPower.toString()} votes</strong>
              </>
            )}
          </p>

          <div className="flex items-center gap-3">
            {/* Both states where banner is visible require Revoke */}
            <Button
              onClick={handleRevoke}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Revoke Delegation
            </Button>

            <button
              onClick={() => setIsDismissed(true)}
              className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 underline"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
