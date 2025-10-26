"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  BarChart3,
  ExternalLink,
  RefreshCw,
  Download,
  Send,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthGuard } from "@/components/auth/AuthButton";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { formatAddress } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { ProposeTreasuryActionModal } from "@/components/treasury/ProposeTreasuryActionModal";

interface TreasuryAsset {
  address: string;
  symbol: string;
  name: string;
  balance: bigint;
  decimals: number;
  usdValue: number;
  change24h: number;
}

interface TreasuryStats {
  totalValue: number;
  change24h: number;
  nativeBalance: bigint;
  tokenCount: number;
  lastUpdated: Date;
}

export default function TreasuryPage() {
  const { wallet, currentNetwork, gnusDaoInitialized } = useWeb3Store();
  const [treasuryStats, setTreasuryStats] = useState<TreasuryStats | null>(
    null,
  );
  const [assets, setAssets] = useState<TreasuryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);

  useEffect(() => {
    loadTreasuryData();
  }, [gnusDaoInitialized]);

  const loadTreasuryData = async () => {
    if (!gnusDaoInitialized) {
      // Show empty state when contract is not available
      setTreasuryStats({
        totalValue: 0,
        change24h: 0,
        nativeBalance: 0n,
        tokenCount: 0,
        lastUpdated: new Date(),
      });
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get real treasury balance from contract
      const nativeBalance = await gnusDaoService.getTreasuryBalance();

      // Create assets array with real data
      const realAssets: TreasuryAsset[] = [
        {
          address: "0x0000000000000000000000000000000000000000",
          symbol: currentNetwork?.nativeCurrency.symbol || "ETH",
          name: currentNetwork?.nativeCurrency.name || "Ethereum",
          balance: nativeBalance,
          decimals: 18,
          usdValue: (Number(nativeBalance) * 2000) / 1e18, // Mock ETH price for USD calculation
          change24h: 0, // Would need price API for real change data
        },
      ];

      // For Sepolia testnet, we might not have many tokens, so we'll show what we have
      const totalValue = realAssets.reduce(
        (sum, asset) => sum + asset.usdValue,
        0,
      );

      setAssets(realAssets);
      setTreasuryStats({
        totalValue,
        change24h: 0, // Would need historical data for real change calculation
        nativeBalance,
        tokenCount: realAssets.length,
        lastUpdated: new Date(),
      });
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
    toast.success("Treasury data refreshed");
  };

  const formatBalance = (balance: bigint, decimals: number): string => {
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const fraction = balance % divisor;

    if (fraction === 0n) {
      return whole.toString();
    }

    const fractionStr = fraction.toString().padStart(decimals, "0");
    const trimmed = fractionStr.replace(/0+$/, "");
    return `${whole}.${trimmed}`;
  };

  const formatUSD = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  // Skip contract check for testing
  // if (!gnusDaoInitialized) {
  //   return (
  //     <div className="container mx-auto px-4 py-8">
  //       <div className="text-center">
  //         <h1 className="text-3xl font-bold mb-4">Treasury Dashboard</h1>
  //         <p className="text-muted-foreground mb-8">
  //           GNUS DAO contract not available on this network.
  //         </p>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <AuthGuard requireAuth={false}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Treasury Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor and manage GNUS DAO treasury assets
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              Loading treasury data...
            </p>
          </div>
        ) : (
          <>
            {/* Treasury Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-card border rounded-lg p-6" data-testid="stat">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Value
                    </p>
                    <p className="text-2xl font-bold">
                      {treasuryStats
                        ? formatUSD(treasuryStats.totalValue)
                        : "$0"}
                    </p>
                    {treasuryStats && (
                      <p
                        className={`text-sm flex items-center ${
                          treasuryStats.change24h >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {treasuryStats.change24h >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {formatChange(treasuryStats.change24h)} 24h
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6" data-testid="stat">
                <div className="flex items-center">
                  <Wallet className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Native Balance
                    </p>
                    <p className="text-2xl font-bold" data-testid="treasury-balance">
                      {treasuryStats
                        ? formatBalance(treasuryStats.nativeBalance, 18)
                        : "0"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentNetwork?.nativeCurrency.symbol || "ETH"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6" data-testid="stat">
                <div className="flex items-center">
                  <PieChart className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Assets
                    </p>
                    <p className="text-2xl font-bold">{assets.length}</p>
                    <p className="text-sm text-muted-foreground">
                      Different tokens
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6" data-testid="stat">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Last Updated
                    </p>
                    <p className="text-lg font-bold">
                      {treasuryStats?.lastUpdated.toLocaleTimeString() ||
                        "Never"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {treasuryStats?.lastUpdated.toLocaleDateString() || ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Assets Table */}
            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Treasury Assets</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Asset
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        USD Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        24h Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assets.map((asset) => (
                      <tr key={asset.address} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {asset.symbol.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium">
                                {asset.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {asset.symbol}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">
                            {formatBalance(asset.balance, asset.decimals)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {asset.symbol}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">
                            {formatUSD(asset.usdValue)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`text-sm flex items-center ${
                              asset.change24h >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {asset.change24h >= 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {formatChange(asset.change24h)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Send className="h-3 w-3" />
                              Transfer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Treasury Actions */}
            <div className="mt-8 bg-card border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Treasury Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col items-center gap-2"
                  onClick={() => setShowProposeModal(true)}
                >
                  <Send className="h-6 w-6" />
                  <span className="font-medium">Transfer Assets</span>
                  <span className="text-xs text-muted-foreground">
                    Send tokens to addresses
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col items-center gap-2"
                  onClick={() => toast("Add asset tracking coming soon")}
                >
                  <Plus className="h-6 w-6" />
                  <span className="font-medium">Add Asset</span>
                  <span className="text-xs text-muted-foreground">
                    Track new token
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col items-center gap-2"
                  data-testid="chart"
                >
                  <BarChart3 className="h-6 w-6" />
                  <span className="font-medium">Analytics</span>
                  <span className="text-xs text-muted-foreground">
                    View detailed reports
                  </span>
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Propose Treasury Action Modal */}
        {showProposeModal && (
          <ProposeTreasuryActionModal
            onClose={() => setShowProposeModal(false)}
            onActionProposed={() => {
              setShowProposeModal(false);
              handleRefresh();
            }}
          />
        )}
      </div>
    </AuthGuard>
  );
}
