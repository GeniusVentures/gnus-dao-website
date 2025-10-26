'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useWeb3Store } from '@/lib/web3/reduxProvider'
import { ArrowRight, Zap, Shield, Users } from 'lucide-react'

export function CTA() {
  const { wallet, connect } = useWeb3Store()
  const isConnected = wallet.isConnected

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
              Join the world's largest decentralized AI computing network. Contribute your GPU power,
              earn GNUS tokens, and help democratize artificial intelligence for everyone.
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
                    <Link href="/treasury">
                      Explore Treasury
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="default"
                    onClick={() => connect()}
                  >
                    Connect Wallet to Start
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/docs">
                      Learn More
                    </Link>
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
              <h3 className="text-lg font-semibold mb-2">Secure AI Processing</h3>
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
              Join the GNUS.AI Network
            </h3>
            <p className="text-muted-foreground mb-6">
              Get updates on network upgrades, new AI capabilities, and GPU provider rewards.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button>
                Subscribe
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>

          {/* Social proof */}
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Powering AI applications for leading organizations worldwide
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              {/* Placeholder for partner logos */}
              <div className="h-8 w-24 bg-muted rounded"></div>
              <div className="h-8 w-24 bg-muted rounded"></div>
              <div className="h-8 w-24 bg-muted rounded"></div>
              <div className="h-8 w-24 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
