"use client";

import { useSiwe } from "@/lib/auth/useSiwe";
import { Button } from "@/components/ui/Button";
import { VoteSupport } from "@/lib/contracts/gnusDao";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { ethers } from "ethers";
import { CheckCircle, Minus, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface VotingModalProps {
  proposalId: bigint;
  proposalTitle: string;
  onClose: () => void;
  onVoteSubmitted: () => void;
}

export function VotingModal({ proposalId, proposalTitle, onClose, onVoteSubmitted }: VotingModalProps) {
  const { wallet, provider, signer } = useWeb3Store();
  const { isAuthenticated, signIn } = useSiwe();

  const [selectedSupport, setSelectedSupport] = useState<VoteSupport>(VoteSupport.For);
  // votes is the number of votes to cast (human units, not wei)
  const [votes, setVotes] = useState(1);
  const [loading, setLoading] = useState(false);

  // Human-readable GDAO balance (already divided by 1e18)
  const [gdaoBalance, setGdaoBalance] = useState(0);
  const [maxVotes, setMaxVotes] = useState(10000);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  useEffect(() => {
    loadBalance();
  }, [wallet.address]);

  const loadBalance = async () => {
    if (!wallet.address) return;
    try {
      const [balance, config, voteReceipt] = await Promise.all([
        gnusDaoService.getTokenBalance(wallet.address),
        gnusDaoService.getVotingConfig(),
        gnusDaoService.getVoteReceipt(proposalId, wallet.address).catch(() => null),
      ]);
      const gdao = Number(ethers.formatEther(balance));
      setGdaoBalance(gdao);
      if (config?.maxVotesPerWallet) setMaxVotes(Number(config.maxVotesPerWallet));
      if (voteReceipt?.hasVoted) setAlreadyVoted(true);
    } catch (e) {
      console.error("Failed to load balance:", e);
    }
  };

  // Quadratic cost in GDAO (votes²)
  const cost = votes * votes;
  // Max votes = floor(sqrt(balance))
  const maxPossibleVotes = Math.min(maxVotes, Math.floor(Math.sqrt(gdaoBalance)));
  const canAfford = cost <= gdaoBalance;
  const remaining = gdaoBalance - cost;

  const handleVote = async () => {
    if (!wallet.address) { alert("Please connect your wallet."); return; }

    if (!isAuthenticated) {
      try {
        await signIn();
      } catch { return; }
    }

    if (!canAfford) {
      alert(`Insufficient GDAO. You need ${cost} GDAO but have ${gdaoBalance.toFixed(2)} GDAO.`);
      return;
    }

    setLoading(true);
    try {
      if (provider && signer) {
        const network = await provider.getNetwork();
        await gnusDaoService.initialize(provider, signer, Number(network.chainId));
      }

      // The vote() function calls burnFrom(voter, votes²) internally.
      // burnFrom requires the diamond to have an ERC20 allowance from the voter.
      // We must approve the diamond to spend the token cost before voting.
      const costWei = ethers.parseEther(cost.toString());

      // Step 1: Activate voting power checkpoints if needed (delegate to self)
      // Wallets that received tokens via transfer have no checkpoints until they delegate.
      // getPastVotingPower (used inside vote()) reads checkpoints, not current balance.
      const DIAMOND_ADDR = "0x84Ba28d277ded98b3488C906E90B6435B116D5b4";
      const checkAbi = ['function getDelegates(address) view returns (address)'];
      const checkContract = new ethers.Contract(DIAMOND_ADDR, checkAbi, provider!);
      const currentDelegate = await (checkContract.getDelegates as (addr: string) => Promise<string>)(wallet.address!);
      if (currentDelegate === ethers.ZeroAddress) {
        toast.loading("Step 1/3: Activating voting power (delegate to self)...", { id: "vote" });
        const delegateTx = await gnusDaoService.delegate(wallet.address!);
        await delegateTx.wait();
      }

      // Step 2: Approve token spend
      toast.loading(`${currentDelegate === ethers.ZeroAddress ? "Step 2/3" : "Step 1/2"}: Approving token spend...`, { id: "vote" });
      const approveTx = await gnusDaoService.approve(DIAMOND_ADDR, costWei);
      await approveTx.wait();

      // Step 3: Cast vote
      toast.loading(`${currentDelegate === ethers.ZeroAddress ? "Step 3/3" : "Step 2/2"}: Casting vote...`, { id: "vote" });
      const tx = await gnusDaoService.castVote(proposalId, selectedSupport, BigInt(votes));
      toast.loading("Waiting for confirmation...", { id: "vote" });
      await tx.wait();
      toast.dismiss("vote");
      toast.success(`Voted! ${votes} vote${votes > 1 ? 's' : ''} cast, ${cost.toLocaleString()} GDAO burned.`);
      onVoteSubmitted();
      onClose();
    } catch (error: any) {
      toast.dismiss("vote");
      const msg = error?.reason || error?.message || "Vote failed";
      if (msg.includes("AlreadyVoted") || error?.data === "0x7c9a1cf9") {
        setAlreadyVoted(true);
        alert("You have already voted on this proposal. Each address can only vote once.");
      } else if (msg.includes("VotingNotStarted")) alert("Voting hasn't started yet. Please wait for the voting delay.");
      else if (msg.includes("VotingEnded")) alert("Voting has ended for this proposal.");
      else if (msg.includes("InsufficientVotingPower") || error?.data === "0xcabeb655") alert("Insufficient voting power. Your tokens may not have checkpoints yet — try voting again, the activation step should fix this.");
      else if (msg.includes("InsufficientAllowance") || error?.data === "0x13be252b") alert("Token approval failed. Please try again.")
      else alert("Vote failed: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-xl max-w-md w-full shadow-xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold">Cast Your Vote</h2>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{proposalTitle}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4">
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Balance */}
          <div className="bg-muted/50 rounded-lg p-3 mb-5 flex justify-between text-sm">
            <span className="text-muted-foreground">Your GDAO balance</span>
            <span className="font-semibold">{gdaoBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} GDAO</span>
          </div>

          {/* Already voted */}
          {alreadyVoted ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 text-sm text-blue-800 dark:text-blue-200">
              ✓ You have already voted on this proposal. Each address can only vote once.
            </div>
          ) : (
          <>
          {/* Vote type */}
          <div className="mb-5">
            <p className="text-sm font-medium mb-2">Vote direction</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: VoteSupport.For, label: "For", icon: <ThumbsUp className="w-4 h-4" />, cls: "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" },
                { type: VoteSupport.Against, label: "Against", icon: <ThumbsDown className="w-4 h-4" />, cls: "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" },
                { type: VoteSupport.Abstain, label: "Abstain", icon: <Minus className="w-4 h-4" />, cls: "border-gray-400 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
              ].map(({ type, label, icon, cls }) => (
                <button
                  key={type}
                  onClick={() => setSelectedSupport(type)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    selectedSupport === type ? cls : "border-input hover:border-muted-foreground"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Votes slider */}
          <div className="mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Number of votes</span>
              <span className="font-bold text-primary">{votes} vote{votes > 1 ? 's' : ''}</span>
            </div>
            <input
              type="range"
              min={1}
              max={Math.max(1, maxPossibleVotes)}
              value={votes}
              onChange={e => setVotes(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 vote</span>
              <span>{maxPossibleVotes} max (√{gdaoBalance.toFixed(0)})</span>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="bg-muted/50 rounded-lg p-4 mb-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quadratic cost ({votes}² votes)</span>
              <span className={`font-semibold ${canAfford ? "" : "text-red-500"}`}>
                {cost.toLocaleString()} GDAO
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining after vote</span>
              <span className={`font-semibold ${remaining >= 0 ? "" : "text-red-500"}`}>
                {remaining >= 0 ? remaining.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"} GDAO
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="text-muted-foreground">Status</span>
              {canAfford ? (
                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Can afford</span>
              ) : (
                <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> Insufficient GDAO</span>
              )}
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground mb-5">
            Voting may require up to 3 MetaMask confirmations: activate voting power (first time only),
            approve token spend, then cast the vote.
            This burns {cost.toLocaleString()} GDAO permanently (votes² = {votes}² = {cost.toLocaleString()}).
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              {alreadyVoted ? "Close" : "Cancel"}
            </Button>
            {!alreadyVoted && (
            <Button
              onClick={handleVote}
              disabled={loading || !canAfford || votes < 1}
              className={`flex-1 ${
                selectedSupport === VoteSupport.For ? "bg-green-600 hover:bg-green-700" :
                selectedSupport === VoteSupport.Against ? "bg-red-600 hover:bg-red-700" :
                "bg-gray-600 hover:bg-gray-700"
              } text-white`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Voting...
                </span>
              ) : (
                `Vote ${selectedSupport === VoteSupport.For ? "For" : selectedSupport === VoteSupport.Against ? "Against" : "Abstain"} · ${cost.toLocaleString()} GDAO`
              )}
            </Button>
            )}
          </div>
          </> /* end !alreadyVoted */
          )}
        </div>
      </div>
    </div>
  );
}
