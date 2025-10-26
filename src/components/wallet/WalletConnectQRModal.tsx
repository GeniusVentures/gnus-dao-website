'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Smartphone, QrCode, Shield, Sparkles } from 'lucide-react'

interface WalletConnectQRModalProps {
  isOpen: boolean
  onClose: () => void
  qrCodeDataUrl: string
  uri: string
}

export function WalletConnectQRModal({ isOpen, onClose, qrCodeDataUrl, uri }: WalletConnectQRModalProps) {
  const [copied, setCopied] = useState(false)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleCopyURI = async () => {
    try {
      await navigator.clipboard.writeText(uri)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URI:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/90 to-black/90 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950 rounded-3xl shadow-2xl border border-blue-200 dark:border-blue-800 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="walletconnect-modal-title"
      >
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2
                  id="walletconnect-modal-title"
                  className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent"
                >
                  Scan to Connect
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Powered by WalletConnect
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all hover:rotate-90 duration-300"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-2 space-y-6">
          {/* Instructions */}
          <div className="text-center space-y-2 bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4 border border-blue-100 dark:border-blue-900">
            <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
              <Smartphone className="w-5 h-5" />
              <p className="text-sm font-semibold">
                Open your mobile wallet
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Scan with MetaMask, Trust Wallet, Rainbow, or 300+ supported wallets
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            {qrCodeDataUrl ? (
              <div className="relative group">
                {/* Animated border */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl opacity-75 group-hover:opacity-100 blur transition duration-1000 group-hover:duration-200 animate-pulse-slow"></div>

                {/* QR Code container */}
                <div className="relative p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl">
                  <img
                    src={qrCodeDataUrl}
                    alt="WalletConnect QR Code"
                    className="w-72 h-72 rounded-2xl"
                    data-testid="walletconnect-qr-code"
                    onError={(e) => {
                      console.error('QR code image failed to load');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {/* Corner decorations */}
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-blue-500 rounded-br-lg"></div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-300 dark:border-gray-700">
                <div className="w-72 h-72 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Generating QR Code...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      This should only take a moment
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Copy URI Button */}
          <div className="space-y-3">
            <button
              onClick={handleCopyURI}
              className="w-full px-6 py-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? '✓ Copied to Clipboard!' : 'Copy Connection Link'}
            </button>
            <p className="text-xs text-center text-gray-600 dark:text-gray-400">
              Can't scan? Copy the link and paste it in your wallet app
            </p>
          </div>

          {/* Wallet Recommendations */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Popular Mobile Wallets
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'MetaMask', icon: '/wallets/metamask.svg', color: 'from-orange-400 to-orange-600' },
                { name: 'Trust', icon: '/wallets/generic.svg', color: 'from-blue-400 to-blue-600' },
                { name: 'Rainbow', icon: '/wallets/generic.svg', color: 'from-purple-400 to-pink-600' },
                { name: 'Coinbase', icon: '/wallets/coinbase.svg', color: 'from-blue-500 to-blue-700' }
              ].map((wallet) => (
                <div
                  key={wallet.name}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 transition-all duration-300 cursor-pointer group border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${wallet.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <img
                      src={wallet.icon}
                      alt={wallet.name}
                      className="w-7 h-7"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {wallet.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
                  End-to-End Encrypted
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Your connection is fully encrypted. GNUS DAO never has access to your private keys or funds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
