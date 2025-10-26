"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { Button } from "@/components/ui/Button";
import {
  Wallet,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useSiwe } from "@/lib/auth/useSiwe";

interface WalletDropdownProps {
  className?: string;
}

export function WalletDropdown({ className }: WalletDropdownProps) {
  const { wallet, currentNetwork, disconnect } = useWeb3Store();
  const { isAuthenticated, signIn, signOut } = useSiwe();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!wallet.isConnected || !wallet.address) {
    return null;
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string | undefined) => {
    if (!balance) return "0.00";
    const num = parseFloat(balance);
    if (num === 0) return "0.00";
    if (num < 0.0001) return "< 0.0001";
    return num.toFixed(4);
  };

  const handleCopyAddress = async () => {
    if (!wallet.address) return;

    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  const handleViewOnExplorer = () => {
    if (!wallet.address || !currentNetwork) return;

    const explorerUrl = currentNetwork.blockExplorers?.default?.url
      ? `${currentNetwork.blockExplorers.default.url}/address/${wallet.address}`
      : `https://etherscan.io/address/${wallet.address}`;

    window.open(explorerUrl, "_blank", "noopener,noreferrer");
  };

  const handleDisconnect = async () => {
    try {
      if (isAuthenticated) {
        signOut();
      }
      await disconnect();
      setIsOpen(false);
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error("Disconnect failed:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  const handleSiweAuth = async () => {
    try {
      if (isAuthenticated) {
        signOut();
        toast.success("Signed out");
      } else {
        await signIn();
        toast.success("Successfully authenticated!");
      }
    } catch (error) {
      console.error("SIWE auth failed:", error);
      toast.error("Authentication failed");
    }
  };

  return (
    <div className={`relative ${className || ""}`} ref={dropdownRef}>
      {/* Wallet Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 h-auto min-w-[140px] bg-background hover:bg-accent border-border"
      >
        <div className="flex items-center gap-2 flex-1">
          {/* Status Indicator */}
          <div
            className={`h-2 w-2 rounded-full ${
              isAuthenticated
                ? "bg-green-500 animate-pulse"
                : "bg-yellow-500"
            }`}
          />

          {/* Address */}
          <span className="text-sm font-medium">
            {wallet.ensName || formatAddress(wallet.address)}
          </span>
        </div>

        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Connected Wallet
              </span>
              {isAuthenticated ? (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Authenticated</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-3 w-3" />
                  <span>Not Authenticated</span>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono">
                {wallet.ensName || formatAddress(wallet.address)}
              </span>
            </div>

            {/* Balance */}
            {wallet.balance && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-semibold">
                  {formatBalance(wallet.balance)} {currentNetwork?.nativeCurrency?.symbol || "ETH"}
                </span>
              </div>
            )}

            {/* Network */}
            {currentNetwork && (
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Network:</span>
                <span className="font-medium">{currentNetwork.name}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-2">
            {/* SIWE Authentication */}
            <button
              onClick={handleSiweAuth}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
            >
              {isAuthenticated ? (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out (SIWE)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sign In with Ethereum</span>
                </>
              )}
            </button>

            {/* Copy Address */}
            <button
              onClick={handleCopyAddress}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Address</span>
                </>
              )}
            </button>

            {/* View on Explorer */}
            <button
              onClick={handleViewOnExplorer}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View on Explorer</span>
            </button>

            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-left mt-1 border-t border-border"
            >
              <LogOut className="h-4 w-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

