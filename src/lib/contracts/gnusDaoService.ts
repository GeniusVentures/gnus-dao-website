import { logger } from '@/lib/utils/logger';
import { ethers } from 'ethers';
import type { GNUSDAODiamond } from '../../../diamond-typechain-types';
import { GNUSDAODiamond__factory } from '../../../diamond-typechain-types';
import type { Facet, Proposal, VoteReceipt } from './gnusDao';
import { getGNUSDAOContract, ProposalState, VoteSupport } from './gnusDao';

export class GNUSDAOService {
	private contract: GNUSDAODiamond | null = null;
	private provider: ethers.Provider | null = null;
	private signer: ethers.Signer | null = null;
	private chainId: number | null = null;

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

			// Create contract instance using Diamond TypeChain factory
			// The Diamond pattern allows us to call all facet functions through the same address
			this.contract = GNUSDAODiamond__factory.connect(
				contractConfig.address,
				signer || provider,
			);

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
	 * Get the contract address
	 */
	getContractAddress(): string | null {
		return (this.contract?.target as string) || null;
	}

	/**
	 * Get the current chain ID
	 */
	getChainId(): number | null {
		return this.chainId;
	}

	// Diamond Loupe Functions
	/**
	 * Get all facets and their function selectors
	 * Note: This requires DiamondLoupeFacet to be included in the Diamond
	 */
	async getFacets(): Promise<Facet[]> {
		if (!this.contract) throw new Error('Service not initialized');

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
		if (!this.contract) throw new Error('Service not initialized');

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
		if (!this.contract) throw new Error('Service not initialized');

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
				this.contract.totalSupply?.() || Promise.resolve(0n),
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return (await this.contract.balanceOf?.(address)) || 0n;
		} catch (error) {
			console.error('Error getting token balance:', error);
			return 0n;
		}
	}

	/**
	 * Get voting power for an address
	 */
	async getVotingPower(address: string): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.getVotingPower(address);
		} catch (error) {
			console.error('Error getting voting power:', error);
			return 0n;
		}
	}

	/**
	 * Delegate voting power to another address
	 */
	async delegate(delegatee: string): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.delegateVotes(delegatee);
		} catch (error) {
			console.error('Error delegating votes:', error);
			throw error;
		}
	}

	/**
	 * Check if user has delegated voting power to themselves
	 * NOTE: This contract PREVENTS self-delegation (CannotDelegateToSelf error)
	 * Voting power comes directly from token balance, not delegation
	 * Returns true if user has NOT delegated (meaning they have their own voting power)
	 */
	async isDelegatedToSelf(address: string): Promise<boolean> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const delegatedTo = await this.getDelegatedTo(address);

			// If not delegated to anyone (ZeroAddress), user has their own voting power
			// If delegated to someone else, they've given away their voting power
			return delegatedTo === ethers.ZeroAddress;
		} catch (error) {
			console.error('Error checking delegation status:', error);
			// Default to true - assume user has their own voting power
			return true;
		}
	}

	/**
	 * Delegate voting power to self (activate voting power)
	 * NOTE: This contract does NOT support self-delegation
	 * This method is kept for API compatibility but will throw an error
	 */
	async delegateToSelf(): Promise<ethers.ContractTransactionResponse> {
		throw new Error(
			'This contract does not support self-delegation. Voting power comes directly from your token balance. ' +
				'You already have voting power if you hold GNUS tokens.',
		);
	}

	/**
	 * Get the address that an account has delegated to
	 */
	async getDelegatedTo(account: string): Promise<string> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.getDelegatedTo(account);
		} catch (error) {
			console.error('Error getting delegated to:', error);
			return ethers.ZeroAddress;
		}
	}

	/**
	 * Get the total delegated votes for an account
	 */
	async getDelegatedVotes(account: string): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.getDelegatedVotes(account);
		} catch (error) {
			console.error('Error getting delegated votes:', error);
			return 0n;
		}
	}

	/**
	 * Revoke delegation and return voting power to self
	 */
	async revokeDelegation(): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.revokeDelegation();
		} catch (error) {
			console.error('Error revoking delegation:', error);
			throw error;
		}
	}

	/**
	 * Get past voting power at a specific block
	 */
	async getPastVotingPower(account: string, blockNumber: bigint): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.getPastVotingPower(account, blockNumber);
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return (await this.contract.getProposalCount?.()) || 0n;
		} catch (error) {
			console.error('Error getting proposal count:', error);
			return 0n;
		}
	}

	/**
	 * Get proposal details by ID
	 */
	async getProposal(proposalId: bigint): Promise<Proposal | null> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const basicData = await this.contract.getProposalBasic?.(proposalId);

			if (!basicData) return null;

			// Handle tuple response correctly
			const [, proposer, title, ipfsHash] = basicData;

			// Try to get status data, but don't fail if it's not available
			let statusData = null;
			try {
				statusData = await this.contract.getProposalStatus?.(proposalId);
			} catch (statusError) {
				console.warn('Could not fetch proposal status:', statusError);
			}

			return {
				id: proposalId, // Use the input ID instead of the returned one
				proposer,
				title,
				ipfsHash,
				startTime: statusData?.[0] || 0n,
				endTime: statusData?.[1] || 0n,
				totalVotes: statusData?.[2] || 0n,
				totalVoters: statusData?.[3] || 0n,
				executed: statusData?.[4] || false,
				cancelled: statusData?.[5] || false,
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			// Get proposal status data
			const status = await this.contract.getProposalStatus?.(proposalId);
			if (!status) return ProposalState.Pending;

			const currentTime = Math.floor(Date.now() / 1000);
			const startTime = Number(status.startTime);
			const endTime = Number(status.endTime);
			const executed = status.executed;
			const cancelled = status.cancelled;
			const totalVotes = BigInt(status.totalVotes);

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

			// Voting has ended - determine if succeeded or defeated
			if (currentTime >= endTime) {
				// First check if there are any votes at all
				if (totalVotes === 0n) {
					return ProposalState.Defeated;
				}

				// Use the contract's checkQuorum function for accurate quorum checking
				try {
					const votingConfig = await this.getVotingConfig();
					if (!votingConfig) {
						console.warn('No voting config found, using simple vote check');
						// If no config, proposals with votes succeed
						return totalVotes > 0n ? ProposalState.Succeeded : ProposalState.Defeated;
					}

					// Try to use the VotingMechanismsFacet's checkQuorum function
					try {
						const meetsQuorum = await this.contract.checkQuorum(
							totalVotes,
							votingConfig.quorumThreshold,
						);

						console.log(`Proposal ${proposalId} quorum check:`, {
							totalVotes: totalVotes.toString(),
							quorumThreshold: votingConfig.quorumThreshold.toString(),
							meetsQuorum,
						});

						return meetsQuorum ? ProposalState.Succeeded : ProposalState.Defeated;
					} catch (quorumError) {
						console.warn(
							'checkQuorum function not available, using manual calculation:',
							quorumError,
						);

						// Manual quorum calculation as fallback
						// quorumThreshold is typically a percentage (e.g., 4 = 4%)
						// We need to check if totalVotes meets the threshold
						const meetsQuorum = totalVotes >= votingConfig.quorumThreshold;

						console.log(`Manual quorum check for proposal ${proposalId}:`, {
							totalVotes: totalVotes.toString(),
							quorumThreshold: votingConfig.quorumThreshold.toString(),
							meetsQuorum,
						});

						return meetsQuorum ? ProposalState.Succeeded : ProposalState.Defeated;
					}
				} catch (error) {
					console.error('Error checking quorum:', error);
					// Fallback: if we can't check quorum, use simple logic
					// Proposals with 0 votes are defeated
					return totalVotes > 0n ? ProposalState.Succeeded : ProposalState.Defeated;
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
	): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			if (!this.contract.propose) {
				throw new Error('propose function not available on contract');
			}
			return await this.contract.propose(title, ipfsHash);
		} catch (error) {
			logger.error('Error creating proposal:', error as any);
			throw error;
		}
	}

	/**
	 * Legacy createProposal function for backward compatibility
	 * Converts old format to new format
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
		// const metadata = {
		// 	title,
		// 	description,
		// 	targets,
		// 	values: values.map((v) => v.toString()),
		// 	calldatas,
		// 	created: Date.now(),
		// };

		// For now, use a placeholder IPFS hash
		// In production, this should upload to IPFS first
		const ipfsHash = `QmPlaceholder${Date.now()}`;

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
	} | null> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const config = await this.contract.getVotingConfig?.();
			if (!config) return null;

			return {
				proposalThreshold: config[0] || 0n,
				votingDelay: config[1] || 0n,
				votingPeriod: config[2] || 0n,
				quorumThreshold: config[3] || 0n,
				maxVotesPerWallet: config[4] || 0n,
				proposalCooldown: config[5] || 0n,
			};
		} catch (error) {
			console.error('Error getting voting config:', error);
			return null;
		}
	}

	/**
	 * Cast a vote on a proposal using quadratic voting
	 * The contract uses quadratic voting where cost = votes^2
	 * Note: The deployed contract only supports FOR votes
	 */
	async castVote(
		proposalId: bigint,
		support: VoteSupport,
		votes: bigint = 1n,
	): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			// The deployed contract signature: vote(uint256 proposalId, uint256 votes)
			// It only supports FOR votes - there's no support parameter
			if (support !== VoteSupport.For) {
				throw new Error(
					'This contract only supports FOR votes. Against and Abstain are not implemented.',
				);
			}

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

			// Cast the vote
			return await this.contract.vote?.(proposalId, votesToCast);
		} catch (error) {
			logger.error('Error casting vote:', error as any);
			throw error;
		}
	}

	/**
	 * Get vote receipt for a voter on a proposal
	 */
	async getVoteReceipt(proposalId: bigint, voter: string): Promise<VoteReceipt | null> {
		if (!this.contract) throw new Error('Service not initialized');

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
			const voteData = await this.contract.getVote(proposalId, voter).catch(() => 0n);
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
	 * Execute a proposal that has succeeded
	 */
	async executeProposal(proposalId: bigint): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.executeProposal(proposalId);
		} catch (error) {
			logger.error('Error executing proposal', { error: error as Error });
			throw error;
		}
	}

	/**
	 * Cancel a proposal (only proposer or admin can cancel)
	 */
	async cancelProposal(proposalId: bigint): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.cancelProposal(proposalId);
		} catch (error) {
			logger.error('Error canceling proposal:', error as any);
			throw error;
		}
	}

	/**
	 * Get proposal status (basic info)
	 */
	async getProposalStatus(proposalId: bigint): Promise<any> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.getProposalStatus(proposalId);
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const result = await this.contract.validateVote(
				votes,
				maxVotesPerWallet,
				tokenBalance,
			);
			return {
				valid: result.valid,
				cost: result.cost,
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.calculateQuadraticCost(votes);
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.calculateVoteWeight(tokensCost);
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.calculateMaxVotes(tokenBalance);
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const result = await this.contract.calculateOptimalVotes(
				tokenBudget,
				maxVotesPerWallet,
			);
			return {
				optimalVotes: result.optimalVotes,
				remainingTokens: result.remainingTokens,
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.getVoteEfficiency(votes, tokensCost);
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.getTreasuryBalance();
		} catch (error) {
			console.error('Error getting treasury balance:', error);
			return 0n;
		}
	}

	/**
	 * Check if an address is a treasury manager
	 */
	async isTreasuryManager(address: string): Promise<boolean> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.isTreasuryManager(address);
		} catch (error) {
			console.error('Error checking treasury manager status:', error);
			return false;
		}
	}

	/**
	 * Add a treasury manager (requires owner role)
	 */
	async addTreasuryManager(manager: string): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.addTreasuryManager(manager);
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
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.removeTreasuryManager(manager);
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
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			// Check if signer is a treasury manager
			const signerAddress = await this.signer.getAddress();
			const isManager = await this.isTreasuryManager(signerAddress);

			if (!isManager) {
				throw new Error('Only treasury managers can withdraw from treasury');
			}

			return await this.contract.withdrawFromTreasury(to, amount);
		} catch (error) {
			logger.error('Error withdrawing from treasury:', error as any);
			throw error;
		}
	}

	/**
	 * Deposit to treasury
	 */
	async depositToTreasury(value: bigint): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.depositToTreasury({ value });
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
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.transfer(to, amount);
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
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.approve(spender, amount);
		} catch (error) {
			logger.error('Error approving tokens:', error as any);
			throw error;
		}
	}

	/**
	 * Get allowance for a spender
	 */
	async allowance(owner: string, spender: string): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.allowance(owner, spender);
		} catch (error) {
			console.error('Error getting allowance:', error);
			return 0n;
		}
	}

	/**
	 * Burn tokens
	 */
	async burn(amount: bigint): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contract.burn(amount);
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.hasRole(role, account);
		} catch (error) {
			console.error('Error checking role:', error);
			return false;
		}
	}

	/**
	 * Check if account is a minter
	 */
	async isMinter(account: string): Promise<boolean> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.isMinter(account);
		} catch (error) {
			console.error('Error checking minter:', error);
			return false;
		}
	}

	/**
	 * Get contract owner
	 */
	async getOwner(): Promise<string> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.owner();
		} catch (error) {
			console.error('Error getting owner:', error);
			return ethers.ZeroAddress;
		}
	}

	/**
	 * Check if contract is paused
	 */
	async isPaused(): Promise<boolean> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contract.paused();
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const config = await this.contract.getVotingConfig();

			return {
				votingDelay: config.votingDelay,
				votingPeriod: config.votingPeriod,
				proposalThreshold: config.proposalThreshold,
				quorumVotes: config.quorumThreshold,
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
		if (!this.contract) throw new Error('Service not initialized');

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
	 * Propose a treasury action
	 * Note: This creates a proposal for treasury operations
	 */
	async proposeTreasuryAction(
		recipient: string,
		amount: bigint,
		calldata: string,
		description: string,
	): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			// Create a proposal with treasury action details
			const title = `Treasury Action: ${ethers.formatEther(amount)} ETH to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
			const fullDescription = `${description}\n\nRecipient: ${recipient}\nAmount: ${ethers.formatEther(amount)} ETH\nCalldata: ${calldata}`;

			// Use createProposal to create a treasury action proposal
			return await this.createProposal(title, fullDescription);
		} catch (error) {
			console.error('Error proposing treasury action:', error);
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
		if (!this.contract) throw new Error('Service not initialized');

		const filter = this.contract.filters.ProposalCreated();
		await this.contract.on(filter, callback);
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
		if (!this.contract) throw new Error('Service not initialized');

		const filter = this.contract.filters.VoteCast();
		await this.contract.on(filter, callback);
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
