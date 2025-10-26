/**
 * FileUpload Component Tests
 * Unit tests for the FileUpload component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUpload } from '../FileUpload'
import { ipfsService } from '@/lib/ipfs'
import { toast } from 'react-hot-toast'

// Mock dependencies
jest.mock('@/lib/ipfs', () => ({
  ipfsService: {
    uploadFile: jest.fn(),
    uploadFiles: jest.fn()
  },
  validateFile: jest.fn(),
  formatFileSize: jest.fn()
}))

jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

// Mock the validateFile and formatFileSize functions
const mockValidateFile = require('@/lib/ipfs').validateFile as jest.MockedFunction<any>
const mockFormatFileSize = require('@/lib/ipfs').formatFileSize as jest.MockedFunction<any>

describe('FileUpload Component', () => {
  const mockOnUploadComplete = jest.fn()
  const mockOnUploadStart = jest.fn()
  const mockOnUploadProgress = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockValidateFile.mockReturnValue({ valid: true })
    mockFormatFileSize.mockImplementation((size: number) => `${size} bytes`)
    
    // Mock successful upload
    ;(ipfsService.uploadFile as jest.Mock).mockResolvedValue({
      hash: 'QmTestHash123',
      name: 'test.txt',
      size: 1024,
      url: 'https://ipfs.io/ipfs/QmTestHash123'
    })
  })

  const defaultProps = {
    onUploadComplete: mockOnUploadComplete,
    onUploadStart: mockOnUploadStart,
    onUploadProgress: mockOnUploadProgress
  }

  it('should render upload area correctly', () => {
    render(<FileUpload {...defaultProps} />)
    
    expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
    expect(screen.getByText('Maximum 5 files, up to 10MB each')).toBeInTheDocument()
  })

  it('should handle single file mode', () => {
    render(<FileUpload {...defaultProps} multiple={false} />)
    
    expect(screen.getByText('Drop file here or click to browse')).toBeInTheDocument()
  })

  it('should handle custom max files limit', () => {
    render(<FileUpload {...defaultProps} maxFiles={3} />)
    
    expect(screen.getByText('Maximum 3 files, up to 10MB each')).toBeInTheDocument()
  })

  it('should handle file selection via input', async () => {
    const user = userEvent.setup()
    render(<FileUpload {...defaultProps} />)

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    expect(mockOnUploadStart).toHaveBeenCalled()

    await waitFor(() => {
      expect(ipfsService.uploadFile).toHaveBeenCalledWith(file, expect.any(Object))
    })
  })

  it('should handle drag and drop', async () => {
    render(<FileUpload {...defaultProps} />)
    
    const dropZone = screen.getByText('Drop files here or click to browse').closest('div')!
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    // Simulate drag over
    fireEvent.dragOver(dropZone)
    expect(dropZone).toHaveClass('border-blue-500')
    
    // Simulate drop
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file]
      }
    })
    
    expect(mockOnUploadStart).toHaveBeenCalled()
    
    await waitFor(() => {
      expect(ipfsService.uploadFile).toHaveBeenCalledWith(file, expect.any(Object))
    })
  })

  it('should validate files before upload', async () => {
    const user = userEvent.setup()
    mockValidateFile.mockReturnValue({ 
      valid: false, 
      error: 'File too large' 
    })
    
    render(<FileUpload {...defaultProps} />)
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    await user.upload(input, file)
    
    expect(toast.error).toHaveBeenCalledWith('test.txt: File too large')
    expect(ipfsService.uploadFile).not.toHaveBeenCalled()
  })

  it('should enforce max files limit', async () => {
    const user = userEvent.setup()
    render(<FileUpload {...defaultProps} maxFiles={2} />)
    
    const files = [
      new File(['content 1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content 2'], 'file2.txt', { type: 'text/plain' }),
      new File(['content 3'], 'file3.txt', { type: 'text/plain' })
    ]
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, files)
    
    expect(toast.error).toHaveBeenCalledWith('Maximum 2 files allowed')
    expect(ipfsService.uploadFile).not.toHaveBeenCalled()
  })

  it('should show upload progress', async () => {
    const user = userEvent.setup()
    
    // Mock upload with progress callback
    ;(ipfsService.uploadFile as jest.Mock).mockImplementation((file, options) => {
      // Simulate progress updates
      setTimeout(() => options.onProgress(50), 100)
      setTimeout(() => options.onProgress(100), 200)
      
      return Promise.resolve({
        hash: 'QmTestHash123',
        name: file.name,
        size: file.size,
        url: 'https://ipfs.io/ipfs/QmTestHash123'
      })
    })
    
    render(<FileUpload {...defaultProps} />)
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)
    
    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Uploading Files')).toBeInTheDocument()
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })
    
    // Should complete upload
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith([{
        hash: 'QmTestHash123',
        name: 'test.txt',
        size: file.size,
        url: 'https://ipfs.io/ipfs/QmTestHash123'
      }])
    })
  })

  it('should handle upload errors', async () => {
    const user = userEvent.setup()
    
    ;(ipfsService.uploadFile as jest.Mock).mockRejectedValue(new Error('Upload failed'))
    
    render(<FileUpload {...defaultProps} />)
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })

  it('should be disabled when disabled prop is true', () => {
    render(<FileUpload {...defaultProps} disabled={true} />)

    const dropZone = screen.getByText('Drop files here or click to browse').closest('div')!
    expect(dropZone).toHaveClass('opacity-50', 'cursor-not-allowed')

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeDisabled()
  })

  it('should allow clearing uploads', async () => {
    const user = userEvent.setup()
    render(<FileUpload {...defaultProps} />)
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)
    
    await waitFor(() => {
      expect(screen.getByText('Uploading Files')).toBeInTheDocument()
    })
    
    const clearButton = screen.getByText('Clear')
    await user.click(clearButton)
    
    expect(screen.queryByText('Uploading Files')).not.toBeInTheDocument()
  })

  it('should remove individual uploading files', async () => {
    const user = userEvent.setup()
    
    // Mock slow upload to keep file in uploading state
    ;(ipfsService.uploadFile as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 5000))
    )
    
    render(<FileUpload {...defaultProps} />)
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })
    
    // Find and click the remove button for this file
    const removeButtons = screen.getAllByRole('button')
    const removeButton = removeButtons.find(button => 
      button.querySelector('svg') && button.closest('.space-y-2')
    )
    
    if (removeButton) {
      await user.click(removeButton)
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
    }
  })
})
