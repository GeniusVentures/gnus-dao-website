"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { X, Wallet, Smartphone, Monitor, Download, Sparkles, Shield } from "lucide-react";
import { WalletConnector } from "@/lib/web3/types";

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (connector: WalletConnector) => Promise<void>;
  connectors: WalletConnector[];
  isConnecting: boolean;
  connectingWallet?: string | undefined;
}

// Separate component for wallet icon to properly handle state
function WalletIcon({ connector }: { connector: WalletConnector }) {
  const [imageError, setImageError] = useState(false);

  const fallbackEmojis: Record<string, string> = {
    metamask: "🦊",
    coinbase: "🔵",
    walletconnect: "🔗",
    injected: "👛",
  };

  // Try to use the connector's icon if available
  if (connector.icon && !imageError) {
    return (
      <div className="relative w-12 h-12 flex items-center justify-center">
        <img
          src={connector.icon}
          alt={connector.name}
          className="w-12 h-12 object-contain"
          onError={() => {
            console.warn(`Failed to load icon for ${connector.name}: ${connector.icon}`);
            setImageError(true);
          }}
        />
      </div>
    );
  }

  // Fallback to emoji if image fails or not available
  return (
    <span className="text-3xl">
      {fallbackEmojis[connector.id] || "👛"}
    </span>
  );
}

export function WalletSelectionModal({
  isOpen,
  onClose,
  onSelectWallet,
  connectors,
  isConnecting,
  connectingWallet,
}: WalletSelectionModalProps) {
  const handleWalletSelect = async (connector: WalletConnector) => {
    // If wallet is not available, redirect to installation page
    if (!connector.isAvailable()) {
      const installUrls: Record<string, string> = {
        metamask: 'https://metamask.io/download/',
        coinbase: 'https://www.coinbase.com/wallet',
        walletconnect: 'https://walletconnect.com/explorer',
      }

      const url = installUrls[connector.id]
      if (url) {
        window.open(url, '_blank')
      }
      return
    }

    try {
      await onSelectWallet(connector);
      // Modal closing is now handled in ConnectWalletButton
    } catch (error) {
      console.error("Wallet connection failed:", error);
      // Don't close modal on error so user can try again
    }
  };

  const getWalletBadge = (connector: WalletConnector) => {
    if (connector.id === 'walletconnect') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          <Smartphone className="w-3 h-3" />
          Mobile
        </span>
      )
    }
    if (connector.id === 'metamask' || connector.id === 'coinbase') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <Sparkles className="w-3 h-3" />
          Popular
        </span>
      )
    }
    return null
  };

  const getWalletDescription = (connector: WalletConnector) => {
    if (connector.id === "walletconnect") {
      return "Scan QR code with mobile wallet";
    }
    return connector.description;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Connect Wallet
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                  Choose your preferred wallet
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Secure connection to GNUS DAO governance platform
            </p>
          </div>

          <div className="space-y-3">
            {connectors.map((connector) => {
              const isAvailable = connector.isAvailable();
              const isCurrentlyConnecting =
                isConnecting && connectingWallet === connector.id;

              return (
                <button
                  key={connector.id}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all duration-300
                    ${isAvailable
                      ? 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20'
                      : 'border-gray-100 dark:border-gray-800 opacity-60'
                    }
                    ${isCurrentlyConnecting
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-500 dark:border-blue-500'
                      : 'bg-white dark:bg-gray-900 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20'
                    }
                    disabled:cursor-not-allowed disabled:hover:shadow-none
                    group
                  `}
                  onClick={() => handleWalletSelect(connector)}
                  disabled={!isAvailable || isConnecting}
                >
                  <div className="flex items-center gap-4 w-full">
                    {/* Wallet Icon */}
                    <div className={`
                      flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center
                      ${isAvailable
                        ? 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 group-hover:from-blue-200 group-hover:to-purple-200 dark:group-hover:from-blue-800/40 dark:group-hover:to-purple-800/40'
                        : 'bg-gray-100 dark:bg-gray-800'
                      }
                      transition-all duration-300 group-hover:scale-110
                    `}>
                      <WalletIcon connector={connector} />
                    </div>

                    {/* Wallet Info */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                          {connector.name}
                        </span>
                        {getWalletBadge(connector)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                        {getWalletDescription(connector)}
                      </p>
                      {!isAvailable && (
                        <div className="flex items-center gap-1 mt-1">
                          <Download className="w-3 h-3 text-orange-500" />
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            Not installed - Click to install
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Indicator */}
                    <div className="flex-shrink-0">
                      {isCurrentlyConnecting ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                      ) : isAvailable ? (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-blue-500 dark:group-hover:border-blue-500 transition-colors flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-blue-500 transition-colors"></div>
                        </div>
                      ) : (
                        <Download className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {connectors.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-full flex items-center justify-center">
                <Wallet className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                No Wallets Detected
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Install a Web3 wallet extension to connect to GNUS DAO and participate in governance.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="default"
                  onClick={() =>
                    window.open("https://metamask.io/download/", "_blank")
                  }
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install MetaMask
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open("https://www.coinbase.com/wallet", "_blank")
                  }
                >
                  <Download className="w-4 h-4 mr-2" />
                  Get Coinbase Wallet
                </Button>
              </div>
            </div>
          )}

          {isConnecting && (
            <div className="text-center py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="inline-flex items-center gap-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <span>Connecting to {connectingWallet}...</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
