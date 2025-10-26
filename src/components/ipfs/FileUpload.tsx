'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, File, Image, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SecureIPFSService } from '@/lib/ipfs/secureUpload'
import { validateFile, formatFileSize, type IPFSUploadResult } from '@/lib/ipfs'
import { toast } from 'react-hot-toast'

interface FileUploadProps {
  onUploadComplete: (results: IPFSUploadResult[]) => void
  onUploadStart?: () => void
  onUploadProgress?: (progress: number) => void
  multiple?: boolean
  accept?: string
  maxFiles?: number
  disabled?: boolean
  className?: string
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'complete' | 'error'
  result?: IPFSUploadResult
  error?: string
}

export function FileUpload({
  onUploadComplete,
  onUploadStart,
  onUploadProgress,
  multiple = true,
  accept,
  maxFiles = 5,
  disabled = false,
  className = ''
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    
    // Validate file count
    if (fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate each file
    const validFiles: File[] = []
    for (const file of fileArray) {
      const validation = validateFile(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        toast.error(`${file.name}: ${validation.error}`)
      }
    }

    if (validFiles.length === 0) return

    uploadFiles(validFiles)
  }

  const uploadFiles = async (files: File[]) => {
    onUploadStart?.()
    
    // Initialize uploading files state
    const initialUploadingFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }))
    
    setUploadingFiles(initialUploadingFiles)

    const results: IPFSUploadResult[] = []
    
    try {
      // Upload files sequentially to avoid overwhelming the service
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file) continue

        try {
          // Upload using secure IPFS service
          const uploadResult = await SecureIPFSService.uploadFile(file, {
            name: file.name,
            keyvalues: {
              uploadedAt: new Date().toISOString(),
              size: file.size.toString(),
              type: file.type
            }
          })

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Upload failed')
          }

          // Convert to IPFSUploadResult format
          const result: IPFSUploadResult = {
            hash: uploadResult.ipfsHash || '',
            name: file.name,
            size: uploadResult.pinSize || file.size,
            url: SecureIPFSService.getGatewayUrl(uploadResult.ipfsHash || '')
          }

          results.push(result)

          // Update file status to complete
          setUploadingFiles(prev => prev.map((uf, index) =>
            index === i ? { ...uf, status: 'complete', result, progress: 100 } : uf
          ))
          
        } catch (error) {
          // Update file status to error
          setUploadingFiles(prev => prev.map((uf, index) => 
            index === i ? { 
              ...uf, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            } : uf
          ))
        }
      }

      if (results.length > 0) {
        onUploadComplete(results)
        toast.success(`${results.length} file(s) uploaded successfully`)
      }
      
    } catch (error) {
      toast.error('Upload process failed')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    // Reset input value to allow re-uploading the same file
    e.target.value = ''
  }

  const clearUploads = () => {
    setUploadingFiles([])
  }

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" aria-label="Image file icon" />
    } else if (file.type.includes('text') || file.type.includes('document')) {
      return <FileText className="w-4 h-4" aria-label="Text file icon" />
    }
    return <File className="w-4 h-4" aria-label="File icon" />
  }

  const isUploading = uploadingFiles.some(uf => uf.status === 'uploading')

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-1">
          {multiple ? 'Drop files here or click to browse' : 'Drop file here or click to browse'}
        </p>
        <p className="text-xs text-gray-500">
          Maximum {maxFiles} files, up to 10MB each
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Uploading Files</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearUploads}
              disabled={isUploading}
            >
              Clear
            </Button>
          </div>
          
          {uploadingFiles.map((uploadingFile, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                {uploadingFile.status === 'complete' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {uploadingFile.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                {uploadingFile.status === 'uploading' && getFileIcon(uploadingFile.file)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadingFile.file.size)}
                  {uploadingFile.result && (
                    <span className="ml-2 text-blue-600">
                      IPFS: {uploadingFile.result.hash.slice(0, 8)}...
                    </span>
                  )}
                  {uploadingFile.error && (
                    <span className="ml-2 text-red-600">{uploadingFile.error}</span>
                  )}
                </p>
                
                {uploadingFile.status === 'uploading' && (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeUploadingFile(index)}
                disabled={uploadingFile.status === 'uploading'}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
