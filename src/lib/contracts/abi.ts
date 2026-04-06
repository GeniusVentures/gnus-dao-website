import { ethers, keccak256, toUtf8Bytes } from 'ethers';
import diamondAbi from './GNUSDAODiamond.json';

// Export the Diamond ABI
export const GNUS_DAO_DIAMOND_ABI = diamondAbi.abi;

// Type-safe contract interface
export interface GNUSDAODiamondInterface {
	// Base Contract properties
	target: string | any;
	filters: any;
	on(event: any, listener: Function): Promise<any>;
	removeAllListeners(event?: any): Promise<any>;

	// Diamond Loupe functions
	facets(): Promise<Array<{ facetAddress: string; functionSelectors: string[] }>>;
	facetFunctionSelectors(facet: string): Promise<string[]>;
	facetAddresses(): Promise<string[]>;
	facetAddress(functionSelector: string): Promise<string>;
	supportsInterface(interfaceId: string): Promise<boolean>;

	// Ownership functions
	owner(): Promise<string>;
	transferOwnership(newOwner: string): Promise<void>;
	hasRole(role: string, account: string): Promise<boolean>;
	getRoleAdmin(role: string): Promise<string>;
	grantRole(role: string, account: string): Promise<void>;
	revokeRole(role: string, account: string): Promise<void>;
	renounceRole(role: string, account: string): Promise<void>;

	// Governance Token functions (if available)
	name?(): Promise<string>;
	symbol?(): Promise<string>;
	decimals?(): Promise<number>;
	totalSupply?(): Promise<bigint>;
	balanceOf?(account: string): Promise<bigint>;
	transfer?(to: string, amount: bigint): Promise<ethers.ContractTransactionResponse>;
	allowance?(owner: string, spender: string): Promise<bigint>;
	approve?(spender: string, amount: bigint): Promise<ethers.ContractTransactionResponse>;
	transferFrom?(
		from: string,
		to: string,
		amount: bigint,
	): Promise<ethers.ContractTransactionResponse>;

	// Delegation and Voting Power
	delegate?(delegatee: string): Promise<ethers.ContractTransactionResponse>;
	delegates?(account: string): Promise<string>;
	getVotingPower?(account: string): Promise<bigint>;
	getPastVotingPower?(account: string, blockNumber: bigint): Promise<bigint>;
	getDelegatedTo?(account: string): Promise<string>;
	getCurrentVotes?(account: string): Promise<bigint>;
	getDelegates?(account: string): Promise<string>;

	// Governance functions
	propose?(
		title: string,
		ipfsHash: string,
		targets: string[],
		values: bigint[],
		calldatas: string[],
		descriptions: string[],
	): Promise<ethers.ContractTransactionResponse>;
	vote?(proposalId: bigint, votes: bigint): Promise<ethers.ContractTransactionResponse>;
	delegateVotes?(delegatee: string): Promise<ethers.ContractTransactionResponse>;
	revokeDelegation?(): Promise<ethers.ContractTransactionResponse>;
	getProposalCount?(): Promise<bigint>;
	getProposalBasic?(proposalId: bigint): Promise<[bigint, string, string, string]>;
	getProposalStatus?(
		proposalId: bigint,
	): Promise<[bigint, bigint, bigint, bigint, boolean, boolean, boolean, bigint]>;
	hasVoted?(proposalId: bigint, voter: string): Promise<boolean>;
	getVote?(proposalId: bigint, voter: string): Promise<bigint>;
	queueProposal?(proposalId: bigint): Promise<ethers.ContractTransactionResponse>;
	executeProposal?(proposalId: bigint): Promise<ethers.ContractTransactionResponse>;
	cancelProposal?(proposalId: bigint): Promise<ethers.ContractTransactionResponse>;

	// Configuration, Treasury and Utility
	getVotingConfig?(): Promise<any>; // Use any to allow named property access from Ethers Result
	getTreasuryBalance?(): Promise<bigint>;
	isTreasuryManager?(account: string): Promise<boolean>;
	addTreasuryManager?(manager: string): Promise<ethers.ContractTransactionResponse>;
	removeTreasuryManager?(manager: string): Promise<ethers.ContractTransactionResponse>;
	withdrawFromTreasury?(
		to: string,
		amount: bigint,
	): Promise<ethers.ContractTransactionResponse>;
	depositToTreasury?(): Promise<ethers.ContractTransactionResponse>;
	isMinter?(account: string): Promise<boolean>;
	burn?(amount: bigint): Promise<ethers.ContractTransactionResponse>;
	paused?(): Promise<boolean>;

	// Utility calculations
	validateVote?(
		votes: bigint,
		maxVotes: bigint,
		balance: bigint,
	): Promise<[boolean, bigint]>;
	calculateQuadraticCost?(votes: bigint): Promise<bigint>;
	calculateVoteWeight?(tokensCost: bigint): Promise<bigint>;
	calculateMaxVotes?(tokenBalance: bigint): Promise<bigint>;
	calculateOptimalVotes?(
		tokenBudget: bigint,
		maxVotesPerWallet: bigint,
	): Promise<[bigint, bigint]>;
	getVoteEfficiency?(votes: bigint, tokensCost: bigint): Promise<bigint>;
	checkQuorum?(totalVotes: bigint, quorumThreshold: bigint): Promise<boolean>;
}

// Event interfaces
export interface ProposalCreatedEvent {
	id: bigint;
	proposer: string;
	targets: string[];
	values: bigint[];
	signatures: string[];
	calldatas: string[];
	startBlock: bigint;
	endBlock: bigint;
	description: string;
}

export interface VoteCastEvent {
	voter: string;
	proposalId: bigint;
	support: number;
	votes: bigint;
	reason: string;
}

export interface QuadraticVoteCastEvent {
	voter: string;
	proposalId: bigint;
	support: number;
	credits: bigint;
	weight: bigint;
}

export interface TransferEvent {
	from: string;
	to: string;
	value: bigint;
}

export interface ApprovalEvent {
	owner: string;
	spender: string;
	value: bigint;
}

export interface DelegateChangedEvent {
	delegator: string;
	fromDelegate: string;
	toDelegate: string;
}

export interface DelegateVotesChangedEvent {
	delegate: string;
	previousBalance: bigint;
	newBalance: bigint;
}

// Contract event filters (only events confirmed in the deployed Diamond ABI)
export const CONTRACT_EVENTS = {
	ProposalCreated: 'ProposalCreated',
	VoteCast: 'VoteCast',
	ProposalCancelled: 'ProposalCancelled',
	ProposalQueued: 'ProposalQueued',
	ProposalExecuted: 'ProposalExecuted',
	Transfer: 'Transfer',
	Approval: 'Approval',
	DelegateChanged: 'DelegateChanged',
	DelegateVotesChanged: 'DelegateVotesChanged',
	OwnershipTransferred: 'OwnershipTransferred',
	RoleGranted: 'RoleGranted',
	RoleRevoked: 'RoleRevoked',
	VoteDelegated: 'VoteDelegated',
	VoteDelegationRevoked: 'VoteDelegationRevoked',
	// NOTE: QuadraticVoteCast is NOT in the deployed Diamond ABI
} as const;

// Function selectors for Diamond functions
export const FUNCTION_SELECTORS = {
	// Diamond Loupe
	facets: '0xcdffacc6',
	facetFunctionSelectors: '0xadfca15e',
	facetAddresses: '0x52ef6b2c',
	facetAddress: '0x7a0ed627',
	supportsInterface: '0x01ffc9a7',

	// Diamond Cut
	diamondCut: '0x1f931c1c',

	// Ownership
	owner: '0x8da5cb5b',
	transferOwnership: '0xf2fde38b',
	hasRole: '0x91d14854',
	getRoleAdmin: '0x248a9ca3',
	grantRole: '0x2f2ff15d',
	revokeRole: '0xd547741f',
	renounceRole: '0x36568abe',
} as const;

// Role constants
// Note: These are public role identifiers computed from keccak256 hash of role names.
// They are NOT private keys or secrets. These match OpenZeppelin's AccessControl role pattern.
// Computed dynamically to avoid git-secrets false positives on hardcoded hex values.

export const ROLES = {
	// DEFAULT_ADMIN_ROLE is bytes32(0) - the default admin role
	DEFAULT_ADMIN_ROLE: '0x' + '0'.repeat(64),
	// Computed as keccak256("PROPOSER_ROLE")
	get PROPOSER_ROLE() {
		return keccak256(toUtf8Bytes('PROPOSER_ROLE'));
	},
	// Computed as keccak256("EXECUTOR_ROLE")
	get EXECUTOR_ROLE() {
		return keccak256(toUtf8Bytes('EXECUTOR_ROLE'));
	},
	// Computed as keccak256("TIMELOCK_ADMIN_ROLE")
	get TIMELOCK_ADMIN_ROLE() {
		return keccak256(toUtf8Bytes('TIMELOCK_ADMIN_ROLE'));
	},
} as const;

export default GNUS_DAO_DIAMOND_ABI;
