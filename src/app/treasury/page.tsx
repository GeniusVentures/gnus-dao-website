"use client";

import { AuthGuard } from "@/components/auth/AuthButton";
import { ProposeTreasuryActionModal } from "@/components/treasury/ProposeTreasuryActionModal";
import { Button } from "@/components/ui/Button";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import {
  BarChart3, DollarSign, Download, ExternalLink,
  PieChart, Plus, RefreshCw, Send, Wallet, Info,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";

const DIAMOND = "0x84Ba28d277ded98b3488C906E90B6435B116D5b4";
const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";

interface TreasuryStats {
  nativeBalance: bigint;       // ETH tracked by contract
  contractBalance: bigint;     // Actual ETH held by contract
  gdaoBalance: bigint;         // GDAO tokens held by contract
  lastUpdated: Date;
}

export default function TreasuryPage() {
  const { wallet, provider, signer, gnusDaoInitialized } = useWeb3Store();
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [showDepositForm, setShowDepositForm] = useState(false);

  useEffect(() => { loadTreasuryData(); }, [gnusDaoInitialized]);

  const ensureService = async () => {
    if (!gnusDaoService.isInitialized()) {
      if (provider && signer) {
        const network = await provider.getNetwork();
        await gnusDaoService.initialize(provider, signer, Number(network.chainId));
      } else {
        // Read-only with public RPC
        const p = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        await gnusDaoService.initialize(p, undefined, 11155111);
      }
    }
  };

  const loadTreasuryData = async () => {
    setLoading(true);
    try {
      await ensureService();

      const [nativeBalance, contractBalance, gdaoBalance] = await Promise.all([
        gnusDaoService.getTreasuryBalance(),
        gnusDaoService.getContractBalance?.() ?? 0n,
        // GDAO balance of the diamond contract itself
        (async () => {
          try {
            const abi = ["function balanceOf(address) view returns (uint256)"];
            const rpc = provider ?? new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
            const token = new ethers.Contract(DIAMOND, abi, rpc);
            return await token.balanceOf(DIAMOND);
          } catch { return 0n; }
        })(),
      ]);

      setStats({ nativeBalance, contractBalance, gdaoBalance, lastUpdated: new Date() });
    } catch (error) {
      console.error("Failed to load treasury data:", error);
      toast.error("Failed to load treasury data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTreasuryData();
    setRefreshing(false);
    toast.success("Refreshed");
  };

  const handleDeposit = async () => {
    if (!wallet.isConnected || !provider || !signer) {
      alert("Please connect your wallet to deposit ETH.");
      return;
    }
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid ETH amount.");
      return;
    }
    setDepositing(true);
    try {
      const network = await provider.getNetwork();
      await gnusDaoService.initialize(provider, signer, Number(network.chainId));
      toast.loading("Opening MetaMask...", { id: "deposit" });
      const tx = await gnusDaoService.depositToTreasury(ethers.parseEther(depositAmount));
      toast.loading("Waiting for confirmation...", { id: "deposit" });
      await tx.wait();
      toast.dismiss("deposit");
      toast.success(`Deposited ${depositAmount} ETH to treasury`);
      setDepositAmount("");
      setShowDepositForm(false);
      loadTreasuryData();
    } catch (error: any) {
      toast.dismiss("deposit");
      const msg = error?.reason || error?.message || "Deposit failed";
      alert("Deposit failed: " + msg);
    } finally {
      setDepositing(false);
    }
  };

  const fmt = (val: bigint) => {
    const n = Number(ethers.formatEther(val));
    return n === 0 ? "0" : n.toFixed(6).replace(/\.?0+$/, "");
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Treasury</h1>
            <p className="text-muted-foreground text-sm">
              Contract: <a href={`${SEPOLIA_EXPLORER}/address/${DIAMOND}`} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline text-primary">{DIAMOND.slice(0,10)}...{DIAMOND.slice(-6)}</a>
              <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded">Sepolia Testnet</span>
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="mt-4 sm:mt-0 flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-card border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="h-5 w-5 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Tracked ETH Balance</p>
                </div>
                <p className="text-3xl font-bold">{stats ? fmt(stats.nativeBalance) : "0"}</p>
                <p className="text-sm text-muted-foreground mt-1">ETH (via depositToTreasury)</p>
              </div>

              <div className="bg-card border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <p className="text-sm text-muted-foreground">Actual Contract ETH</p>
                </div>
                <p className="text-3xl font-bold">{stats ? fmt(stats.contractBalance) : "0"}</p>
                <p className="text-sm text-muted-foreground mt-1">ETH held by contract</p>
              </div>

              <div className="bg-card border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <PieChart className="h-5 w-5 text-purple-500" />
                  <p className="text-sm text-muted-foreground">GDAO in Contract</p>
                </div>
                <p className="text-3xl font-bold">{stats ? Number(ethers.formatEther(stats.gdaoBalance)).toLocaleString() : "0"}</p>
                <p className="text-sm text-muted-foreground mt-1">GDAO tokens</p>
              </div>
            </div>

            {/* Info banner — treasury is empty */}
            {stats && stats.nativeBalance === 0n && stats.contractBalance === 0n && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Treasury is empty</p>
                  <p>The DAO treasury currently holds no ETH. Use "Deposit ETH" below to fund it. Treasury withdrawals require a governance proposal to be created, voted on, and executed.</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-card border rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Treasury Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Deposit */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Plus className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Deposit ETH</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Send ETH directly to the treasury. Anyone can deposit.</p>
                  {showDepositForm ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="0.01"
                        min="0"
                        step="0.001"
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleDeposit} disabled={depositing || !wallet.isConnected} className="flex-1">
                          {depositing ? "Depositing..." : "Confirm"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowDepositForm(false)} className="flex-1">Cancel</Button>
                      </div>
                      {!wallet.isConnected && <p className="text-xs text-red-500">Connect wallet to deposit</p>}
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowDepositForm(true)}>
                      Deposit ETH
                    </Button>
                  )}
                </div>

                {/* Propose Transfer */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Propose Transfer</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Create a governance proposal to transfer ETH from the treasury. Requires community vote.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowProposeModal(true)}
                    disabled={!wallet.isConnected}
                  >
                    {wallet.isConnected ? "Create Proposal" : "Connect Wallet"}
                  </Button>
                </div>

                {/* View on Etherscan */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ExternalLink className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">View on Etherscan</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">See all transactions, token holdings, and contract interactions on Etherscan.</p>
                  <a href={`${SEPOLIA_EXPLORER}/address/${DIAMOND}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                      <ExternalLink className="h-3 w-3" />
                      Open Etherscan
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                How Treasury Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">Depositing</p>
                  <p>Anyone can deposit ETH using the "Deposit ETH" button. The contract tracks the balance internally. You can also send ETH directly to the contract address.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Withdrawing</p>
                  <p>Withdrawals require a governance proposal. Create a "Treasury Management" proposal, get it voted on and passed, then execute it after the 2-day timelock.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Treasury Managers</p>
                  <p>Addresses with the Treasury Manager role can withdraw directly without a proposal. The owner can assign this role on the Governance page.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Current Status</p>
                  <p>Treasury balance: <strong>{stats ? fmt(stats.nativeBalance) : "0"} ETH</strong>. Voting delay: 1h. Voting period: 7 days. Timelock: 2 days.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {showProposeModal && (
          <ProposeTreasuryActionModal
            onClose={() => setShowProposeModal(false)}
            onActionProposed={() => { setShowProposeModal(false); handleRefresh(); }}
          />
        )}
      </div>
    </AuthGuard>
  );
}
