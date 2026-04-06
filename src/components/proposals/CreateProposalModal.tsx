"use client";

import { useSiweProtectedAction } from "@/components/auth/SiweGuard";
import { useSiwe } from "@/lib/auth/useSiwe";
import { FileUpload } from "@/components/ipfs/FileUpload";
import { Button } from "@/components/ui/Button";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { SecureIPFSService } from "@/lib/ipfs/secureUpload";
import type { IPFSUploadResult, ProposalMetadata } from "@/lib/ipfs/types";
import {
  validateProposalTitle,
  validateProposalDescription,
  validateEthereumAddress,
  validateIPFSHash,
} from "@/lib/utils/validation";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { checkRateLimit } from "@/lib/utils/clientRateLimiter";
import { useUserActionTracking } from "@/hooks/useUserActionTracking";
import {
  AlertTriangle,
  Code,
  DollarSign,
  FileText,
  Info,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface CreateProposalModalProps {
  onClose: () => void;
  onProposalCreated: () => void;
}

interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

export function CreateProposalModal({
  onClose,
  onProposalCreated,
}: CreateProposalModalProps) {
  const { wallet, provider, signer } = useWeb3Store();
  const { executeProtected, isAuthenticated } = useSiweProtectedAction();
  const { signIn } = useSiwe();
  const { 
    trackModalAction, 
    trackFormSubmit, 
    trackFileUpload, 
    trackProposalAction,
    trackAction 
  } = useUserActionTracking();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<
    "basic" | "actions" | "attachments" | "review"
  >("basic");

  // Track modal opening
  useEffect(() => {
    trackModalAction('open', 'CreateProposalModal');
  }, [trackModalAction]);

  // Upfront: prompt for wallet connection and SIWE auth when modal opens
  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      toast.error("Please connect your wallet first to create a proposal");
      onClose();
      return;
    }

    // Auto-prompt SIWE sign-in if wallet is connected but not authenticated
    if (!isAuthenticated && signer) {
      signIn().catch((error) => {
        console.error("Auto SIWE sign-in failed:", error);
        toast.error("Authentication is required to create proposals. Please sign in with Ethereum.");
      });
    }
  }, []); // Run once on mount

  // Basic proposal info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<
    "treasury" | "protocol" | "governance" | "community"
  >("treasury");
  const [discussionUrl] = useState("");
  const [tags] = useState<string[]>([]);

  // Voting configuration
  const [votingPeriodDays, setVotingPeriodDays] = useState(7);
  const [executionDelayDays, setExecutionDelayDays] = useState(3);

  // IPFS attachments
  const [attachments, setAttachments] = useState<IPFSUploadResult[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  // Proposal actions
  const [actions, setActions] = useState<ProposalAction[]>([
    { target: "", value: "0", signature: "", calldata: "0x" },
  ]);

  const categories = [
    {
      id: "treasury" as const,
      name: "Treasury Management",
      description: "Proposals for managing DAO treasury funds",
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      id: "protocol" as const,
      name: "Protocol Upgrade",
      description: "Technical changes to smart contracts",
      icon: <Code className="h-5 w-5" />,
    },
    {
      id: "governance" as const,
      name: "Governance Change",
      description: "Changes to voting rules and parameters",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      id: "community" as const,
      name: "Community Initiative",
      description: "Community programs and initiatives",
      icon: <Users className="h-5 w-5" />,
    },
  ];

  const addAction = () => {
    setActions([
      ...actions,
      { target: "", value: "0", signature: "", calldata: "0x" },
    ]);
    
    trackAction('click', {
      component: 'CreateProposalModal',
      action: 'add_proposal_action',
      actionCount: actions.length + 1,
    });
  };

  const removeAction = (index: number) => {
    if (actions.length > 1) {
      setActions(actions.filter((_, i) => i !== index));
      
      trackAction('click', {
        component: 'CreateProposalModal',
        action: 'remove_proposal_action',
        actionIndex: index,
        remainingActions: actions.length - 1,
      });
    }
  };

  const updateAction = (
    index: number,
    field: keyof ProposalAction,
    value: string,
  ) => {
    const newActions = [...actions];
    newActions[index] = {
      ...newActions[index],
      [field]: value,
    } as ProposalAction;
    setActions(newActions);
  };

  // Tag management - commented out as not currently used
  // const addTag = () => {
  //   if (tagInput.trim() && !tags.includes(tagInput.trim())) {
  //     setTags([...tags, tagInput.trim()]);
  //     setTagInput("");
  //   }
  // };

  // const removeTag = (tagToRemove: string) => {
  //   setTags(tags.filter((tag) => tag !== tagToRemove));
  // };

  // File upload handling - commented out as not currently used
  // const handleFileUpload = async (
  //   event: React.ChangeEvent<HTMLInputElement>,
  // ) => {
  //   const files = event.target.files;
  //   if (!files || files.length === 0) return;
  //
  //   setUploading(true);
  //   setUploadProgress(0);
  //
  //   try {
  //     const uploadPromises = Array.from(files).map(async (file) => {
  //       const result = await SecureIPFSService.uploadProposalAttachment(file);
  //       if (!result.success) {
  //         throw new Error(result.error || "Upload failed");
  //       }
  //       // Convert to IPFSUploadResult format
  //       return {
  //         hash: result.ipfsHash || "",
  //         name: file.name,
  //         size: result.pinSize || file.size,
  //         url: SecureIPFSService.getGatewayUrl(result.ipfsHash || ""),
  //       };
  //     });
  //
  //     const results = await Promise.all(uploadPromises);
  //     setAttachments([...attachments, ...results]);
  //     toast.success(`${results.length} file(s) uploaded successfully`);
  //   } catch (error) {
  //     console.error("File upload failed:", error);
  //     toast.error(
  //       error instanceof Error ? error.message : "Failed to upload files",
  //     );
  //   } finally {
  //     setUploading(false);
  //     setUploadProgress(0);
  //     // Reset file input
  //     event.target.value = "";
  //   }
  // };

  const removeAttachment = (index: number) => {
    const attachment = attachments[index];
    setAttachments(attachments.filter((_, i) => i !== index));
    
    trackAction('click', {
      component: 'CreateProposalModal',
      action: 'remove_attachment',
      fileName: attachment?.name,
      attachmentIndex: index,
    });
  };

  const handleSubmit = async () => {
    // Track proposal submission attempt
    trackProposalAction('create', undefined, {
      category,
      step,
      titleLength: title.length,
      descriptionLength: description.length,
      actionCount: actions.filter(a => a.target || a.signature).length,
      attachmentCount: attachments.length,
      votingPeriodDays,
      executionDelayDays,
    });

    // Validate title
    const titleValidation = validateProposalTitle(title);
    if (!titleValidation.isValid) {
      toast.error(titleValidation.error || "Invalid proposal title");
      trackAction('form_submit', {
        component: 'CreateProposalModal',
        result: 'validation_error',
        error: 'invalid_title',
      });
      return;
    }

    // Validate description
    const descriptionValidation = validateProposalDescription(description);
    if (!descriptionValidation.isValid) {
      toast.error(descriptionValidation.error || "Invalid proposal description");
      return;
    }

    // Check wallet connection
    if (!wallet.isConnected || !wallet.address) {
      toast.error("Please connect your wallet to create a proposal");
      return;
    }

    // Validate wallet address
    const addressValidation = validateEthereumAddress(wallet.address);
    if (!addressValidation.isValid) {
      toast.error("Invalid wallet address");
      return;
    }

    // Check rate limit before submitting
    const rateLimitCheck = checkRateLimit('PROPOSAL_CREATE');
    if (!rateLimitCheck.allowed) {
      toast.error(
        `Too many proposals. Please wait ${Math.ceil(rateLimitCheck.resetIn / 60)} minutes before creating another proposal.`
      );
      return;
    }

    // Validate actions - allow proposals without actions (governance proposals)
    const validActions = actions.filter(
      (action) => action.target.trim() !== "" || action.signature.trim() !== "",
    );

    // Validate action target addresses
    for (const action of validActions) {
      if (action.target.trim()) {
        const targetValidation = validateEthereumAddress(action.target);
        if (!targetValidation.isValid) {
          toast.error(`Invalid target address: ${action.target}`);
          return;
        }
      }
    }

    // Only require actions for certain categories
    if (category === "treasury" && validActions.length === 0) {
      toast.error("Treasury proposals require at least one action");
      return;
    }

    try {
      // Execute directly, bypassing SIWE protection for on-chain TX
      await submitProposal(titleValidation.sanitized!, descriptionValidation.sanitized!, validActions);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit proposal",
      );
    }
  };

  const submitProposal = async (sanitizedTitle: string, sanitizedDescription: string, validActions: ProposalAction[]) => {
    try {
      setLoading(true);

      // Ensure DAO service is initialized with wallet provider and signer
      try {
        if (!provider || !signer) {
          throw new Error("Wallet provider or signer not available");
        }

        const network = await provider.getNetwork();
        const initialized = await gnusDaoService.initialize(
          provider,
          signer,
          Number(network.chainId),
        );

        if (!initialized) {
          throw new Error(
            "Failed to initialize DAO service - contract not available on this network",
          );
        }
      } catch (initError) {
        console.error("Failed to initialize DAO service:", initError);
        toast.error(
          `Failed to initialize blockchain connection: ${initError instanceof Error ? initError.message : "Unknown error"}`,
        );
        return;
      }

      // Create proposal metadata for IPFS
      const proposalMetadata: ProposalMetadata = {
        title: sanitizedTitle,
        description: sanitizedDescription,
        category,
        author: wallet.address || "",
        created: Date.now(),
        version: "1.0.0",
        attachments,
        tags,
        discussionUrl: discussionUrl || undefined,
        votingPeriod: {
          start: Date.now(),
          end: Date.now() + votingPeriodDays * 24 * 60 * 60 * 1000,
        },
        executionDelay: executionDelayDays,
      };

      // Upload metadata to IPFS using secure service
      let metadataHash = "";
      try {
        const metadataResult =
          await SecureIPFSService.uploadProposalMetadata(proposalMetadata);

        if (!metadataResult.success) {
          throw new Error(metadataResult.error || "Metadata upload failed");
        }

        metadataHash = metadataResult.ipfsHash || "";

        // Validate IPFS hash
        const hashValidation = validateIPFSHash(metadataHash);
        if (!hashValidation.isValid) {
          console.warn("Invalid IPFS hash returned from upload:", metadataHash);
          metadataHash = ""; // Clear invalid hash
        }

        toast.success("Proposal metadata uploaded to IPFS");
      } catch (error) {
        console.error("Failed to upload metadata to IPFS:", error);
        toast.error(
          `IPFS upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        // Continue without IPFS metadata if upload fails
      }

      // Use the correct contract function signature
      const ipfsHashForContract = metadataHash || `QmPlaceholder${Date.now()}`;

      try {
        // Extract actions
        const targets = validActions.map(a => a.target);
        const values = validActions.map(a => {
          try {
            return ethers.parseEther(a.value || "0");
          } catch {
            return 0n;
          }
        });
        const calldatas = validActions.map(a => a.calldata || "0x");
        const descriptions = new Array(validActions.length).fill("");

        const tx = await gnusDaoService.createProposal(
          sanitizedTitle,
          ipfsHashForContract,
          targets,
          values,
          calldatas,
          descriptions
        );
        console.log("Transaction created:", tx);

        toast.success("Proposal submitted! Waiting for confirmation...");

        const receipt = await tx.wait();

        if (receipt) {
          toast.success("Proposal created successfully!");
        } else {
          toast.success("Proposal created successfully!");
        }

        // Track successful proposal creation
        trackProposalAction('create', undefined, {
          result: 'success',
          category,
          transactionHash: receipt?.hash,
          blockNumber: receipt?.blockNumber,
        });

        onProposalCreated();
        onClose();
      } catch (txError: any) {
        console.error("Blockchain transaction failed FULL ERROR:", JSON.stringify(txError, null, 2), txError);
        
        // Extract inner error message if present (e.g. gas estimation failure from contract revert)
        let errMsg = txError.reason || txError.data?.message || txError.message || "Failed to create proposal.";
        if (errMsg.includes("proposer votes below proposal threshold") || txError.data === "0xf1b7e15e" || errMsg.includes("0xf1b7e15e") || errMsg.includes("InsufficientTokens")) {
          errMsg = "You don't have enough voting power to create a proposal. Please delegate GNUS to yourself first.";
        }
        
        toast.error(`Transaction failed: ${errMsg}`);
        throw txError;
      }
    } catch (error) {
      console.error("Failed to create proposal:", error);
      
      // Track proposal creation failure
      trackProposalAction('create', undefined, {
        result: 'error',
        category,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      toast.error(
        error instanceof Error ? error.message : "Failed to create proposal. Check console for details.",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderBasicStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Proposal Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a clear, descriptive title"
          className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {title.length}/100 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Category *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`p-3 border rounded-lg text-left transition-colors ${
                category === cat.id
                  ? "border-primary bg-primary/5"
                  : "border-input hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {cat.icon}
                <span className="font-medium">{cat.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{cat.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide a detailed description of your proposal, including rationale and expected outcomes..."
          className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={6}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {description.length}/2000 characters
        </p>
      </div>

      {/* Voting Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Voting Period (Days) *
          </label>
          <input
            type="number"
            value={votingPeriodDays}
            onChange={(e) =>
              setVotingPeriodDays(Math.max(1, parseInt(e.target.value) || 1))
            }
            min="1"
            max="30"
            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            How long community members can vote (1-30 days)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Execution Delay (Days) *
          </label>
          <input
            type="number"
            value={executionDelayDays}
            onChange={(e) =>
              setExecutionDelayDays(Math.max(1, parseInt(e.target.value) || 1))
            }
            min="1"
            max="14"
            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Delay before execution after passing (1-14 days)
          </p>
        </div>
      </div>
    </div>
  );

  const renderActionsStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Proposal Actions
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Define the on-chain actions that will be executed if this proposal
              passes. Leave fields empty for proposals that don't require
              on-chain execution.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {actions.map((action, index) => (
          <div key={index} className="border border-input rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Action {index + 1}</h4>
              {actions.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAction(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Target Contract
                </label>
                <input
                  type="text"
                  value={action.target}
                  onChange={(e) =>
                    updateAction(index, "target", e.target.value)
                  }
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  ETH Value
                </label>
                <input
                  type="text"
                  value={action.value}
                  onChange={(e) => updateAction(index, "value", e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Function Signature
                </label>
                <input
                  type="text"
                  value={action.signature}
                  onChange={(e) =>
                    updateAction(index, "signature", e.target.value)
                  }
                  placeholder="transfer(address,uint256)"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Calldata
                </label>
                <input
                  type="text"
                  value={action.calldata}
                  onChange={(e) =>
                    updateAction(index, "calldata", e.target.value)
                  }
                  placeholder="0x"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={addAction}
          className="w-full flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Another Action
        </Button>
      </div>
    </div>
  );

  const renderAttachmentsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">File Attachments</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload supporting documents, images, or other files to IPFS. These
          will be permanently stored and linked to your proposal.
        </p>
      </div>

      <FileUpload
        onUploadComplete={(results) => {
          setAttachments([...attachments, ...results]);
          
          // Track successful file uploads
          results.forEach((result, index) => {
            trackFileUpload(
              result.name,
              result.size || 0,
              'success',
              {
                component: 'CreateProposalModal',
                ipfsHash: result.hash,
                uploadIndex: index,
              }
            );
          });
          
          toast.success(`${results.length} file(s) uploaded successfully`);
        }}
        onUploadStart={() => {
          setUploading(true);
          trackAction('file_upload', {
            component: 'CreateProposalModal',
            action: 'upload_start',
          });
        }}
        onUploadProgress={setUploadProgress}
        multiple={true}
        maxFiles={5}
        disabled={uploading}
        className="mb-4"
      />

      {/* Current Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Uploaded Files ({attachments.length})</h4>
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-input rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.size
                        ? `${Math.round(attachment.size / 1024)} KB`
                        : "Unknown size"}{" "}
                      • IPFS: {attachment.hash.slice(0, 8)}...
                      {attachment.hash.slice(-6)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-sm">
              Uploading to IPFS... {Math.round(uploadProgress)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-4">
        <h4 className="font-medium mb-3">Proposal Summary</h4>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Title:</span>
            <p className="mt-1">{title}</p>
          </div>
          <div>
            <span className="font-medium">Category:</span>
            <p className="mt-1">
              {categories.find((c) => c.id === category)?.name}
            </p>
          </div>
          <div>
            <span className="font-medium">Description:</span>
            <p className="mt-1 whitespace-pre-wrap">{description}</p>
          </div>
          <div>
            <span className="font-medium">Voting Period:</span>
            <p className="mt-1">{votingPeriodDays} days</p>
          </div>
          <div>
            <span className="font-medium">Execution Delay:</span>
            <p className="mt-1">{executionDelayDays} days</p>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <h4 className="font-medium mb-3">
          Actions ({actions.filter((a) => a.target || a.signature).length})
        </h4>
        {actions.filter((a) => a.target || a.signature).length === 0 ? (
          <p className="text-sm text-muted-foreground">No on-chain actions</p>
        ) : (
          <div className="space-y-3">
            {actions
              .filter((a) => a.target || a.signature)
              .map((action, index) => (
                <div
                  key={index}
                  className="text-sm border border-input rounded p-3"
                >
                  <div className="font-medium mb-2">Action {index + 1}</div>
                  <div className="space-y-1 text-xs font-mono">
                    <div>Target: {action.target || "Not specified"}</div>
                    <div>Value: {action.value} ETH</div>
                    <div>Function: {action.signature || "Not specified"}</div>
                    <div>Calldata: {action.calldata}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-card border rounded-lg p-4">
        <h4 className="font-medium mb-3">Attachments ({attachments.length})</h4>
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="text-sm border border-input rounded p-3"
              >
                <div className="font-medium mb-1">{attachment.name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  IPFS: {attachment.hash}
                </div>
                {attachment.size && (
                  <div className="text-xs text-muted-foreground">
                    Size: {Math.round(attachment.size / 1024)} KB
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!wallet.isConnected && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                Wallet Connection Required
              </h4>
              <p className="text-sm text-red-800 dark:text-red-200">
                You must connect your wallet to submit a proposal. Please
                connect your wallet to continue.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              Important Notice
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Once submitted, this proposal cannot be modified. Please review
              all details carefully. The proposal will be subject to community
              voting and may take several days to complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Create Proposal
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Step{" "}
              {step === "basic"
                ? "1"
                : step === "actions"
                  ? "2"
                  : step === "attachments"
                    ? "3"
                    : "4"}{" "}
              of 4
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              trackModalAction('close', 'CreateProposalModal', { step });
              onClose();
            }}
          >
            ×
          </Button>
        </div>

        {/* Step Navigation */}
        <div className="flex items-center mb-8">
          <div
            className={`flex items-center ${step === "basic" ? "text-primary" : "text-muted-foreground"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === "basic"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              1
            </div>
            <span className="ml-2 text-sm font-medium">Basic Info</span>
          </div>
          <div className="flex-1 h-px bg-border mx-4" />
          <div
            className={`flex items-center ${step === "actions" ? "text-primary" : "text-muted-foreground"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === "actions"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              2
            </div>
            <span className="ml-2 text-sm font-medium">Actions</span>
          </div>
          <div className="flex-1 h-px bg-border mx-4" />
          <div
            className={`flex items-center ${step === "attachments" ? "text-primary" : "text-muted-foreground"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === "attachments"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              3
            </div>
            <span className="ml-2 text-sm font-medium">Attachments</span>
          </div>
          <div className="flex-1 h-px bg-border mx-4" />
          <div
            className={`flex items-center ${step === "review" ? "text-primary" : "text-muted-foreground"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === "review"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              4
            </div>
            <span className="ml-2 text-sm font-medium">Review</span>
          </div>
        </div>

        {/* Step Content */}
        {step === "basic" && renderBasicStep()}
        {step === "actions" && renderActionsStep()}
        {step === "attachments" && renderAttachmentsStep()}
        {step === "review" && renderReviewStep()}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => {
              if (step === "actions") {
                setStep("basic");
                trackAction('navigation', { 
                  component: 'CreateProposalModal', 
                  from: 'actions', 
                  to: 'basic' 
                });
              } else if (step === "attachments") {
                setStep("actions");
                trackAction('navigation', { 
                  component: 'CreateProposalModal', 
                  from: 'attachments', 
                  to: 'actions' 
                });
              } else if (step === "review") {
                setStep("attachments");
                trackAction('navigation', { 
                  component: 'CreateProposalModal', 
                  from: 'review', 
                  to: 'attachments' 
                });
              } else {
                trackModalAction('close', 'CreateProposalModal', { step: 'basic', reason: 'cancel' });
                onClose();
              }
            }}
            disabled={loading}
          >
            {step === "basic" ? "Cancel" : "Back"}
          </Button>

          <Button
            onClick={() => {
              if (step === "basic") {
                setStep("actions");
                trackAction('navigation', { 
                  component: 'CreateProposalModal', 
                  from: 'basic', 
                  to: 'actions',
                  formData: { category, titleLength: title.length, descriptionLength: description.length }
                });
              } else if (step === "actions") {
                setStep("attachments");
                trackAction('navigation', { 
                  component: 'CreateProposalModal', 
                  from: 'actions', 
                  to: 'attachments',
                  actionCount: actions.filter(a => a.target || a.signature).length
                });
              } else if (step === "attachments") {
                setStep("review");
                trackAction('navigation', { 
                  component: 'CreateProposalModal', 
                  from: 'attachments', 
                  to: 'review',
                  attachmentCount: attachments.length
                });
              } else {
                handleSubmit();
              }
            }}
            disabled={
              loading ||
              (step === "basic" && (!title.trim() || !description.trim())) ||
              (step === "review" && !wallet.isConnected)
            }
          >
            {loading
              ? "Submitting..."
              : step === "review"
                ? !wallet.isConnected
                  ? "Connect Wallet to Submit"
                  : "Submit Proposal"
                : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
