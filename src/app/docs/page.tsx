import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  BookOpen,
  Code,
  Users,
  Vote,
  Wallet,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description: "GNUS DAO documentation and guides",
};

const docSections = [
  {
    title: "Getting Started",
    description: "Learn the basics of GNUS DAO governance",
    icon: BookOpen,
    links: [
      { name: "What is GNUS DAO?", href: "#what-is-gnus-dao" },
      { name: "How to Connect Wallet", href: "#connect-wallet" },
      { name: "Understanding Proposals", href: "#proposals" },
      { name: "Voting Process", href: "#voting" },
    ],
  },
  {
    title: "Governance",
    description: "Understand our governance mechanisms",
    icon: Vote,
    links: [
      { name: "Quadratic Voting", href: "#quadratic-voting" },
      { name: "Proposal Creation", href: "#proposal-creation" },
      { name: "Treasury Management", href: "#treasury" },
      { name: "Voting Power", href: "#voting-power" },
    ],
  },
  {
    title: "Technical",
    description: "Technical documentation for developers",
    icon: Code,
    links: [
      { name: "Smart Contracts", href: "#smart-contracts" },
      { name: "Diamond Pattern", href: "#diamond-pattern" },
      { name: "Multi-Chain Support", href: "#multi-chain" },
      { name: "API Reference", href: "#api" },
    ],
  },
  {
    title: "Community",
    description: "Join our community and get support",
    icon: Users,
    links: [
      { name: "Discord", href: "https://discord.gg", external: true },
      {
        name: "GitHub",
        href: "https://github.com/GeniusVentures/gnus-dao",
        external: true,
      },
      { name: "Forum", href: "https://forum.gnus.ai", external: true },
      { name: "Twitter", href: "https://twitter.com", external: true },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Documentation</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Everything you need to know about GNUS DAO governance, voting, and
          participation
        </p>
      </div>

      {/* Quick Start */}
      <div className="bg-card border rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Quick Start
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary font-bold">1</span>
            </div>
            <h3 className="font-medium mb-2">Connect Wallet</h3>
            <p className="text-sm text-muted-foreground">
              Connect your MetaMask, Coinbase, or WalletConnect wallet
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary font-bold">2</span>
            </div>
            <h3 className="font-medium mb-2">View Proposals</h3>
            <p className="text-sm text-muted-foreground">
              Browse active proposals and read the details
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary font-bold">3</span>
            </div>
            <h3 className="font-medium mb-2">Vote</h3>
            <p className="text-sm text-muted-foreground">
              Cast your vote using quadratic voting mechanism
            </p>
          </div>
        </div>
        <div className="text-center mt-6">
          <Button asChild>
            <Link href="/proposals">
              Start Voting
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Documentation Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {docSections.map((section) => (
          <div key={section.title} className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <section.icon className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">{section.title}</h3>
            </div>
            <p className="text-muted-foreground mb-4">{section.description}</p>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.name}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {link.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <a
                      href={link.href}
                      className="text-sm text-primary hover:underline"
                    >
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Support Section */}
      <div className="bg-muted rounded-lg p-6 mt-8 text-center">
        <h3 className="text-xl font-semibold mb-2">Need Help?</h3>
        <p className="text-muted-foreground mb-4">
          Can't find what you're looking for? Join our community for support.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="outline" asChild>
            <a
              href="https://discord.gg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Discord
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://github.com/GeniusVentures/gnus-dao"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Issues
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
