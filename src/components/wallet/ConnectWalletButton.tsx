'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Wallet, ArrowRight } from 'lucide-react'
import { useWeb3Store } from '@/lib/web3/reduxProvider'
import { walletConnectors } from '@/lib/web3/connectors'
import { LazyWalletSelectionModal } from './LazyWalletSelectionModal'
import { WalletConfigError } from '@/components/error/WalletConfigError'
import { WalletConnector } from '@/lib/web3/types'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'

interface ConnectWalletButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
  showIcon?: boolean
}

export function ConnectWalletButton({
  variant = 'default',
  size = 'md',
  className,
  children,
  showIcon = true
}: ConnectWalletButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [connectingWallet, setConnectingWallet] = useState<string>()
  const [configError, setConfigError] = useState<string | null>(null)
  const { wallet, connect } = useWeb3Store()
  // Show all connectors, not just available ones - let users install if needed
  const connectors = walletConnectors
  const toast = useToast()

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setConnectingWallet(undefined)
  }

  const handleSelectWallet = async (connector: WalletConnector) => {
    setConnectingWallet(connector.id)
    setConfigError(null)

    try {
      // For WalletConnect, close modal BEFORE connecting to allow Reown AppKit modal to show
      if (connector.id === 'walletconnect') {
        // Close immediately and add small delay to ensure modal is fully closed
        handleCloseModal()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      await connect(connector.id)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Connected to ${connector.name}`)
      }

      // Show success toast for all connections
      toast.success(
        'Wallet Connected!',
        `Successfully connected to ${connector.name}`,
        6000
      )

      // Close modal for non-WalletConnect wallets (WalletConnect already closed)
      if (connector.id !== 'walletconnect') {
        handleCloseModal()
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Wallet connection failed:', error)
      }
      const message = error instanceof Error ? error.message : 'Failed to connect wallet'

      // Check if it's a configuration error
      if (message.includes('WalletConnect') || message.includes('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')) {
        setConfigError(message)
        handleCloseModal()
      } else {
        // Show error toast for user feedback
        toast.error(
          'Connection Failed',
          message,
          5000
        )
        // Only log non-config errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error(message)
        }
      }
      setConnectingWallet(undefined)
    }
  }

  const handleRetryConnection = () => {
    setConfigError(null)
    setIsModalOpen(true)
  }

  // Don't show if already connected
  if (wallet.isConnected) {
    return null
  }

  // Show configuration error if present
  if (configError) {
    return (
      <WalletConfigError
        error={configError}
        onRetry={handleRetryConnection}
      />
    )
  }

  return (
    <>
      <Button
        variant={variant}
        size={size === 'md' ? 'default' : size}
        onClick={handleOpenModal}
        disabled={wallet.isConnecting}
        className={`flex items-center gap-2 ${className || ''}`}
      >
        {showIcon && <Wallet className="h-4 w-4" />}
        {children || (wallet.isConnecting ? 'Connecting...' : 'Connect Wallet')}
        {!wallet.isConnecting && <ArrowRight className="h-4 w-4" />}
      </Button>

      <LazyWalletSelectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSelectWallet={handleSelectWallet}
        connectors={connectors}
        isConnecting={wallet.isConnecting}
        connectingWallet={connectingWallet}
      />

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </>
  )
}

interface WalletStatusProps {
  showBalance?: boolean
  showNetwork?: boolean
  compact?: boolean
  className?: string
}

export function WalletStatus({
  showBalance = true,
  showNetwork = true,
  compact = false,
  className
}: WalletStatusProps) {
  const { wallet, currentNetwork, disconnect } = useWeb3Store()

  if (!wallet.isConnected || !wallet.address) {
    return <ConnectWalletButton variant="outline" size="sm" />
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (balance: string | undefined) => {
    if (!balance) return '0.00'
    const num = parseFloat(balance)
    return num.toFixed(4)
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      if (process.env.NODE_ENV === 'development') {
        console.log('Wallet disconnected')
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Disconnect failed:', error)
        console.error('Failed to disconnect wallet')
      }
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {wallet.ensName || formatAddress(wallet.address)}
            </span>
            {showNetwork && currentNetwork && !compact && (
              <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-800 px-2 py-1 rounded">
                {currentNetwork.name}
              </span>
            )}
          </div>
          {showBalance && wallet.balance && !compact && (
            <span className="text-xs text-green-600 dark:text-green-400">
              {formatBalance(wallet.balance)} ETH
            </span>
          )}
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleDisconnect}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
      >
        Disconnect
      </Button>
    </div>
  )
}
