"use client";

import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Stats } from "@/components/sections/Stats";
import { EcosystemIntegration } from "@/components/sections/EcosystemIntegration";
import { CTA } from "@/components/sections/CTA";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Vote,
  DollarSign,
  BarChart3,
  Users,
  Database,
  Shield,
  Code,
} from "lucide-react";
import { getContractAddress } from "@/lib/config/env";

function GovernanceOverview() {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            GNUS.AI Governance Dashboard
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Shape the future of decentralized AI computing through democratic
            governance of the world's largest distributed GPU network
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link href="/proposals" className="group">
            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-all duration-300 group-hover:border-primary/50">
              <div className="flex items-center mb-4">
                <Vote className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <h3 className="font-semibold">Network Proposals</h3>
                  <p className="text-sm text-muted-foreground">
                    AI network governance
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Vote on GPU provider incentives, AI workload distribution, and
                network upgrades
              </p>
            </div>
          </Link>

          <Link href="/treasury" className="group">
            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-all duration-300 group-hover:border-primary/50">
              <div className="flex items-center mb-4">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <h3 className="font-semibold">Network Treasury</h3>
                  <p className="text-sm text-muted-foreground">
                    GNUS token economics
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Monitor GNUS token distribution and GPU provider reward
                allocation
              </p>
            </div>
          </Link>

          <Link href="/analytics" className="group">
            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-all duration-300 group-hover:border-primary/50">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <h3 className="font-semibold">Network Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    AI compute insights
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Monitor GPU utilization, AI task completion, and network
                performance metrics
              </p>
            </div>
          </Link>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <h3 className="font-semibold">GPU Providers</h3>
                <p className="text-sm text-muted-foreground">
                  Earn GNUS tokens
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Connect your device to contribute GPU power and earn GNUS token
              rewards
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/proposals">
            <Button size="lg" className="mr-4">
              View Proposals
            </Button>
          </Link>
          <Link href="/treasury">
            <Button variant="outline" size="lg">
              Treasury Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// Technical Details Section
function TechnicalDetails() {
  const sepoliaAddress = getContractAddress("sepolia");

  const technicalFeatures = [
    {
      icon: Shield,
      title: "Diamond Pattern Smart Contracts",
      description:
        "EIP-2535 Diamond proxy pattern for upgradeable governance contracts",
      detail: "Modular, secure, and gas-efficient smart contract architecture",
    },
    {
      icon: Database,
      title: "IPFS Integration",
      description:
        "Decentralized storage with file upload, modal dialogs, and proposal metadata",
      detail:
        "Pinata service with multiple gateway fallbacks and drag-drop file upload",
    },
    {
      icon: Code,
      title: "Multi-Chain Deployment",
      description:
        "Cross-chain governance on Ethereum, Base, Polygon, and SKALE",
      detail: sepoliaAddress
        ? `Sepolia: ${sepoliaAddress}`
        : "Contract addresses configured per network",
    },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Technical Infrastructure</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built on enterprise-grade blockchain technology with decentralized
            storage and cross-chain compatibility
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {technicalFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="h-6 w-6 text-primary" />
                </div>

                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>

                <p className="text-muted-foreground text-sm mb-3">
                  {feature.description}
                </p>

                <p className="text-xs text-muted-foreground/80 font-mono">
                  {feature.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <GovernanceOverview />
      <TechnicalDetails />
      <Stats />
      <EcosystemIntegration />
      <CTA />
    </>
  );
}
