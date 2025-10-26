'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { ExternalLink, Download, Eye, AlertCircle, Loader2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ipfsService, getIPFSUrl, isValidIPFSHash, formatFileSize } from '@/lib/ipfs'
import { toast } from 'react-hot-toast'

interface IPFSContentProps {
  hash: string
  name?: string
  size?: number
  type?: string
  showPreview?: boolean
  showDownload?: boolean
  showExternalLink?: boolean
  className?: string
}

interface ContentState {
  loading: boolean
  content: string | null
  error: string | null
  isImage: boolean
  isText: boolean
  isJSON: boolean
}

export function IPFSContent({
  hash,
  name,
  size,
  type,
  showPreview = true,
  showDownload = true,
  showExternalLink = true,
  className = ''
}: IPFSContentProps) {
  const [contentState, setContentState] = useState<ContentState>({
    loading: false,
    content: null,
    error: null,
    isImage: false,
    isText: false,
    isJSON: false
  })

  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (!isValidIPFSHash(hash)) {
      setContentState(prev => ({
        ...prev,
        error: 'Invalid IPFS hash'
      }))
    }
  }, [hash])

  const loadContent = async () => {
    if (!isValidIPFSHash(hash)) return

    setContentState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const content = await ipfsService.retrieveContent(hash, {
        timeout: 15000,
        fallbackToOtherGateways: true
      })

      const isImage = type?.startsWith('image/') || false
      const isText = type?.startsWith('text/') || type === 'application/json' || false
      const isJSON = type === 'application/json' || false

      setContentState({
        loading: false,
        content,
        error: null,
        isImage,
        isText,
        isJSON
      })
    } catch (error) {
      setContentState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load content'
      }))
    }
  }

  const handlePreview = () => {
    if (!contentState.content) {
      loadContent()
    }
    setPreviewOpen(true)
  }

  const handleDownload = () => {
    const url = getIPFSUrl(hash)
    const link = document.createElement('a')
    link.href = url
    link.download = name || `ipfs-${hash.slice(0, 8)}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExternalLink = () => {
    const url = getIPFSUrl(hash)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const copyHash = () => {
    navigator.clipboard.writeText(hash)
    toast.success('IPFS hash copied to clipboard')
  }

  const copyUrl = () => {
    const url = getIPFSUrl(hash)
    navigator.clipboard.writeText(url)
    toast.success('IPFS URL copied to clipboard')
  }

  const renderPreview = () => {
    if (contentState.loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading content...</span>
        </div>
      )
    }

    if (contentState.error) {
      return (
        <div className="flex items-center justify-center p-8 text-red-600">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>{contentState.error}</span>
        </div>
      )
    }

    if (!contentState.content) {
      return (
        <div className="flex items-center justify-center p-8 text-gray-500">
          <span>No content loaded</span>
        </div>
      )
    }

    if (contentState.isImage) {
      return (
        <div className="p-4">
          <div className="relative max-w-full">
            <Image
              src={getIPFSUrl(hash)}
              alt={name || 'IPFS content'}
              width={800}
              height={600}
              className="max-w-full h-auto rounded-lg"
              style={{ objectFit: 'contain' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
        </div>
      )
    }

    if (contentState.isJSON) {
      try {
        const jsonContent = JSON.parse(contentState.content)
        return (
          <div className="p-4">
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(jsonContent, null, 2)}
            </pre>
          </div>
        )
      } catch {
        // Fall back to text display
      }
    }

    if (contentState.isText) {
      return (
        <div className="p-4">
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
            {contentState.content}
          </pre>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <span>Preview not available for this file type</span>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">
              {name || `IPFS Content`}
            </h3>
            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
              <span className="font-mono">{hash.slice(0, 12)}...{hash.slice(-8)}</span>
              {size && <span>{formatFileSize(size)}</span>}
              {type && <span>{type}</span>}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyHash}
              title="Copy hash"
            >
              <Copy className="w-4 h-4" />
            </Button>
            
            {showPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                title="Preview content"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            
            {showDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            
            {showExternalLink && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExternalLink}
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {previewOpen && (
        <div className="border-t">
          {renderPreview()}
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          <button
            onClick={copyUrl}
            className="text-blue-600 hover:text-blue-800"
          >
            Copy URL
          </button>
          <a
            href={getIPFSUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            View on IPFS
          </a>
        </div>
        
        <div className="text-gray-500">
          IPFS Content
        </div>
      </div>
    </div>
  )
}
