import { logger } from '@/lib/utils/logger';
import { ethers } from 'ethers';
import type { Facet, Proposal, VoteReceipt } from './gnusDao';
import {
	getGNUSDAOContract,
	GNUS_DAO_DIAMOND_ABI,
	ProposalState,
	VoteSupport,
} from './gnusDao';
import type { GNUSDAODiamondInterface as GNUSDAODiamond } from './abi';

export class GNUSDAOService {
	private contract: GNUSDAODiamond | null = null;
	private provider: ethers.Provider | null = null;
	private signer: ethers.Signer | null = null;
	private chainId: number | null = null;
	private initPromise: Promise<boolean> | null = null;

	constructor() {}

	/**
	 * Initialize the service with a provider and optional signer
	 */
	async initialize(
		provider: ethers.Provider,
		signer?: ethers.Signer,
		chainId?: number,
	): Promise<boolean> {
		try {
			this.provider = provider;
			this.signer = signer || null;

			// Get chain ID if not provided
			if (!chainId) {
				const network = await provider.getNetwork();
				this.chainId = Number(network.chainId);
			} else {
				this.chainId = chainId;
			}

			// Get contract configuration
			const contractConfig = getGNUSDAOContract(this.chainId);
			if (!contractConfig) {
				logger.warn(`GNUS DAO contract not deployed on chain ${this.chainId}`);
				return false;
			}

			// Create contract instance using the unified Diamond ABI
			this.contract = new ethers.Contract(
				contractConfig.address,
				GNUS_DAO_DIAMOND_ABI,
				signer || provider,
			) as unknown as GNUSDAODiamond;

			return true;
		} catch (error) {
			logger.error('Failed to initialize GNUS DAO service:', { error: error as Error });
			return false;
		}
	}

	/**
	 * Check if the service is properly initialized
	 */
	isInitialized(): boolean {
		return this.contract !== null && this.chainId !== null;
	}

	/**
	 * Auto-initialize from window.ethereum if not yet initialized.
	 * This prevents the race condition where components call methods
	 * before the Redux initializeGnusDao thunk has completed.
	 */
	async ensureInitialized(): Promise<void> {
		if (this.isInitialized()) return;

		// Reuse in-flight init to avoid duplicate calls
		if (this.initPromise) {
			await this.initPromise;
			return;
		}

		if (typeof window !== 'undefined' && (window as any).ethereum) {
			this.initPromise = (async () => {
				try {
					const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
					const signer = await browserProvider.getSigner();
					const network = await browserProvider.getNetwork();
					return await this.initialize(browserProvider, signer, Number(network.chainId));
				} catch (error) {
					logger.error('Auto-initialization failed:', { error: error as Error });
					return false;
				} finally {
					this.initPromise = null;
				}
			})();

			const success = await this.initPromise;
			if (!success) {
				throw new Error(
					'Failed to auto-initialize GNUS DAO service. Please connect your wallet to a supported network.',
				);
			}
		} else {
			throw new Error('No wallet provider available. Please connect your wallet.');
		}
	}

	/**
	 * Get the contract address
	 */
	getContractAddress(): string | null {
		return (this.contractSafe?.target as string) || null;
	}

	/**
	 * Get the current chain ID
	 */
	getChainId(): number | null {
		return this.chainId;
	}

	private get contractSafe(): any {
		return this.contract as any;
	}

	// Diamond Loupe Functions
	/**
	 * Get all facets and their function selectors
	 * Note: This requires DiamondLoupeFacet to be included in the Diamond
	 */
	async getFacets(): Promise<Facet[]> {
		await this.ensureInitialized();

		try {
			// The facets() function is part of DiamondLoupeFacet
			// We need to call it through the contract interface
			interface FacetInfo {
				facetAddress: string;
				functionSelectors: string[];
			}
			const contractWithLoupe = this.contract as { facets?: () => Promise<FacetInfo[]> };
			const facets = await contractWithLoupe.facets?.();
			if (!facets) return [];
			return facets.map((facet: FacetInfo) => ({
				facetAddress: facet.facetAddress,
				functionSelectors: facet.functionSelectors,
			}));
		} catch (error) {
			logger.error('Error getting facets', {
				error: error instanceof Error ? error.message : String(error),
			});
			// Return empty array if facets() is not available
			return [];
		}
	}

	/**
	 * Check if the contract supports a specific interface
	 */
	async supportsInterface(interfaceId: string): Promise<boolean> {
		await this.ensureInitialized();

		try {
			// Use getFunction to call supportsInterface dynamically
			const contract = this.contract as unknown as ethers.Contract;
			const result = await contract.getFunction('supportsInterface')(interfaceId);
			return result || false;
		} catch (error) {
			console.error('Error checking interface support:', error);
			return false;
		}
	}

	// Governance Token Functions
	/**
	 * Get token information
	 */
	async getTokenInfo(): Promise<{
		name: string;
		symbol: string;
		decimals: number;
		totalSupply: bigint;
	} | null> {
		await this.ensureInitialized();

		try {
			// Use getFunction to call methods dynamically since they may not be in the TypeChain types
			const contract = this.contract as unknown as ethers.Contract;

			const [name, symbol, decimalsResult, totalSupply] = await Promise.all([
				contract
					.getFunction('name')()
					.catch(() => 'GNUS Token'),
				contract
					.getFunction('symbol')()
					.catch(() => 'GNUS'),
				contract
					.getFunction('decimals')()
					.catch(() => 18n),
				this.contractSafe.totalSupply?.() || Promise.resolve(0n),
			]);

			const decimals = Number(decimalsResult);
			return { name, symbol, decimals, totalSupply };
		} catch (error) {
			console.error('Error getting token info:', error);
			return null;
		}
	}

	/**
	 * Get token balance for an address
	 */
	async getTokenBalance(address: string): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return (await this.contractSafe.balanceOf?.(address)) || 0n;
		} catch (error) {
			console.error('Error getting token balance:', error);
			return 0n;
		}
	}

	/**
	 * Get voting power for an address.
	 * Tries getVotingPower first, falls back to getCurrentVotes (confirmed in Diamond ABI).
	 */
	async getVotingPower(address: string): Promise<bigint> {
		await this.ensureInitialized();

		try {
			if (typeof this.contractSafe.getVotingPower === 'function') {
				return await this.contractSafe.getVotingPower(address);
			}
			// Fallback: getCurrentVotes is always in the deployed Diamond ABI
			return await this.contractSafe.getCurrentVotes(address);
		} catch (error) {
			console.error('Error getting voting power:', error);
			try {
				return await this.contractSafe.getCurrentVotes(address);
			} catch {
				return 0n;
			}
		}
	}

	/**
	 * Delegate voting power to another address
	 */
	async delegate(delegatee: string): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			// Use delegate() directly from the token facet — NOT delegateVotes() from the
			// governance facet, which incorrectly passes msg.sender as the diamond address
			return await this.contractSafe.delegate(delegatee);
		} catch (error) {
			console.error('Error delegating votes:', error);
			throw error;
		}
	}

	/**
	 * Delegate voting power to self — not supported by this contract.
	 * The on-chain GovernanceFacet reverts with CannotDelegateToSelf.
	 * Voting power comes directly from your GNUS token balance.
	 * This method is kept for API compatibility but will always throw.
	 */
	async delegateToSelf(): Promise<ethers.ContractTransactionResponse> {
		throw new Error(
			'Self-delegation is not supported by this contract (CannotDelegateToSelf). ' +
				'Your voting power is derived directly from your GNUS token balance.',
		);
	}

	/**
	 * Get the address that an account has delegated to
	 */
	async getDelegatedTo(account: string): Promise<string> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.getDelegatedTo(account);
		} catch (error) {
			console.error('Error getting delegated to:', error);
			return ethers.ZeroAddress;
		}
	}

	/**
	 * Get the total delegated/voting power for an account.
	 * NOTE: getDelegatedVotes is NOT in the deployed Diamond ABI.
	 * Uses getCurrentVotes which IS confirmed in the ABI.
	 */
	async getDelegatedVotes(account: string): Promise<bigint> {
		await this.ensureInitialized();

		try {
			// getCurrentVotes is confirmed in the deployed Diamond ABI
			return await this.contractSafe.getCurrentVotes(account);
		} catch (error) {
			console.error('Error getting delegated votes:', error);
			return 0n;
		}
	}

	/**
	 * Revoke delegation and return voting power to self
	 */
	async revokeDelegation(): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			// Delegate back to self using delegate() directly — revokeDelegation() in the
			// governance facet has the same msg.sender bug as delegateVotes()
			const address = await this.signer.getAddress();
			return await this.contractSafe.delegate(address);
		} catch (error) {
			console.error('Error revoking delegation:', error);
			throw error;
		}
	}

	/**
	 * Get past voting power at a specific block
	 */
	async getPastVotingPower(account: string, blockNumber: bigint): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.getPastVotingPower(account, blockNumber);
		} catch (error) {
			console.error('Error getting past voting power:', error);
			return 0n;
		}
	}

	// Governance Functions
	/**
	 * Get the total number of proposals
	 */
	async getProposalCount(): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return (await this.contractSafe.getProposalCount?.()) || 0n;
		} catch (error) {
			console.error('Error getting proposal count:', error);
			return 0n;
		}
	}

	/**
	 * Get proposal details by ID
	 */
	async getProposal(proposalId: bigint): Promise<Proposal | null> {
		await this.ensureInitialized();

		try {
			const basicData = await this.contractSafe.getProposalBasic?.(proposalId);

			if (!basicData) return null;

			// Handle tuple response correctly
			const [, proposer, title, ipfsHash] = basicData;

			// Try to get status data, but don't fail if it's not available
			let statusData = null;
			try {
				statusData = await this.contractSafe.getProposalStatus?.(proposalId);
			} catch (statusError) {
				console.warn('Could not fetch proposal status:', statusError);
			}

			return {
				id: proposalId,
				proposer,
				title,
				ipfsHash,
				startTime: statusData?.[0] || 0n,
				endTime: statusData?.[1] || 0n,
				totalVotes: statusData?.[2] || 0n,
				totalVoters: statusData?.[3] || 0n,
				executed: statusData?.[4] || false,
				cancelled: statusData?.[5] || false,
				queued: statusData?.[6] || false,
				queuedTime: statusData?.[7] || 0n,
				// Legacy fields for compatibility
				eta: 0n,
				startBlock: 0n,
				endBlock: 0n,
				forVotes: 0n,
				againstVotes: 0n,
				abstainVotes: 0n,
				canceled: statusData?.[5] || false,
			};
		} catch (error) {
			console.error('Error getting proposal:', error);
			return null;
		}
	}

	/**
	 * Get proposal state (calculated from status data)
	 * Uses the contract's checkQuorum function for accurate quorum checking
	 */
	async getProposalState(proposalId: bigint): Promise<ProposalState> {
		await this.ensureInitialized();

		try {
			// Get proposal status data
			const status = await this.contractSafe.getProposalStatus?.(proposalId);
			if (!status) return ProposalState.Pending;

			const currentTime = Math.floor(Date.now() / 1000);
			const startTime = status[0];
			const endTime = status[1];
			const executed = status[4];
			const cancelled = status[5];
			const totalVotes = status[2];

			// Calculate state based on status
			// Priority order: Executed > Canceled > Pending > Active > Succeeded/Defeated

			// Check if executed or cancelled first
			if (executed) return ProposalState.Executed;
			if (cancelled) return ProposalState.Canceled;

			// Check if voting hasn't started yet
			if (currentTime < startTime) return ProposalState.Pending;

			// Check if voting is active
			if (currentTime >= startTime && currentTime < endTime) {
				return ProposalState.Active;
			}

			// Voting has ended - determine if succeeded, defeated, or expired
			if (currentTime >= endTime) {
				// No votes at all = quorum not met = Expired
				if (totalVotes === 0n) {
					return ProposalState.Expired;
				}

				// Get vote breakdown to check majority
				const breakdown = await this.getVoteBreakdown(proposalId);

				try {
					const votingConfig = await this.getVotingConfig();
					const quorumThreshold = votingConfig?.quorumThreshold ?? 1000n;

					const meetsQuorum = totalVotes >= quorumThreshold;

					// Quorum not met = Expired (not enough participation)
					if (!meetsQuorum) {
						return ProposalState.Expired;
					}

					// Quorum met but Against >= For = Defeated (community rejected it)
					if (!breakdown || breakdown.forVotes <= breakdown.againstVotes) {
						return ProposalState.Defeated;
					}

					// Quorum met and For > Against = Succeeded
					return ProposalState.Succeeded;

				} catch (error) {
					console.error('Error checking quorum:', error);
					// Fallback: no breakdown data, just check total votes
					return totalVotes > 0n ? ProposalState.Succeeded : ProposalState.Expired;
				}
			}

			return ProposalState.Pending;
		} catch (error) {
			console.error('Error getting proposal state:', error);
			return ProposalState.Pending;
		}
	}

	/**
	 * Create a new proposal using the correct deployed contract signature
	 */
	async createProposal(
		title: string,
		ipfsHash: string,
		targets: string[] = [],
		values: bigint[] = [],
		calldatas: string[] = [],
		descriptions: string[] = [],
	): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			if (!this.contractSafe.propose) {
				throw new Error('propose function not available on contract');
			}
			return await this.contractSafe.propose(
				title,
				ipfsHash,
				targets,
				values,
				calldatas,
				descriptions,
			);
		} catch (error) {
			logger.error('Error creating proposal:', error as any);
			throw error;
		}
	}

	/**
	 * Legacy createProposal function for backward compatibility
	 * Converts old format to new format, uploading metadata to IPFS
	 */
	async createProposalLegacy(
		targets: string[],
		values: bigint[],
		calldatas: string[],
		description: string,
	): Promise<ethers.ContractTransactionResponse> {
		// Extract title from description (first line)
		const lines = description.split('\n');
		const title = lines[0] || 'Untitled Proposal';

		// Create IPFS metadata with the full proposal data
		const metadata = {
			title,
			description,
			targets,
			values: values.map((v) => v.toString()),
			calldatas,
			created: Date.now(),
		};

		let ipfsHash: string;
		try {
			// Upload metadata to IPFS via SecureIPFSService
			const { SecureIPFSService } = await import('@/lib/ipfs/secureUpload');
			const result = await SecureIPFSService.uploadProposalMetadata({
				title,
				description,
			});
			if (!result.success || !result.ipfsHash) {
				throw new Error(result.error || 'IPFS upload returned no hash');
			}
			ipfsHash = result.ipfsHash;
			logger.info('Proposal metadata uploaded to IPFS:', { ipfsHash });
		} catch (error) {
			logger.error('Failed to upload proposal metadata to IPFS:', error as any);
			throw new Error(
				'Failed to upload proposal metadata to IPFS. Please check your IPFS configuration and try again.',
			);
		}

		return this.createProposal(title, ipfsHash);
	}

	/**
	 * Get voting configuration from the contract
	 */
	async getVotingConfig(): Promise<{
		proposalThreshold: bigint;
		votingDelay: bigint;
		votingPeriod: bigint;
		quorumThreshold: bigint;
		maxVotesPerWallet: bigint;
		proposalCooldown: bigint;
		timelockDelay: bigint;
		maxProposalActions: bigint;
	} | null> {
		await this.ensureInitialized();

		try {
			const config = await this.contractSafe.getVotingConfig?.();
			if (!config) return null;

			return {
				proposalThreshold: config[0] || 0n,
				votingDelay: config[1] || 0n,
				votingPeriod: config[2] || 0n,
				quorumThreshold: config[3] || 0n,
				maxVotesPerWallet: config[4] || 0n,
				proposalCooldown: config[5] || 0n,
				timelockDelay: config[6] || 0n,
				maxProposalActions: config[7] || 0n,
			};
		} catch (error) {
			console.error('Error getting voting config:', error);
			return null;
		}
	}

	/**
	 * Check if a user has delegated their voting power internally instead of outwardly
	 */
	async isDelegatedToSelf(account: string, chainId?: number): Promise<boolean> {
		await this.ensureInitialized();
		try {
			const delegatee = await this.getDelegatedTo(account);
			// Either un-delegated (0x00) or explicitly self-delegated
			return (
				delegatee === ethers.ZeroAddress ||
				delegatee.toLowerCase() === account.toLowerCase()
			);
		} catch (error) {
			console.error('Error checking if delegated to self:', error);
			// Assume true to prevent aggressive popups if RPC errors out
			return true;
		}
	}

	/**
	 * Cast a vote on a proposal.
	 * Uses vote(proposalId, votes) — the function confirmed in the Diamond ABI.
	 * NOTE: castQuadraticVote is NOT in the deployed Diamond ABI.
	 * The deployed vote() function uses quadratic cost internally.
	 */
	async castVote(
		proposalId: bigint,
		support: VoteSupport,
		votes: bigint = 1n,
	): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			// Ensure votes is at least 1
			const votesToCast = votes > 0n ? votes : 1n;

			// Get voter's address
			const voterAddress = await this.signer.getAddress();

			// Validate the vote before casting
			const votingConfig = await this.getVotingConfig();
			const tokenBalance = await this.getTokenBalance(voterAddress);

			if (votingConfig) {
				const validation = await this.validateVote(
					votesToCast,
					votingConfig.maxVotesPerWallet,
					tokenBalance,
				);

				if (!validation.valid) {
					const cost = await this.calculateQuadraticCost(votesToCast);
					throw new Error(
						`Invalid vote: You need ${cost} tokens to cast ${votesToCast} votes, but you only have ${tokenBalance} tokens.`,
					);
				}
			}

			// Use vote(proposalId, support, votes) — updated Diamond ABI with For/Against/Abstain
			// support: 0=Against, 1=For, 2=Abstain
			if (!this.contractSafe.vote) {
				throw new Error('vote function not available on contract');
			}
			return await this.contractSafe.vote(proposalId, support, votesToCast);
		} catch (error) {
			logger.error('Error casting vote:', error as any);
			throw error;
		}
	}

	/**
	 * Get vote receipt for a voter on a proposal
	 */
	async getVoteReceipt(proposalId: bigint, voter: string): Promise<VoteReceipt | null> {
		await this.ensureInitialized();

		try {
			// Use hasVoted function and getVote function from the deployed contract
			const hasVoted = await this.contract?.hasVoted?.(proposalId, voter);

			if (!hasVoted) {
				return {
					hasVoted: false,
					support: VoteSupport.Against,
					votes: 0n,
				};
			}

			// Try to get vote details
			const voteData = await this.contractSafe.getVote(proposalId, voter).catch(() => 0n);
			const votes = voteData || 0n;

			return {
				hasVoted: true,
				support: Number(votes) > 0 ? VoteSupport.For : VoteSupport.Against,
				votes: BigInt(votes),
			};
		} catch (error) {
			console.error('Error getting vote receipt:', error);
			return null;
		}
	}

	/**
	 * Get vote breakdown (For/Against/Abstain) for a proposal
	 */
	async getVoteBreakdown(proposalId: bigint): Promise<{ forVotes: bigint; againstVotes: bigint; abstainVotes: bigint } | null> {
		await this.ensureInitialized();

		try {
			const breakdown = await this.contractSafe.getVoteBreakdown?.(proposalId);
			if (!breakdown) return { forVotes: 0n, againstVotes: 0n, abstainVotes: 0n };

			return {
				forVotes: breakdown[0] || 0n,
				againstVotes: breakdown[1] || 0n,
				abstainVotes: breakdown[2] || 0n,
			};
		} catch (error) {
			console.error('Error getting vote breakdown:', error);
			return null;
		}
	}

	/**
	 * Execute a proposal that has succeeded
	 */
	async executeProposal(proposalId: bigint): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			return await this.contractSafe.executeProposal(proposalId);
		} catch (error) {
			logger.error('Error executing proposal', { error: error as Error });
			throw error;
		}
	}

	/**
	 * Cancel a proposal (only proposer or admin can cancel)
	 */
	async cancelProposal(proposalId: bigint): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			return await this.contractSafe.cancelProposal(proposalId);
		} catch (error) {
			logger.error('Error canceling proposal:', error as any);
			throw error;
		}
	}

	/**
	 * Get proposal status (basic info)
	 */
	async getProposalStatus(proposalId: bigint): Promise<any> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.getProposalStatus(proposalId);
		} catch (error) {
			console.error('Error getting proposal status:', error);
			return null;
		}
	}

	/**
	 * Validate a vote before casting
	 */
	async validateVote(
		votes: bigint,
		maxVotesPerWallet: bigint,
		tokenBalance: bigint,
	): Promise<{ valid: boolean; cost: bigint }> {
		await this.ensureInitialized();

		try {
			const result = await this.contractSafe.validateVote(
				votes,
				maxVotesPerWallet,
				tokenBalance,
			);
			return {
				valid: result[0],
				cost: result[1],
			};
		} catch (error) {
			console.error('Error validating vote:', error);
			return { valid: false, cost: 0n };
		}
	}

	// Quadratic Voting Functions
	/**
	 * Calculate quadratic cost for a number of votes
	 */
	async calculateQuadraticCost(votes: bigint): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.calculateQuadraticCost(votes);
		} catch (error) {
			console.error('Error calculating quadratic cost:', error);
			// Fallback calculation: votes^2
			return votes * votes;
		}
	}

	/**
	 * Calculate vote weight from token cost
	 */
	async calculateVoteWeight(tokensCost: bigint): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.calculateVoteWeight(tokensCost);
		} catch (error) {
			console.error('Error calculating vote weight:', error);
			// Fallback calculation: sqrt(cost)
			return BigInt(Math.floor(Math.sqrt(Number(tokensCost))));
		}
	}

	/**
	 * Calculate maximum votes possible with given token balance
	 */
	async calculateMaxVotes(tokenBalance: bigint): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.calculateMaxVotes(tokenBalance);
		} catch (error) {
			console.error('Error calculating max votes:', error);
			// Fallback calculation: sqrt(balance)
			return BigInt(Math.floor(Math.sqrt(Number(tokenBalance))));
		}
	}

	/**
	 * Calculate optimal number of votes for a given token budget
	 */
	async calculateOptimalVotes(
		tokenBudget: bigint,
		maxVotesPerWallet: bigint,
	): Promise<{ optimalVotes: bigint; remainingTokens: bigint }> {
		await this.ensureInitialized();

		try {
			const result = await this.contractSafe.calculateOptimalVotes(
				tokenBudget,
				maxVotesPerWallet,
			);
			return {
				optimalVotes: result[0],
				remainingTokens: result[1],
			};
		} catch (error) {
			console.error('Error calculating optimal votes:', error);
			// Fallback: calculate sqrt of budget, capped at max
			const optimal = BigInt(Math.floor(Math.sqrt(Number(tokenBudget))));
			const capped = optimal > maxVotesPerWallet ? maxVotesPerWallet : optimal;
			const cost = capped * capped;
			return {
				optimalVotes: capped,
				remainingTokens: tokenBudget - cost,
			};
		}
	}

	/**
	 * Get vote efficiency (votes per token spent)
	 */
	async getVoteEfficiency(votes: bigint, tokensCost: bigint): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.getVoteEfficiency(votes, tokensCost);
		} catch (error) {
			console.error('Error getting vote efficiency:', error);
			// Fallback: efficiency = votes / cost (scaled by 100 for percentage)
			if (tokensCost === 0n) return 0n;
			return (votes * 100n) / tokensCost;
		}
	}

	// Treasury Functions
	/**
	 * Get treasury balance
	 */
	async getTreasuryBalance(): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.getTreasuryBalance();
		} catch (error) {
			console.error('Error getting treasury balance:', error);
			return 0n;
		}
	}

	/**
	 * Get actual ETH balance held by the contract
	 */
	async getContractBalance(): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.getContractBalance();
		} catch (error) {
			console.error('Error getting contract balance:', error);
			return 0n;
		}
	}

	/**
	 * Check if an address is a treasury manager
	 */
	async isTreasuryManager(address: string): Promise<boolean> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.isTreasuryManager(address);
		} catch (error) {
			console.error('Error checking treasury manager status:', error);
			return false;
		}
	}

	/**
	 * Get all addresses that have ever been added as treasury managers by querying on-chain events
	 */
	async getTreasuryManagerAddresses(): Promise<string[]> {
		await this.ensureInitialized();
		try {
			const contract = this.contract;
			const addedFilter = contract.filters.TreasuryManagerAdded();
			const removedFilter = contract.filters.TreasuryManagerRemoved();
			const [addedEvents, removedEvents] = await Promise.all([
				contract.queryFilter(addedFilter),
				contract.queryFilter(removedFilter),
			]);
			const removed = new Set(removedEvents.map((e: any) => e.args.manager.toLowerCase()));
			const active = addedEvents
				.map((e: any) => e.args.manager as string)
				.filter((addr) => !removed.has(addr.toLowerCase()));
			return [...new Set(active)];
		} catch (error) {
			console.error('Error fetching treasury manager events:', error);
			return [];
		}
	}

	/**
	 * Add a treasury manager (requires owner role)
	 */
	async addTreasuryManager(manager: string): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			return await this.contractSafe.addTreasuryManager(manager);
		} catch (error) {
			logger.error('Error adding treasury manager:', error as any);
			throw error;
		}
	}

	/**
	 * Remove a treasury manager (requires owner role)
	 */
	async removeTreasuryManager(
		manager: string,
	): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			return await this.contractSafe.removeTreasuryManager(manager);
		} catch (error) {
			logger.error('Error removing treasury manager:', error as any);
			throw error;
		}
	}

	/**
	 * Withdraw from treasury (requires treasury manager role)
	 */
	async withdrawFromTreasury(
		to: string,
		amount: bigint,
	): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			// Check if signer is a treasury manager
			const signerAddress = await this.signer.getAddress();
			const isManager = await this.isTreasuryManager(signerAddress);

			if (!isManager) {
				throw new Error('Only treasury managers can withdraw from treasury');
			}

			return await this.contractSafe.withdrawFromTreasury(to, amount);
		} catch (error) {
			logger.error('Error withdrawing from treasury:', error as any);
			throw error;
		}
	}

	/**
	 * Deposit to treasury
	 */
	async depositToTreasury(value: bigint): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			return await this.contractSafe.depositToTreasury({ value });
		} catch (error) {
			logger.error('Error depositing to treasury:', error as any);
			throw error;
		}
	}

	// Token Functions
	/**
	 * Transfer tokens to another address
	 */
	async transfer(to: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			if (!this.contractSafe.transfer) {
				throw new Error('transfer function not available on contract');
			}
			return await this.contractSafe.transfer(to, amount);
		} catch (error) {
			logger.error('Error transferring tokens', { error: error as Error });
			throw error;
		}
	}

	/**
	 * Approve spender to use tokens
	 */
	async approve(
		spender: string,
		amount: bigint,
	): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			if (!this.contractSafe.approve) {
				throw new Error('approve function not available on contract');
			}
			return await this.contractSafe.approve(spender, amount);
		} catch (error) {
			logger.error('Error approving tokens:', error as any);
			throw error;
		}
	}

	/**
	 * Get allowance for a spender
	 */
	async allowance(owner: string, spender: string): Promise<bigint> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.allowance(owner, spender);
		} catch (error) {
			console.error('Error getting allowance:', error);
			return 0n;
		}
	}

	/**
	 * Burn tokens
	 */
	async burn(amount: bigint): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		try {
			return await this.contractSafe.burn(amount);
		} catch (error) {
			logger.error('Error burning tokens:', error as any);
			throw error;
		}
	}

	// Access Control Functions
	/**
	 * Check if an account has a specific role
	 */
	async hasRole(role: string, account: string): Promise<boolean> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.hasRole(role, account);
		} catch (error) {
			console.error('Error checking role:', error);
			return false;
		}
	}

	/**
	 * Check if account is a minter
	 */
	async isMinter(account: string): Promise<boolean> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.isMinter(account);
		} catch (error) {
			console.error('Error checking minter:', error);
			return false;
		}
	}

	/**
	 * Get contract owner
	 */
	async getOwner(): Promise<string> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.owner();
		} catch (error) {
			console.error('Error getting owner:', error);
			return ethers.ZeroAddress;
		}
	}

	/**
	 * Check if contract is paused
	 */
	async isPaused(): Promise<boolean> {
		await this.ensureInitialized();

		try {
			return await this.contractSafe.paused();
		} catch (error) {
			console.error('Error checking paused status:', error);
			return false;
		}
	}

	// Governance Configuration
	/**
	 * Get governance parameters
	 */
	async getGovernanceConfig(): Promise<{
		votingDelay: bigint;
		votingPeriod: bigint;
		proposalThreshold: bigint;
		quorumVotes: bigint;
	} | null> {
		await this.ensureInitialized();

		try {
			const config = await this.contractSafe.getVotingConfig();

			return {
				votingDelay: config[1],
				votingPeriod: config[2],
				proposalThreshold: config[0],
				quorumVotes: config[3],
			};
		} catch (error) {
			console.error('Error getting governance config:', error);
			return null;
		}
	}

	/**
	 * Get governance parameters (alias for getGovernanceConfig)
	 */
	async getGovernanceParams(): Promise<{
		votingDelay: bigint;
		votingPeriod: bigint;
		proposalThreshold: bigint;
		quorumVotes: bigint;
	} | null> {
		return this.getGovernanceConfig();
	}

	/**
	 * Get vote credits for an address
	 * Note: This is calculated from token balance and voting power
	 */
	async getVoteCredits(address: string): Promise<bigint> {
		await this.ensureInitialized();

		try {
			// Vote credits are based on voting power
			const votingPower = await this.getVotingPower(address);
			return votingPower;
		} catch (error) {
			console.error('Error getting vote credits:', error);
			return 0n;
		}
	}

	/**
	 * Propose a treasury action.
	 * Uploads proposal metadata to IPFS first, then calls createProposal
	 * with the resulting IPFS CID as the ipfsHash argument.
	 */
	async proposeTreasuryAction(
		recipient: string,
		amount: bigint,
		calldata: string,
		description: string,
	): Promise<ethers.ContractTransactionResponse> {
		await this.ensureInitialized();
		if (!this.signer) {
			throw new Error('No signer available. Please connect your wallet.');
		}

		const title = `Treasury Action: ${ethers.formatEther(amount)} ETH to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
		const fullDescription = `${description}\n\nRecipient: ${recipient}\nAmount: ${ethers.formatEther(amount)} ETH\nCalldata: ${calldata}`;

		// Upload metadata to IPFS — createProposal requires a real IPFS hash, not plain text
		let ipfsHash: string;
		try {
			const { SecureIPFSService } = await import('@/lib/ipfs/secureUpload');
			const result = await SecureIPFSService.uploadProposalMetadata({
				title,
				description: fullDescription,
			});
			if (!result.success || !result.ipfsHash) {
				throw new Error(result.error || 'IPFS upload returned no hash');
			}
			ipfsHash = result.ipfsHash;
			logger.info('Treasury proposal metadata uploaded to IPFS:', { ipfsHash });
		} catch (error) {
			logger.error('Failed to upload treasury proposal metadata to IPFS:', error as any);
			throw new Error(
				'Failed to upload treasury proposal metadata to IPFS. Please check your IPFS configuration and try again.',
			);
		}

		try {
			return await this.createProposal(title, ipfsHash);
		} catch (error) {
			logger.error('Error proposing treasury action:', error as any);
			throw error;
		}
	}

	// Event Listeners
	/**
	 * Listen for proposal created events
	 */
	async onProposalCreated(
		callback: (
			proposalId: bigint,
			proposer: string,
			title: string,
			ipfsHash: string,
			startTime: bigint,
			endTime: bigint,
		) => void,
	): Promise<void> {
		await this.ensureInitialized();

		const filter = this.contractSafe.filters.ProposalCreated();
		await this.contractSafe.on(filter, callback);
	}

	/**
	 * Listen for vote cast events
	 */
	async onVoteCast(
		callback: (
			proposalId: bigint,
			voter: string,
			votes: bigint,
			tokensCost: bigint,
		) => void,
	): Promise<void> {
		await this.ensureInitialized();

		const filter = this.contractSafe.filters.VoteCast();
		await this.contractSafe.on(filter, callback);
	}

	/**
	 * Remove all event listeners
	 */
	async removeAllListeners(): Promise<void> {
		if (this.contract) {
			await this.contract.removeAllListeners();
		}
	}
}

// Singleton instance
export const gnusDaoService = new GNUSDAOService();
