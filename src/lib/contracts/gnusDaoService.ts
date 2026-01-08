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
	 */
	async getFacets(): Promise<Facet[]> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
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
			return [];
		}
	}

	// Governance Token Functions
	/**
	 * Get token balance for an address
	 */
	async getTokenBalance(address: string): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return (await this.contractSafe.balanceOf?.(address)) || 0n;
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
			return await this.contractSafe.getVotingPower(address);
		} catch (error) {
			console.error('Error getting voting power:', error);
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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const basicData = await this.contractSafe.getProposalBasic?.(proposalId);
			if (!basicData) return null;

			const [, proposer, title, ipfsHash] = basicData;

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
	 * Get proposal state
	 */
	async getProposalState(proposalId: bigint): Promise<ProposalState> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const status = await this.contractSafe.getProposalStatus?.(proposalId);
			if (!status) return ProposalState.Pending;

			const currentTime = Math.floor(Date.now() / 1000);
			const startTime = status[0];
			const endTime = status[1];
			const executed = status[4];
			const cancelled = status[5];
			const totalVotes = status[2];

			if (executed) return ProposalState.Executed;
			if (cancelled) return ProposalState.Canceled;
			if (currentTime < startTime) return ProposalState.Pending;
			if (currentTime >= startTime && currentTime < endTime) return ProposalState.Active;

			if (currentTime >= endTime) {
				if (totalVotes === 0n) return ProposalState.Defeated;

				try {
					const votingConfig = await this.getVotingConfig();
					if (!votingConfig) {
						return totalVotes > 0n ? ProposalState.Succeeded : ProposalState.Defeated;
					}

					const meetsQuorum = totalVotes >= votingConfig.quorumThreshold;
					return meetsQuorum ? ProposalState.Succeeded : ProposalState.Defeated;
				} catch (error) {
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
	 * Create a new proposal
	 */
	async createProposal(
		title: string,
		ipfsHash: string,
	): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			if (!this.contractSafe.propose) {
				throw new Error('propose function not available on contract');
			}
			return await this.contractSafe.propose(title, ipfsHash, [], [], [], []);
		} catch (error) {
			logger.error('Error creating proposal:', error as any);
			throw error;
		}
	}

	/**
	 * Get voting configuration
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
			const config = await this.contractSafe.getVotingConfig?.();
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
	 * Cast a vote on a proposal
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
			if (support !== VoteSupport.For) {
				throw new Error(
					'This contract only supports FOR votes. Against and Abstain are not implemented.',
				);
			}

			const votesToCast = votes > 0n ? votes : 1n;

			if (!this.contractSafe.vote) {
				throw new Error('vote function not available on contract');
			}
			return await this.contractSafe.vote(proposalId, votesToCast);
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
			const hasVoted = await this.contract?.hasVoted?.(proposalId, voter);

			if (!hasVoted) {
				return {
					hasVoted: false,
					support: VoteSupport.Against,
					votes: 0n,
				};
			}

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
	 * Execute a proposal
	 */
	async executeProposal(proposalId: bigint): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contractSafe.executeProposal(proposalId);
		} catch (error) {
			logger.error('Error executing proposal', { error: error as Error });
			throw error;
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

	/**
	 * Calculate quadratic cost for votes
	 */
	async calculateQuadraticCost(votes: bigint): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.calculateQuadraticCost(votes);
		} catch (error) {
			console.error('Error calculating quadratic cost:', error);
			return votes * votes;
		}
	}

	/**
	 * Get treasury balance
	 */
	async getTreasuryBalance(): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.getTreasuryBalance();
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
			return await this.contractSafe.isTreasuryManager(address);
		} catch (error) {
			console.error('Error checking treasury manager status:', error);
			return false;
		}
	}

	/**
	 * Add a treasury manager
	 */
	async addTreasuryManager(manager: string): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contractSafe.addTreasuryManager(manager);
		} catch (error) {
			logger.error('Error adding treasury manager:', error as any);
			throw error;
		}
	}

	/**
	 * Remove a treasury manager
	 */
	async removeTreasuryManager(manager: string): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contractSafe.removeTreasuryManager(manager);
		} catch (error) {
			logger.error('Error removing treasury manager:', error as any);
			throw error;
		}
	}

	/**
	 * Check if account is a minter
	 */
	async isMinter(account: string): Promise<boolean> {
		if (!this.contract) throw new Error('Service not initialized');

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
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.owner();
		} catch (error) {
			console.error('Error getting owner:', error);
			return ethers.ZeroAddress;
		}
	}

	/**
	 * Get vote credits for an address
	 */
	async getVoteCredits(address: string): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const votingPower = await this.getVotingPower(address);
			return votingPower;
		} catch (error) {
			console.error('Error getting vote credits:', error);
			return 0n;
		}
	}

	/**
	 * Queue a proposal for execution
	 */
	async queueProposal(proposalId: bigint): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			const proposal = await this.getProposal(proposalId);
			if (!proposal) {
				throw new Error('Proposal not found');
			}

			const state = await this.getProposalState(proposalId);
			if (state !== ProposalState.Succeeded) {
				throw new Error('Proposal must be in Succeeded state to queue');
			}

			const tx = await this.contractSafe.queueProposal(proposalId);
			logger.info('Proposal queued successfully:', { proposalId, txHash: tx.hash });
			return tx;
		} catch (error) {
			logger.error('Failed to queue proposal:', { proposalId, error: error as Error });
			throw error;
		}
	}

	/**
	 * Cancel a proposal
	 */
	async cancelProposal(proposalId: bigint): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contractSafe.cancelProposal(proposalId);
		} catch (error) {
			logger.error('Error canceling proposal:', error as any);
			throw error;
		}
	}

	/**
	 * Get governance parameters
	 */
	async getGovernanceParams(): Promise<{
		votingDelay: bigint;
		votingPeriod: bigint;
		proposalThreshold: bigint;
		quorumVotes: bigint;
	} | null> {
		const config = await this.getVotingConfig();
		if (!config) return null;

		return {
			votingDelay: config.votingDelay,
			votingPeriod: config.votingPeriod,
			proposalThreshold: config.proposalThreshold,
			quorumVotes: config.quorumThreshold,
		};
	}

	/**
	 * Check if contract is paused
	 */
	async isPaused(): Promise<boolean> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.paused();
		} catch (error) {
			console.error('Error checking paused status:', error);
			return false;
		}
	}

	/**
	 * Check if user has delegated voting power to themselves
	 */
	async isDelegatedToSelf(address: string): Promise<boolean> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const delegatedTo = await this.getDelegatedTo(address);
			return delegatedTo === ethers.ZeroAddress;
		} catch (error) {
			console.error('Error checking delegation status:', error);
			return true;
		}
	}

	/**
	 * Get the address that an account has delegated to
	 */
	async getDelegatedTo(account: string): Promise<string> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.getDelegatedTo(account);
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
			return await this.contractSafe.getDelegatedVotes(account);
		} catch (error) {
			console.error('Error getting delegated votes:', error);
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
			return await this.contractSafe.delegateVotes(delegatee);
		} catch (error) {
			console.error('Error delegating votes:', error);
			throw error;
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
			return await this.contractSafe.revokeDelegation();
		} catch (error) {
			console.error('Error revoking delegation:', error);
			throw error;
		}
	}

	/**
	 * Propose a treasury action
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
			const title = `Treasury Action: ${ethers.formatEther(amount)} ETH to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
			const fullDescription = `${description}\n\nRecipient: ${recipient}\nAmount: ${ethers.formatEther(amount)} ETH\nCalldata: ${calldata}`;

			return await this.createProposal(title, fullDescription);
		} catch (error) {
			console.error('Error proposing treasury action:', error);
			throw error;
		}
	}

	// ============================================================================
	// ADDITIONAL TOKEN FUNCTIONS
	// ============================================================================

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
			const contract = this.contract as unknown as ethers.Contract;

			const [name, symbol, decimalsResult, totalSupply] = await Promise.all([
				contract.getFunction('name')().catch(() => 'GNUS Token'),
				contract.getFunction('symbol')().catch(() => 'GNUS'),
				contract.getFunction('decimals')().catch(() => 18n),
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
	 * Transfer tokens to another address
	 */
	async transfer(to: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
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
	async approve(spender: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
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
		if (!this.contract) throw new Error('Service not initialized');

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
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contractSafe.burn(amount);
		} catch (error) {
			logger.error('Error burning tokens:', error as any);
			throw error;
		}
	}

	// ============================================================================
	// ADDITIONAL QUADRATIC VOTING FUNCTIONS
	// ============================================================================

	/**
	 * Calculate vote weight from token cost
	 */
	async calculateVoteWeight(tokensCost: bigint): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.calculateVoteWeight(tokensCost);
		} catch (error) {
			console.error('Error calculating vote weight:', error);
			return BigInt(Math.floor(Math.sqrt(Number(tokensCost))));
		}
	}

	/**
	 * Calculate maximum votes possible with given token balance
	 */
	async calculateMaxVotes(tokenBalance: bigint): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.calculateMaxVotes(tokenBalance);
		} catch (error) {
			console.error('Error calculating max votes:', error);
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
			return await this.contractSafe.getVoteEfficiency(votes, tokensCost);
		} catch (error) {
			console.error('Error getting vote efficiency:', error);
			if (tokensCost === 0n) return 0n;
			return (votes * 100n) / tokensCost;
		}
	}

	// ============================================================================
	// ADDITIONAL TREASURY FUNCTIONS
	// ============================================================================

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
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			return await this.contractSafe.depositToTreasury({ value });
		} catch (error) {
			logger.error('Error depositing to treasury:', error as any);
			throw error;
		}
	}

	// ============================================================================
	// ACCESS CONTROL FUNCTIONS
	// ============================================================================

	/**
	 * Check if an account has a specific role
	 */
	async hasRole(role: string, account: string): Promise<boolean> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.hasRole(role, account);
		} catch (error) {
			console.error('Error checking role:', error);
			return false;
		}
	}

	/**
	 * Grant a role to an account
	 */
	async grantRole(role: string, account: string): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			const tx = await this.contractSafe.grantRole(role, account);
			logger.info('Role granted:', { role, account, txHash: tx.hash });
			return tx;
		} catch (error) {
			logger.error('Failed to grant role:', { role, account, error: error as Error });
			throw error;
		}
	}

	/**
	 * Revoke a role from an account
	 */
	async revokeRole(role: string, account: string): Promise<ethers.ContractTransactionResponse> {
		if (!this.contract || !this.signer) {
			throw new Error('Service not initialized or no signer available');
		}

		try {
			const tx = await this.contractSafe.revokeRole(role, account);
			logger.info('Role revoked:', { role, account, txHash: tx.hash });
			return tx;
		} catch (error) {
			logger.error('Failed to revoke role:', { role, account, error: error as Error });
			throw error;
		}
	}

	// ============================================================================
	// ADDITIONAL GOVERNANCE FUNCTIONS
	// ============================================================================

	/**
	 * Get past voting power at a specific block
	 */
	async getPastVotingPower(account: string, blockNumber: bigint): Promise<bigint> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.getPastVotingPower(account, blockNumber);
		} catch (error) {
			console.error('Error getting past voting power:', error);
			return 0n;
		}
	}

	/**
	 * Get proposal status (basic info)
	 */
	async getProposalStatus(proposalId: bigint): Promise<any> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			return await this.contractSafe.getProposalStatus(proposalId);
		} catch (error) {
			console.error('Error getting proposal status:', error);
			return null;
		}
	}

	/**
	 * Check if the contract supports a specific interface
	 */
	async supportsInterface(interfaceId: string): Promise<boolean> {
		if (!this.contract) throw new Error('Service not initialized');

		try {
			const contract = this.contract as unknown as ethers.Contract;
			const result = await contract.getFunction('supportsInterface')(interfaceId);
			return result || false;
		} catch (error) {
			console.error('Error checking interface support:', error);
			return false;
		}
	}

	/**
	 * Legacy createProposal function for backward compatibility
	 */
	async createProposalLegacy(
		targets: string[],
		values: bigint[],
		calldatas: string[],
		description: string,
	): Promise<ethers.ContractTransactionResponse> {
		const lines = description.split('\n');
		const title = lines[0] || 'Untitled Proposal';
		const ipfsHash = `QmPlaceholder${Date.now()}`;

		return this.createProposal(title, ipfsHash);
	}
}

// Singleton instance
export const gnusDaoService = new GNUSDAOService();