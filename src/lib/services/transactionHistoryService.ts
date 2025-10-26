import { ethers } from 'ethers';
import { gnusDaoService } from '../contracts/gnusDaoService';

export enum TransactionType {
	PROPOSAL_CREATED = 'Proposal Created',
	VOTE_CAST = 'Vote Cast',
	DELEGATION = 'Delegation',
	DELEGATION_REVOKED = 'Delegation Revoked',
	PROPOSAL_EXECUTED = 'Proposal Executed',
	PROPOSAL_CANCELLED = 'Proposal Cancelled',
	TOKEN_TRANSFER = 'Token Transfer',
}

export interface Transaction {
	id: string;
	type: TransactionType;
	timestamp: number;
	blockNumber: number;
	txHash: string;
	from: string;
	details: {
		proposalId?: bigint;
		proposalTitle?: string;
		votes?: bigint;
		tokensCost?: bigint;
		delegatee?: string;
		amount?: bigint;
		to?: string;
	};
}

export class TransactionHistoryService {
	private provider: ethers.Provider | null = null;
	private contract: ethers.Contract | null = null;

	async initialize(provider: ethers.Provider): Promise<void> {
		this.provider = provider;
		const contractAddress = gnusDaoService.getContractAddress();
		if (!contractAddress) {
			throw new Error('Contract not initialized');
		}

		// Create contract instance for event queries
		const abi = [
			'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, string ipfsHash, uint256 startTime, uint256 endTime)',
			'event VoteCast(uint256 indexed proposalId, address indexed voter, uint256 votes, uint256 tokensCost)',
			'event ProposalCancelled(uint256 indexed proposalId)',
			'event ProposalExecuted(uint256 indexed proposalId)',
			'event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)',
			'event Transfer(address indexed from, address indexed to, uint256 value)',
		];

		this.contract = new ethers.Contract(contractAddress, abi, provider);
	}

	/**
	 * Get all transactions for a specific address
	 */
	async getTransactionHistory(
		address: string,
		fromBlock: number = 0,
		toBlock: number | string = 'latest',
	): Promise<Transaction[]> {
		if (!this.contract || !this.provider) {
			throw new Error('Service not initialized');
		}

		const transactions: Transaction[] = [];

		try {
			// Fetch all relevant events in parallel
			const [
				proposalCreatedEvents,
				voteCastEvents,
				delegateChangedEvents,
				proposalExecutedEvents,
				proposalCancelledEvents,
				transferEvents,
			] = await Promise.all([
				this.getProposalCreatedEvents(address, fromBlock, toBlock),
				this.getVoteCastEvents(address, fromBlock, toBlock),
				this.getDelegateChangedEvents(address, fromBlock, toBlock),
				this.getProposalExecutedEvents(address, fromBlock, toBlock),
				this.getProposalCancelledEvents(address, fromBlock, toBlock),
				this.getTransferEvents(address, fromBlock, toBlock),
			]);

			transactions.push(
				...proposalCreatedEvents,
				...voteCastEvents,
				...delegateChangedEvents,
				...proposalExecutedEvents,
				...proposalCancelledEvents,
				...transferEvents,
			);

			// Sort by timestamp (most recent first)
			transactions.sort((a, b) => b.timestamp - a.timestamp);

			return transactions;
		} catch (error) {
			console.error('Error fetching transaction history:', error);
			return [];
		}
	}

	private async getProposalCreatedEvents(
		address: string,
		fromBlock: number,
		toBlock: number | string,
	): Promise<Transaction[]> {
		if (!this.contract || !this.provider) return [];

		try {
			const filter = this.contract.filters.ProposalCreated(null, address);
			const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

			const transactions: Transaction[] = [];
			for (const event of events) {
				const block = await event.getBlock();
				const args = event.args as any;

				transactions.push({
					id: `${event.transactionHash}-${event.index}`,
					type: TransactionType.PROPOSAL_CREATED,
					timestamp: block.timestamp,
					blockNumber: event.blockNumber,
					txHash: event.transactionHash,
					from: address,
					details: {
						proposalId: args.proposalId,
						proposalTitle: args.title,
					},
				});
			}

			return transactions;
		} catch (error) {
			console.error('Error fetching ProposalCreated events:', error);
			return [];
		}
	}

	private async getVoteCastEvents(
		address: string,
		fromBlock: number,
		toBlock: number | string,
	): Promise<Transaction[]> {
		if (!this.contract || !this.provider) return [];

		try {
			const filter = this.contract.filters.VoteCast(null, address);
			const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

			const transactions: Transaction[] = [];
			for (const event of events) {
				const block = await event.getBlock();
				const args = event.args as any;

				// Try to get proposal title
				let proposalTitle = 'Unknown Proposal';
				try {
					const proposal = await gnusDaoService.getProposal(args.proposalId);
					if (proposal) {
						proposalTitle = proposal.title;
					}
				} catch (e) {
					// Ignore errors fetching proposal details
				}

				transactions.push({
					id: `${event.transactionHash}-${event.index}`,
					type: TransactionType.VOTE_CAST,
					timestamp: block.timestamp,
					blockNumber: event.blockNumber,
					txHash: event.transactionHash,
					from: address,
					details: {
						proposalId: args.proposalId,
						proposalTitle,
						votes: args.votes,
						tokensCost: args.tokensCost,
					},
				});
			}

			return transactions;
		} catch (error) {
			console.error('Error fetching VoteCast events:', error);
			return [];
		}
	}

	private async getDelegateChangedEvents(
		address: string,
		fromBlock: number,
		toBlock: number | string,
	): Promise<Transaction[]> {
		if (!this.contract || !this.provider) return [];

		try {
			const filter = this.contract.filters.DelegateChanged(address);
			const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

			const transactions: Transaction[] = [];
			for (const event of events) {
				const block = await event.getBlock();
				const args = event.args as any;

				const isRevocation = args.toDelegate === ethers.ZeroAddress;

				transactions.push({
					id: `${event.transactionHash}-${event.index}`,
					type: isRevocation
						? TransactionType.DELEGATION_REVOKED
						: TransactionType.DELEGATION,
					timestamp: block.timestamp,
					blockNumber: event.blockNumber,
					txHash: event.transactionHash,
					from: address,
					details: {
						delegatee: args.toDelegate,
					},
				});
			}

			return transactions;
		} catch (error) {
			console.error('Error fetching DelegateChanged events:', error);
			return [];
		}
	}

	private async getProposalExecutedEvents(
		address: string,
		fromBlock: number,
		toBlock: number | string,
	): Promise<Transaction[]> {
		if (!this.contract || !this.provider) return [];

		try {
			// Get all executed events, then filter by proposer
			const filter = this.contract.filters.ProposalExecuted();
			const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

			const transactions: Transaction[] = [];
			for (const event of events) {
				const args = event.args as any;

				// Check if this user created the proposal
				const proposal = await gnusDaoService.getProposal(args.proposalId);
				if (proposal && proposal.proposer.toLowerCase() === address.toLowerCase()) {
					const block = await event.getBlock();

					transactions.push({
						id: `${event.transactionHash}-${event.index}`,
						type: TransactionType.PROPOSAL_EXECUTED,
						timestamp: block.timestamp,
						blockNumber: event.blockNumber,
						txHash: event.transactionHash,
						from: address,
						details: {
							proposalId: args.proposalId,
							proposalTitle: proposal.title,
						},
					});
				}
			}

			return transactions;
		} catch (error) {
			console.error('Error fetching ProposalExecuted events:', error);
			return [];
		}
	}

	private async getProposalCancelledEvents(
		address: string,
		fromBlock: number,
		toBlock: number | string,
	): Promise<Transaction[]> {
		if (!this.contract || !this.provider) return [];

		try {
			const filter = this.contract.filters.ProposalCancelled();
			const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

			const transactions: Transaction[] = [];
			for (const event of events) {
				const args = event.args as any;

				const proposal = await gnusDaoService.getProposal(args.proposalId);
				if (proposal && proposal.proposer.toLowerCase() === address.toLowerCase()) {
					const block = await event.getBlock();

					transactions.push({
						id: `${event.transactionHash}-${event.index}`,
						type: TransactionType.PROPOSAL_CANCELLED,
						timestamp: block.timestamp,
						blockNumber: event.blockNumber,
						txHash: event.transactionHash,
						from: address,
						details: {
							proposalId: args.proposalId,
							proposalTitle: proposal.title,
						},
					});
				}
			}

			return transactions;
		} catch (error) {
			console.error('Error fetching ProposalCancelled events:', error);
			return [];
		}
	}

	private async getTransferEvents(
		address: string,
		fromBlock: number,
		toBlock: number | string,
	): Promise<Transaction[]> {
		if (!this.contract || !this.provider) return [];

		try {
			// Get both sent and received transfers
			const [sentFilter, receivedFilter] = [
				this.contract.filters.Transfer(address, null),
				this.contract.filters.Transfer(null, address),
			];

			const [sentEvents, receivedEvents] = await Promise.all([
				this.contract.queryFilter(sentFilter, fromBlock, toBlock),
				this.contract.queryFilter(receivedFilter, fromBlock, toBlock),
			]);

			const transactions: Transaction[] = [];

			for (const event of [...sentEvents, ...receivedEvents]) {
				const block = await event.getBlock();
				const args = event.args as any;

				transactions.push({
					id: `${event.transactionHash}-${event.index}`,
					type: TransactionType.TOKEN_TRANSFER,
					timestamp: block.timestamp,
					blockNumber: event.blockNumber,
					txHash: event.transactionHash,
					from: args.from,
					details: {
						to: args.to,
						amount: args.value,
					},
				});
			}

			return transactions;
		} catch (error) {
			console.error('Error fetching Transfer events:', error);
			return [];
		}
	}
}

export const transactionHistoryService = new TransactionHistoryService();
