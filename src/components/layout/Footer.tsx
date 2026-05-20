"use client";

import Link from "next/link";
import { Zap, Github, Twitter, MessageCircle, Mail } from "lucide-react";

const navigation = {
  governance: [
    { name: "Proposals", href: "/proposals" },
    { name: "Governance", href: "/governance" },
    { name: "Treasury", href: "/treasury" },
    { name: "Analytics", href: "/analytics" },
    { name: "History", href: "/history" },
    { name: "Settings", href: "/settings" },
  ],
  resources: [
    { name: "Documentation", href: "/docs" },
    { name: "Smart Contracts", href: "/docs#smart-contracts" },
    { name: "Quadratic Voting", href: "/docs#quadratic-voting" },
    { name: "GitHub", href: "https://github.com/GeniusVentures/gnus-dao-website", external: true },
  ],
  community: [
    { name: "Discord", href: "https://discord.com/invite/gnusai", external: true },
    { name: "Twitter / X", href: "https://twitter.com/gnusai", external: true },
    { name: "GitHub", href: "https://github.com/GeniusVentures", external: true },
    { name: "gnus.ai", href: "https://gnus.ai", external: true },
  ],
  legal: [
    { name: "Privacy Policy", href: "https://gnus.ai/privacy", external: true },
    { name: "Terms of Service", href: "https://gnus.ai/terms", external: true },
    { name: "Security", href: "https://github.com/GeniusVentures/gnus-dao-website/security", external: true },
    { name: "Etherscan", href: "https://sepolia.etherscan.io/address/0x84Ba28d277ded98b3488C906E90B6435B116D5b4", external: true },
  ],
};

const socialLinks = [
  { name: "Twitter", href: "https://twitter.com/gnusai", icon: Twitter },
  { name: "Discord", href: "https://discord.com/invite/gnusai", icon: MessageCircle },
  { name: "GitHub", href: "https://github.com/GeniusVentures", icon: Github },
  { name: "Email", href: "mailto:contact@gnus.ai", icon: Mail },
];

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                GNUS DAO
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-3 max-w-sm">
              Decentralized governance platform with quadratic voting and Diamond pattern smart contracts.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
              Sepolia Testnet
            </div>
            <div className="flex space-x-4">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <span className="sr-only">{item.name}</span>
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Governance */}
          <div>
            <h3 className="text-sm font-semibold mb-4">App</h3>
            <ul className="space-y-3">
              {navigation.governance.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {navigation.resources.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {item.name}
                    </a>
                  ) : (
                    <Link href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Community</h3>
            <ul className="space-y-3">
              {navigation.community.map((item) => (
                <li key={item.name}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              {navigation.legal.map((item) => (
                <li key={item.name}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} GNUS DAO. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Built by <a href="https://gnus.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Genius Ventures</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
