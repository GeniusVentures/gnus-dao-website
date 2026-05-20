"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { ArrowRight, Zap, Shield, Users } from "lucide-react";

export function CTA() {
  const { wallet, connect } = useWeb3Store();
  const isConnected = wallet.isConnected;

  return (
    <section className="py-24 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main CTA */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-6 sm:text-4xl lg:text-5xl">
              Power the AI Revolution
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the world's largest decentralized AI computing network.
              Contribute your GPU power, earn GNUS tokens, and help democratize
              artificial intelligence for everyone.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isConnected ? (
                <>
                  <Button asChild size="lg" variant="default">
                    <Link href="/proposals">
                      View Active Proposals
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/treasury">Explore Treasury</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" variant="default">
                    <Link href="/proposals">
                      View Proposals
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/docs">Learn More</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Microsecond transaction speeds for real-time AI processing
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Secure AI Processing
              </h3>
              <p className="text-sm text-muted-foreground">
                End-to-end encryption for AI workloads and data privacy
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Earn Rewards</h3>
              <p className="text-sm text-muted-foreground">
                Get GNUS tokens for contributing GPU power to the network
              </p>
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="bg-card border rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-4">
              Get Started Now
            </h3>
            <p className="text-muted-foreground mb-6">
              The DAO is live on Sepolia testnet. Connect your wallet and start participating in governance today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/proposals">Browse Proposals <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/docs">Read the Docs</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="https://github.com/GeniusVentures/gnus-dao-website" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
