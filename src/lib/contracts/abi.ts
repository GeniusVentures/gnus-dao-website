import diamondAbi from './GNUSDAODiamond.json';

// Export the Diamond ABI
export const GNUS_DAO_DIAMOND_ABI = diamondAbi.abi;

// Type-safe contract interface
export interface GNUSDAODiamondInterface {
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
	transfer?(to: string, amount: bigint): Promise<boolean>;
	allowance?(owner: string, spender: string): Promise<bigint>;
	approve?(spender: string, amount: bigint): Promise<boolean>;
	transferFrom?(from: string, to: string, amount: bigint): Promise<boolean>;

	// Delegation functions (if available)
	delegate?(delegatee: string): Promise<void>;
	delegates?(account: string): Promise<string>;
	getCurrentVotes?(account: string): Promise<bigint>;
	getPriorVotes?(account: string, blockNumber: bigint): Promise<bigint>;

	// Governance functions (if available)
	propose?(
		targets: string[],
		values: bigint[],
		calldatas: string[],
		description: string,
	): Promise<bigint>;
	proposalCount?(): Promise<bigint>;
	proposals?(proposalId: bigint): Promise<{
		id: bigint;
		proposer: string;
		eta: bigint;
		startBlock: bigint;
		endBlock: bigint;
		forVotes: bigint;
		againstVotes: bigint;
		abstainVotes: bigint;
		canceled: boolean;
		executed: boolean;
	}>;
	state?(proposalId: bigint): Promise<number>;
	castVote?(proposalId: bigint, support: number): Promise<bigint>;
	castVoteWithReason?(proposalId: bigint, support: number, reason: string): Promise<bigint>;
	execute?(proposalId: bigint): Promise<void>;
	cancel?(proposalId: bigint): Promise<void>;

	// Quadratic Voting functions (if available)
	castQuadraticVote?(
		proposalId: bigint,
		support: number,
		voteCredits: bigint,
	): Promise<bigint>;
	getVoteCredits?(voter: string): Promise<bigint>;
	getQuadraticVoteWeight?(voteCredits: bigint): Promise<bigint>;

	// Treasury functions (if available)
	treasuryBalance?(): Promise<bigint>;
	treasuryTokenBalance?(token: string): Promise<bigint>;

	// Configuration functions (if available)
	votingDelay?(): Promise<bigint>;
	votingPeriod?(): Promise<bigint>;
	proposalThreshold?(): Promise<bigint>;
	quorumVotes?(): Promise<bigint>;
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

// Contract event filters
export const CONTRACT_EVENTS = {
	ProposalCreated: 'ProposalCreated',
	VoteCast: 'VoteCast',
	QuadraticVoteCast: 'QuadraticVoteCast',
	ProposalCanceled: 'ProposalCanceled',
	ProposalQueued: 'ProposalQueued',
	ProposalExecuted: 'ProposalExecuted',
	Transfer: 'Transfer',
	Approval: 'Approval',
	DelegateChanged: 'DelegateChanged',
	DelegateVotesChanged: 'DelegateVotesChanged',
	OwnershipTransferred: 'OwnershipTransferred',
	RoleGranted: 'RoleGranted',
	RoleRevoked: 'RoleRevoked',
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
import { keccak256, toUtf8Bytes } from 'ethers';

export const ROLES = {
	DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
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
