"use client";

import Link from "next/link";
import { Zap, Github, Twitter, MessageCircle, Mail } from "lucide-react";

const navigation = {
  governance: [
    { name: "Proposals", href: "/proposals" },
    { name: "Treasury", href: "/treasury" },
    { name: "Analytics", href: "/analytics" },
    { name: "Voting History", href: "/voting-history" },
  ],
  resources: [
    { name: "Documentation", href: "/docs" },
    { name: "API Reference", href: "/api" },
    { name: "Tutorials", href: "/tutorials" },
    { name: "FAQ", href: "/faq" },
  ],
  community: [
    { name: "Discord", href: "https://discord.gg" },
    { name: "Twitter", href: "https://twitter.com/gnusdao" },
    { name: "GitHub", href: "https://github.com/GeniusVentures/gnus-dao" },
    { name: "Forum", href: "https://forum.gnus.ai" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
    { name: "Security", href: "/security" },
  ],
};

const socialLinks = [
  {
    name: "Twitter",
    href: "https://twitter.com",
    icon: Twitter,
  },
  {
    name: "Discord",
    href: "https://discord.gg",
    icon: MessageCircle,
  },
  {
    name: "GitHub",
    href: "https://github.com/GeniusVentures/gnus-dao",
    icon: Github,
  },
  {
    name: "Email",
    href: "mailto:contact@gnus.ai",
    icon: Mail,
  },
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
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Enterprise-grade decentralized governance platform with quadratic
              voting, multi-chain support, and Diamond pattern smart contracts.
            </p>
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
            <h3 className="text-sm font-semibold mb-4">Governance</h3>
            <ul className="space-y-3">
              {navigation.governance.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
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
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
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
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
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
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} GNUS DAO. All rights reserved.
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Built with ❤️ by Genius Ventures</span>
              <span>•</span>
              <span>Powered by Genius Ventures</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
