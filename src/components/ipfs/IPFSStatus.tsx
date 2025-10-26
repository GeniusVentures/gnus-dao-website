'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, XCircle, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ipfsService, isIPFSConfigured } from '@/lib/ipfs'

interface IPFSStatusProps {
  showDetails?: boolean
  className?: string
}

interface ServiceStatus {
  configured: boolean
  initialized: boolean
  hasPinata: boolean
  hasIPFSClient: boolean
  error?: string
}

export function IPFSStatus({ showDetails = false, className = '' }: IPFSStatusProps) {
  const [status, setStatus] = useState<ServiceStatus>({
    configured: false,
    initialized: false,
    hasPinata: false,
    hasIPFSClient: false
  })
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(showDetails)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setLoading(true)
    
    try {
      const configured = isIPFSConfigured()
      const serviceStatus = ipfsService.getStatus()
      
      setStatus({
        configured,
        initialized: serviceStatus.initialized,
        hasPinata: serviceStatus.hasPinata,
        hasIPFSClient: serviceStatus.hasIPFSClient
      })
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to check status'
      }))
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = () => {
    if (loading) {
      return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
    }

    if (status.error) {
      return <XCircle className="w-4 h-4 text-red-500" />
    }

    if (status.configured && status.initialized && (status.hasPinata || status.hasIPFSClient)) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }

    if (status.configured) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }

    return <XCircle className="w-4 h-4 text-red-500" />
  }

  const getStatusText = () => {
    if (loading) return 'Checking IPFS status...'
    if (status.error) return 'IPFS Error'
    if (status.configured && status.initialized && (status.hasPinata || status.hasIPFSClient)) {
      return 'IPFS Ready'
    }
    if (status.configured) return 'IPFS Partially Configured'
    return 'IPFS Not Configured'
  }

  const getStatusColor = () => {
    if (loading || status.error) return 'text-gray-600'
    if (status.configured && status.initialized && (status.hasPinata || status.hasIPFSClient)) {
      return 'text-green-600'
    }
    if (status.configured) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={`bg-white border rounded-lg ${className}`}>
      {/* Status Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={checkStatus}
            disabled={loading}
            title="Refresh status"
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          {!showDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              title="Toggle details"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Detailed Status */}
      {(expanded || showDetails) && (
        <div className="border-t p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Configured:</span>
              <div className="flex items-center space-x-1">
                {status.configured ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
                <span className={status.configured ? 'text-green-600' : 'text-red-600'}>
                  {status.configured ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Initialized:</span>
              <div className="flex items-center space-x-1">
                {status.initialized ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
                <span className={status.initialized ? 'text-green-600' : 'text-red-600'}>
                  {status.initialized ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Pinata:</span>
              <div className="flex items-center space-x-1">
                {status.hasPinata ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-gray-400" />
                )}
                <span className={status.hasPinata ? 'text-green-600' : 'text-gray-500'}>
                  {status.hasPinata ? 'Available' : 'Not configured'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>IPFS Client:</span>
              <div className="flex items-center space-x-1">
                {status.hasIPFSClient ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-gray-400" />
                )}
                <span className={status.hasIPFSClient ? 'text-green-600' : 'text-gray-500'}>
                  {status.hasIPFSClient ? 'Available' : 'Not configured'}
                </span>
              </div>
            </div>
          </div>
          
          {status.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <strong>Error:</strong> {status.error}
            </div>
          )}
          
          {!status.configured && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
              <strong>Configuration needed:</strong> Please set up IPFS environment variables in your .env file.
            </div>
          )}
          
          {status.configured && !status.hasPinata && !status.hasIPFSClient && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
              <strong>No upload service:</strong> Configure either Pinata or IPFS node credentials.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
