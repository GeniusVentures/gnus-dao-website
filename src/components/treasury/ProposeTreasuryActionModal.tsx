'use client'

import React, { useState } from 'react'
import { X, Send, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { gnusDaoService } from '@/lib/contracts/gnusDaoService'
import { useWeb3Store } from '@/lib/web3/reduxProvider'
import { toast } from 'react-hot-toast'
import { ethers } from 'ethers'

interface ProposeTreasuryActionModalProps {
  onClose: () => void
  onActionProposed: () => void
}

export function ProposeTreasuryActionModal({
  onClose,
  onActionProposed,
}: ProposeTreasuryActionModalProps) {
  const { wallet } = useWeb3Store()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    description: '',
    token: '0x0000000000000000000000000000000000000000', // Native token by default
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!wallet.address) {
      toast.error('Please connect your wallet')
      return
    }

    if (!formData.recipient || !formData.amount || !formData.description) {
      toast.error('Please fill in all fields')
      return
    }

    // Validate recipient address
    if (!ethers.isAddress(formData.recipient)) {
      toast.error('Invalid recipient address')
      return
    }

    // Validate amount
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount')
      return
    }

    setLoading(true)
    try {
      // Convert amount to wei
      const amountWei = ethers.parseEther(formData.amount)

      // For native token transfers, we use a simple transfer calldata
      // For ERC20 transfers, we would encode the transfer function call
      const calldata = '0x' // Empty calldata for native transfers

      const tx = await gnusDaoService.proposeTreasuryAction(
        formData.recipient,
        amountWei,
        calldata,
        formData.description
      )

      toast.success('Treasury action proposed! Waiting for confirmation...')
      await tx.wait()
      toast.success('Treasury action proposal confirmed!')

      onActionProposed()
      onClose()
    } catch (error) {
      console.error('Failed to propose treasury action:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to propose treasury action'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Send className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Propose Treasury Action
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create a proposal to transfer treasury funds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warning Banner */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Important</p>
                <p>
                  Treasury actions require DAO approval. Your proposal will need to be voted on
                  and approved before execution.
                </p>
              </div>
            </div>
          </div>

          {/* Recipient Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipient Address *
            </label>
            <input
              type="text"
              value={formData.recipient}
              onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
              placeholder="0x..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The Ethereum address that will receive the funds
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount (ETH) *
            </label>
            <input
              type="number"
              step="0.000001"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.0"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Amount of ETH to transfer from the treasury
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the purpose of this treasury action..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Explain why this transfer is needed and how it benefits the DAO
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Proposing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Propose Action
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

