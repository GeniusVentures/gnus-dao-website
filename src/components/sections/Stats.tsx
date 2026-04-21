"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";

const DIAMOND = "0x84Ba28d277ded98b3488C906E90B6435B116D5b4";
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

interface OnChainStats {
  proposalCount: number;
  totalSupply: string;
  treasuryBalance: string;
  loaded: boolean;
}

export function Stats() {
  const [chain, setChain] = useState<OnChainStats>({ proposalCount: 0, totalSupply: "0", treasuryBalance: "0", loaded: false });

  useEffect(() => {
    const load = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC);
        const abi = [
          'function getProposalCount() view returns (uint256)',
          'function totalSupply() view returns (uint256)',
          'function getTreasuryBalance() view returns (uint256)',
        ];
        const c = new ethers.Contract(DIAMOND, abi, provider);
        const [count, supply, treasury] = await Promise.all([
          c.getProposalCount().catch(() => 0n),
          c.totalSupply().catch(() => 0n),
          c.getTreasuryBalance().catch(() => 0n),
        ]);
        setChain({
          proposalCount: Number(count),
          totalSupply: Number(ethers.formatEther(supply)).toLocaleString(),
          treasuryBalance: ethers.formatEther(treasury),
          loaded: true,
        });
      } catch { /* ignore */ }
    };
    load();
  }, []);

  const stats = [
    {
      label: "Governance Proposals",
      value: chain.loaded ? chain.proposalCount.toString() : "—",
      description: "Proposals created on-chain",
      live: true,
    },
    {
      label: "GDAO Total Supply",
      value: chain.loaded ? chain.totalSupply : "—",
      description: "Governance tokens in circulation",
      live: true,
    },
    {
      label: "Treasury Balance",
      value: chain.loaded ? `${chain.treasuryBalance} ETH` : "—",
      description: "ETH held in DAO treasury",
      live: true,
    },
    {
      label: "Quorum Threshold",
      value: "1,000",
      description: "Votes required for a proposal to pass",
      live: false,
    },
    {
      label: "Voting Period",
      value: "7 days",
      description: "Duration of each governance vote",
      live: false,
    },
    {
      label: "Network",
      value: "Sepolia",
      description: "Ethereum testnet deployment",
      live: false,
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 sm:text-4xl">
            GNUS DAO by the Numbers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Live governance statistics from the Sepolia testnet deployment
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300"
            >
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-lg font-semibold mb-2">{stat.label}</div>
              <div className="text-sm text-muted-foreground">{stat.description}</div>
              {stat.live && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Live data from contract{" "}
          <a
            href={`https://sepolia.etherscan.io/address/${DIAMOND}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:text-primary underline"
          >
            {DIAMOND.slice(0, 10)}...{DIAMOND.slice(-6)}
          </a>
        </div>
      </div>
    </section>
  );
}

