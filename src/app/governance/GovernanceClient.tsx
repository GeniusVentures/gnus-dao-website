"use client";

import React, { useState, useEffect } from "react";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { DelegationManager } from "@/components/governance/DelegationManager";
import { RoleManager } from "@/components/admin/RoleManager";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { ethers } from "ethers";
import { Settings, Shield, Pause, User, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";

const DIAMOND = "0x84Ba28d277ded98b3488C906E90B6435B116D5b4";

interface GovernanceConfig {
  votingDelay: bigint;
  votingPeriod: bigint;
  proposalThreshold: bigint;
  quorumVotes: bigint;
}

interface UserPermissions {
  isOwner: boolean;
  isTreasuryManager: boolean;
  isMinter: boolean;
  isPaused: boolean;
}

export default function GovernanceClient() {
  const { wallet, provider, signer } = useWeb3Store();
  const { address, isConnected } = wallet;

  const [config, setConfig] = useState<GovernanceConfig | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({
    isOwner: false, isTreasuryManager: false, isMinter: false, isPaused: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleManagement, setShowRoleManagement] = useState(false);

  // Send tokens state
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [gdaoBalance, setGdaoBalance] = useState<bigint>(0n);

  useEffect(() => { loadGovernanceData(); }, [isConnected, address]);

  const loadGovernanceData = async () => {
    setIsLoading(true);
    try {
      const governanceParams = await gnusDaoService.getGovernanceParams();
      if (governanceParams) setConfig(governanceParams);

      if (address) {
        const [owner, isTreasuryManager, isMinter, isPaused, bal] = await Promise.all([
          gnusDaoService.getOwner(),
          gnusDaoService.isTreasuryManager(address),
          gnusDaoService.isMinter(address),
          gnusDaoService.isPaused(),
          gnusDaoService.getTokenBalance(address),
        ]);
        setPermissions({
          isOwner: owner.toLowerCase() === address.toLowerCase(),
          isTreasuryManager, isMinter, isPaused,
        });
        setGdaoBalance(bal);
      }
    } catch (error) {
      console.error("Error loading governance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!isConnected || !provider || !signer) {
      alert("Please connect your wallet first.");
      return;
    }

    // Resolve ENS name to address if needed
    let resolvedAddress = sendTo.trim();
    if (!ethers.isAddress(resolvedAddress)) {
      if (resolvedAddress.endsWith(".eth") || resolvedAddress.includes(".")) {
        try {
          const mainnet = new ethers.JsonRpcProvider("https://ethereum.publicnode.com");
          const resolved = await mainnet.resolveName(resolvedAddress);
          if (!resolved) {
            alert(`Could not resolve ENS name: ${resolvedAddress}`);
            return;
          }
          resolvedAddress = resolved;
        } catch {
          alert(`Failed to resolve ENS name: ${resolvedAddress}`);
          return;
        }
      } else {
        alert("Invalid recipient address.");
        return;
      }
    }

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }
    const amountWei = ethers.parseEther(sendAmount);
    if (amountWei > gdaoBalance) {
      alert(`Insufficient balance. You have ${ethers.formatEther(gdaoBalance)} GDAO.`);
      return;
    }

    setSending(true);
    try {
      const network = await provider.getNetwork();
      await gnusDaoService.initialize(provider, signer, Number(network.chainId));
      toast.loading("Opening MetaMask...", { id: "send" });
      const tx = await gnusDaoService.transfer(resolvedAddress, amountWei);
      toast.loading("Waiting for confirmation...", { id: "send" });
      await tx.wait();
      toast.dismiss("send");
      const displayTo = sendTo !== resolvedAddress ? sendTo : `${resolvedAddress.slice(0,6)}...${resolvedAddress.slice(-4)}`;
      toast.success(`Sent ${sendAmount} GDAO to ${displayTo}`);
      setSendTo("");
      setSendAmount("");
      loadGovernanceData(); // refresh balance
    } catch (error: any) {
      toast.dismiss("send");
      const msg = error?.reason || error?.message || "Transfer failed";
      alert("Transfer failed: " + msg);
    } finally {
      setSending(false);
    }
  };

  const setMaxAmount = () => {
    setSendAmount(ethers.formatEther(gdaoBalance));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Governance
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your voting power, send tokens, and view governance settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <DelegationManager />

          {/* Send Tokens Panel */}
          {isConnected && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send GDAO Tokens
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Transfer GDAO to another wallet or to the treasury contract.
              </p>

              {/* Balance */}
              <div className="bg-muted/50 rounded-lg p-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your balance</span>
                <span className="font-semibold">
                  {Number(ethers.formatEther(gdaoBalance)).toLocaleString()} GDAO
                </span>
              </div>

              {/* Quick-fill buttons */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="text-xs text-muted-foreground self-center">Quick send to:</span>
                <button
                  onClick={() => setSendTo(DIAMOND)}
                  className="text-xs px-2 py-1 border rounded hover:bg-accent transition-colors font-mono"
                >
                  Treasury ({DIAMOND.slice(0,6)}...)
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Recipient Address</label>
                  <input
                    type="text"
                    value={sendTo}
                    onChange={e => setSendTo(e.target.value)}
                    placeholder="0x... or click Treasury above"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount (GDAO)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={e => setSendAmount(e.target.value)}
                      placeholder="100"
                      min="0"
                      step="1"
                      className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button variant="outline" size="sm" onClick={setMaxAmount} className="whitespace-nowrap">
                      Max
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                {sendTo && sendAmount && (ethers.isAddress(sendTo) || sendTo.includes(".")) && parseFloat(sendAmount) > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      Send <strong>{sendAmount} GDAO</strong> to{" "}
                      <span className="font-mono">
                        {sendTo === DIAMOND ? "Treasury" : ethers.isAddress(sendTo) ? `${sendTo.slice(0,6)}...${sendTo.slice(-4)}` : sendTo}
                      </span>
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  disabled={sending || !sendTo || !sendAmount}
                  className="w-full flex items-center gap-2"
                >
                  {sending ? (
                    <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send GDAO</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Governance Config */}
          <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Governance Config
            </h3>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : config ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Voting Delay</span>
                  <span className="font-semibold">
                    {Number(config.votingDelay) >= 3600
                      ? `${Math.round(Number(config.votingDelay) / 3600)}h`
                      : `${Math.round(Number(config.votingDelay) / 60)}m`}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Voting Period</span>
                  <span className="font-semibold">{Math.round(Number(config.votingPeriod) / 86400)} days</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Proposal Threshold</span>
                  <span className="font-semibold">{Number(config.proposalThreshold / 10n**18n).toLocaleString()} GDAO</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Quorum</span>
                  <span className="font-semibold">{Number(config.quorumVotes).toLocaleString()} votes</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Failed to load</p>
            )}
          </div>

          {/* Permissions */}
          {isConnected && (
            <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Your Permissions
              </h3>
              <div className="space-y-2">
                {permissions.isPaused && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <Pause className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">Contract Paused</span>
                  </div>
                )}
                <PermissionBadge label="Owner" active={permissions.isOwner} icon={<User className="w-4 h-4" />} />
                <PermissionBadge label="Treasury Manager" active={permissions.isTreasuryManager} icon={<Shield className="w-4 h-4" />} />
                {!permissions.isOwner && !permissions.isTreasuryManager && (
                  <p className="text-sm text-gray-500 text-center py-4">No special permissions</p>
                )}
                {permissions.isOwner && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowRoleManagement(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Manage Roles
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showRoleManagement && <RoleManager onClose={() => setShowRoleManagement(false)} />}
      </div>
    </div>
  );
}

function PermissionBadge({ label, active, icon }: { label: string; active: boolean; icon: React.ReactNode }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      active ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
             : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
    }`}>
      <div className="flex items-center gap-2">
        <div className={active ? "text-green-600 dark:text-green-400" : "text-gray-400"}>{icon}</div>
        <span className={`text-sm font-medium ${active ? "text-green-800 dark:text-green-200" : "text-gray-600 dark:text-gray-400"}`}>{label}</span>
      </div>
      <div className={`w-2 h-2 rounded-full ${active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
    </div>
  );
}

