"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { ArrowRight, Zap, Shield, Users, TrendingUp } from "lucide-react";

export function Hero() {
  const { wallet } = useWeb3Store();
  const isConnected = wallet.isConnected;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      <div className="relative container mx-auto px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center rounded-full border px-4 py-2 text-sm">
            <Zap className="mr-2 h-4 w-4 text-primary" />
            <span className="font-medium">
              Decentralized AI Computing Governance
            </span>
          </div>

          {/* Main heading */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Govern the Future of{" "}
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Decentralized AI
            </span>
          </h1>

          {/* Description */}
          <p className="mb-10 text-lg text-muted-foreground sm:text-xl max-w-3xl mx-auto leading-relaxed">
            Shape the future of decentralized AI computing through democratic
            governance. Vote on network upgrades, GPU provider incentives, and
            AI workload distribution using quadratic voting. Help build the
            world's largest distributed AI infrastructure powered by idle GPUs
            worldwide.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {isConnected ? (
              <Button asChild size="lg" variant="default">
                <Link href="/proposals">
                  View Proposals
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <ConnectWalletButton size="lg">
                Connect Wallet to Start
              </ConnectWalletButton>
            )}

            <Button asChild size="lg" variant="outline">
              <Link href="/docs">Learn More</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">12K+</div>
              <div className="text-sm text-muted-foreground">GPU Nodes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">80%</div>
              <div className="text-sm text-muted-foreground">Cost Savings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">6</div>
              <div className="text-sm text-muted-foreground">Blockchains</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">AI Processing</div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            *Compared to traditional cloud computing providers
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
            <p className="text-sm text-muted-foreground">
              Diamond pattern smart contracts with enterprise-grade security for
              AI workload distribution and governance.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Democratic AI Governance
            </h3>
            <p className="text-sm text-muted-foreground">
              Quadratic voting ensures fair governance of AI infrastructure,
              preventing centralization of compute power.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Global AI Network</h3>
            <p className="text-sm text-muted-foreground">
              Cross-platform AI processing on mobile, desktop, IoT, and gaming
              devices worldwide.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
