'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ChevronDown, Check, AlertCircle, Zap } from 'lucide-react'
import { useWeb3Store } from '@/lib/web3/reduxProvider'
import { getAllNetworks, getNetworkConfig } from '@/lib/config/networks'
import { NetworkConfig } from '@/lib/config/networks'

interface NetworkSelectorProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showIcon?: boolean
}

export function NetworkSelector({
  variant = 'outline',
  size = 'sm',
  className,
  showIcon = true
}: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const { wallet, currentNetwork, switchNetwork } = useWeb3Store()
  const allNetworks = getAllNetworks()

  const handleNetworkSwitch = async (network: NetworkConfig) => {
    if (!wallet.isConnected || network.id === currentNetwork?.id) {
      setIsOpen(false)
      return
    }

    setIsSwitching(true)
    try {
      await switchNetwork(network.id)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to switch network:', error)
    } finally {
      setIsSwitching(false)
    }
  }

  const getNetworkIcon = (network: NetworkConfig) => {
    if (network.gasless) {
      return <Zap className="h-4 w-4 text-green-500" />
    }
    return <div className="h-4 w-4 rounded-full bg-blue-500" />
  }

  const getNetworkStatus = (network: NetworkConfig) => {
    if (network.gasless) {
      return <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Free</span>
    }
    if (network.testnet) {
      return <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Testnet</span>
    }
    return null
  }

  if (!wallet.isConnected) {
    return null
  }

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size === 'md' ? 'default' : size}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`flex items-center gap-2 ${className || ''}`}
      >
        {showIcon && currentNetwork && getNetworkIcon(currentNetwork)}
        <span className="text-sm">
          {isSwitching ? 'Switching...' : currentNetwork?.displayName || 'Unknown Network'}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full mt-2 right-0 z-50 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Select Network
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose a blockchain network to connect to
              </p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {allNetworks.map((network) => {
                const isCurrentNetwork = network.id === currentNetwork?.id
                const isUnsupported = !wallet.isConnected
                
                return (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkSwitch(network)}
                    disabled={isUnsupported || isSwitching}
                    className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCurrentNetwork ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getNetworkIcon(network)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {network.displayName}
                            </span>
                            {getNetworkStatus(network)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {network.nativeCurrency.symbol} • {network.features?.join(', ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isCurrentNetwork && (
                          <Check className="h-4 w-4 text-blue-500" />
                        )}
                        {network.testnet && (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <Zap className="h-3 w-3 inline mr-1 text-green-500" />
                Networks marked "Free" have zero gas fees
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface NetworkStatusProps {
  compact?: boolean
  className?: string
}

export function NetworkStatus({ compact = false, className }: NetworkStatusProps) {
  const { wallet, currentNetwork } = useWeb3Store()

  if (!wallet.isConnected || !currentNetwork) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        {currentNetwork.gasless ? (
          <Zap className="h-3 w-3 text-green-500" />
        ) : (
          <div className="h-2 w-2 bg-blue-500 rounded-full" />
        )}
        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
          {compact ? currentNetwork.name : currentNetwork.displayName}
        </span>
        {currentNetwork.gasless && !compact && (
          <span className="text-xs text-green-600 bg-green-100 px-1 py-0.5 rounded">
            Free
          </span>
        )}
      </div>
    </div>
  )
}
