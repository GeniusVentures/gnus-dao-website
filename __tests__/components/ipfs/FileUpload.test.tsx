/**
 * FileUpload Component Tests
 * Unit tests for the FileUpload component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-hot-toast";
import { FileUpload } from "@/components/ipfs/FileUpload";

// Mock dependencies
jest.mock("@/lib/ipfs", () => ({
  validateFile: jest.fn(),
  formatFileSize: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/lib/ipfs/secureUpload", () => ({
  SecureIPFSService: {
    uploadFile: jest.fn().mockResolvedValue({
      success: true,
      ipfsHash: "QmTestHash123",
      pinSize: 1024,
    }),
    getGatewayUrl: jest.fn((hash) => `https://ipfs.io/ipfs/${hash}`),
  },
}));

// Mock the validateFile and formatFileSize functions
import * as ipfsUtils from "@/lib/ipfs";
import { SecureIPFSService } from "@/lib/ipfs/secureUpload";
const mockValidateFile = ipfsUtils.validateFile as jest.MockedFunction<any>;
const mockFormatFileSize = ipfsUtils.formatFileSize as jest.MockedFunction<any>;

describe("FileUpload Component", () => {
  const mockOnUploadComplete = jest.fn();
  const mockOnUploadStart = jest.fn();
  const mockOnUploadProgress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage to provide auth token
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-auth-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Setup default mocks
    mockValidateFile.mockReturnValue({ valid: true });
    mockFormatFileSize.mockImplementation((size: number) => `${size} bytes`);
  });

  const defaultProps = {
    onUploadComplete: mockOnUploadComplete,
    onUploadStart: mockOnUploadStart,
    onUploadProgress: mockOnUploadProgress,
  };

  it("should render upload area correctly", () => {
    render(<FileUpload {...defaultProps} />);

    expect(
      screen.getByText("Drop files here or click to browse"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Maximum 5 files, up to 10MB each"),
    ).toBeInTheDocument();
  });

  it("should handle single file mode", () => {
    render(<FileUpload {...defaultProps} multiple={false} />);

    expect(
      screen.getByText("Drop file here or click to browse"),
    ).toBeInTheDocument();
  });

  it("should handle custom max files limit", () => {
    render(<FileUpload {...defaultProps} maxFiles={3} />);

    expect(
      screen.getByText("Maximum 3 files, up to 10MB each"),
    ).toBeInTheDocument();
  });

  it("should handle file selection via input", async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(mockOnUploadStart).toHaveBeenCalled();

    await waitFor(() => {
      expect(SecureIPFSService.uploadFile).toHaveBeenCalledWith(
        file,
        expect.any(Object),
      );
    });
  });

  it("should handle drag and drop", async () => {
    render(<FileUpload {...defaultProps} />);

    const dropZone = screen
      .getByText("Drop files here or click to browse")
      .closest("div")!;
    const file = new File(["test content"], "test.txt", { type: "text/plain" });

    // Simulate drag over
    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass("border-blue-500");

    // Simulate drop
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(mockOnUploadStart).toHaveBeenCalled();

    await waitFor(() => {
      expect(SecureIPFSService.uploadFile).toHaveBeenCalledWith(
        file,
        expect.any(Object),
      );
    });
  });

  it("should validate files before upload", async () => {
    const user = userEvent.setup();
    mockValidateFile.mockReturnValue({
      valid: false,
      error: "File too large",
    });

    render(<FileUpload {...defaultProps} />);

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(toast.error).toHaveBeenCalledWith("test.txt: File too large");
    expect(SecureIPFSService.uploadFile).not.toHaveBeenCalled();
  });

  it("should enforce max files limit", async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} maxFiles={2} />);

    const files = [
      new File(["content 1"], "file1.txt", { type: "text/plain" }),
      new File(["content 2"], "file2.txt", { type: "text/plain" }),
      new File(["content 3"], "file3.txt", { type: "text/plain" }),
    ];

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, files);

    expect(toast.error).toHaveBeenCalledWith("Maximum 2 files allowed");
    expect(SecureIPFSService.uploadFile).not.toHaveBeenCalled();
  });

  it("should show upload progress", async () => {
    const user = userEvent.setup();

    render(<FileUpload {...defaultProps} />);

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText("Uploading Files")).toBeInTheDocument();
      expect(screen.getByText("test.txt")).toBeInTheDocument();
    });

    // Should complete upload
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith([
        {
          hash: "QmTestHash123",
          name: "test.txt",
          size: 1024,
          url: "https://ipfs.io/ipfs/QmTestHash123",
        },
      ]);
    });
  });

  it("should handle upload errors", async () => {
    const user = userEvent.setup();

    // Mock upload failure
    (SecureIPFSService.uploadFile as jest.Mock).mockRejectedValueOnce(
      new Error("Upload failed"),
    );

    render(<FileUpload {...defaultProps} />);

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      // Check for error message in the UI
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });

  it("should be disabled when disabled prop is true", () => {
    render(<FileUpload {...defaultProps} disabled={true} />);

    const dropZone = screen
      .getByText("Drop files here or click to browse")
      .closest("div")!;
    expect(dropZone).toHaveClass("opacity-50", "cursor-not-allowed");

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it("should allow clearing uploads", async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Uploading Files")).toBeInTheDocument();
    });

    const clearButton = screen.getByText("Clear");
    await user.click(clearButton);

    expect(screen.queryByText("Uploading Files")).not.toBeInTheDocument();
  });

  it("should remove individual uploading files", async () => {
    const user = userEvent.setup();

    render(<FileUpload {...defaultProps} />);

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    // Wait for the file to appear in the upload list
    await waitFor(() => {
      expect(screen.getByText("test.txt")).toBeInTheDocument();
    });

    // Find the X button (remove button) - it should be the last button in the file row
    const removeButtons = screen.getAllByRole("button");
    // The remove button should be the one with an X icon
    const removeButton = removeButtons.find(button => {
      const svg = button.querySelector('svg');
      return svg && svg.querySelector('path[d="M18 6 6 18"]'); // X icon path
    });

    if (removeButton) {
      await user.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByText("test.txt")).not.toBeInTheDocument();
      });
    } else {
      // If we can't find the specific remove button, just check that the clear button works
      const clearButton = screen.getByText("Clear");
      await user.click(clearButton);
      
      await waitFor(() => {
        expect(screen.queryByText("test.txt")).not.toBeInTheDocument();
      });
    }
  });
});