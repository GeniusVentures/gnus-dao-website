/**
 * Critical tests for GNUS DAO contract configuration
 */
import {
	GNUS_DAO_CONTRACTS,
	GNUS_DAO_CORE_ABI,
	GOVERNANCE_TOKEN_ABI,
	PROPOSAL_ABI,
	TREASURY_ABI,
} from '@/lib/contracts/gnusDao';

describe('GNUS DAO Contract Configuration', () => {
	describe('Contract Addresses', () => {
		it('should have contract addresses for supported networks', () => {
			expect(GNUS_DAO_CONTRACTS).toBeDefined();
			expect(Object.keys(GNUS_DAO_CONTRACTS).length).toBeGreaterThan(0);
		});

		it('should have Sepolia testnet configuration', () => {
			const sepolia = GNUS_DAO_CONTRACTS[11155111];
			expect(sepolia).toBeDefined();
			expect(sepolia.diamond).toBeTruthy();
			expect(sepolia.diamond).toMatch(/^0x[a-fA-F0-9]{40}$/);
		});

		it('should have Base mainnet configuration', () => {
			const base = GNUS_DAO_CONTRACTS[8453];
			expect(base).toBeDefined();
			expect(base.diamond).toBeDefined();
		});

		it('should have Polygon configuration', () => {
			const polygon = GNUS_DAO_CONTRACTS[137];
			expect(polygon).toBeDefined();
			expect(polygon.diamond).toBeDefined();
		});

		it('should have Ethereum mainnet configuration', () => {
			const ethereum = GNUS_DAO_CONTRACTS[1];
			expect(ethereum).toBeDefined();
			expect(ethereum.diamond).toBeDefined();
		});

		it('should have SKALE Europa Hub configuration', () => {
			const skale = GNUS_DAO_CONTRACTS[2046399126];
			expect(skale).toBeDefined();
			expect(skale.diamond).toBeDefined();
		});

		it('should have deployer addresses', () => {
			Object.values(GNUS_DAO_CONTRACTS).forEach((config) => {
				expect(config.deployer).toBeDefined();
				expect(config.deployer).toMatch(/^0x[a-fA-F0-9]{40}$/);
			});
		});

		it('should have valid Ethereum addresses', () => {
			Object.values(GNUS_DAO_CONTRACTS).forEach((config) => {
				expect(config.diamond).toMatch(/^0x[a-fA-F0-9]{40}$/);
			});
		});
	});

	describe('Core ABI', () => {
		it('should have Diamond Loupe functions', () => {
			const loupeFunctions = GNUS_DAO_CORE_ABI.filter(
				(item) =>
					item.includes('facets') ||
					item.includes('facetAddress') ||
					item.includes('facetFunctionSelectors'),
			);
			expect(loupeFunctions.length).toBeGreaterThan(0);
		});

		it('should have ownership functions', () => {
			const ownershipFunctions = GNUS_DAO_CORE_ABI.filter(
				(item) => item.includes('owner') || item.includes('transferOwnership'),
			);
			expect(ownershipFunctions.length).toBeGreaterThan(0);
		});

		it('should have role-based access control functions', () => {
			const rbacFunctions = GNUS_DAO_CORE_ABI.filter(
				(item) =>
					item.includes('hasRole') ||
					item.includes('grantRole') ||
					item.includes('revokeRole'),
			);
			expect(rbacFunctions.length).toBeGreaterThan(0);
		});

		it('should have Diamond Cut function', () => {
			const diamondCut = GNUS_DAO_CORE_ABI.find((item) => item.includes('diamondCut'));
			expect(diamondCut).toBeDefined();
		});

		it('should have events defined', () => {
			const events = GNUS_DAO_CORE_ABI.filter((item) => item.includes('event'));
			expect(events.length).toBeGreaterThan(0);
		});
	});

	describe('Governance Token ABI', () => {
		it('should have ERC20 standard functions', () => {
			const erc20Functions = [
				'name',
				'symbol',
				'decimals',
				'totalSupply',
				'balanceOf',
				'transfer',
			];
			erc20Functions.forEach((func) => {
				const found = GOVERNANCE_TOKEN_ABI.find((item) => item.includes(func));
				expect(found).toBeDefined();
			});
		});

		it('should have delegation functions', () => {
			const delegateFn = GOVERNANCE_TOKEN_ABI.find((item) => item.includes('delegate('));
			const delegatesFn = GOVERNANCE_TOKEN_ABI.find((item) => item.includes('delegates('));
			expect(delegateFn).toBeDefined();
			expect(delegatesFn).toBeDefined();
		});

		it('should have voting power functions', () => {
			const getCurrentVotes = GOVERNANCE_TOKEN_ABI.find((item) =>
				item.includes('getCurrentVotes'),
			);
			const getPriorVotes = GOVERNANCE_TOKEN_ABI.find((item) =>
				item.includes('getPriorVotes'),
			);
			expect(getCurrentVotes).toBeDefined();
			expect(getPriorVotes).toBeDefined();
		});

		it('should have approval functions', () => {
			const approve = GOVERNANCE_TOKEN_ABI.find((item) => item.includes('approve'));
			const allowance = GOVERNANCE_TOKEN_ABI.find((item) => item.includes('allowance'));
			expect(approve).toBeDefined();
			expect(allowance).toBeDefined();
		});
	});

	describe('Proposal ABI', () => {
		it('should have proposal creation function', () => {
			const createProposal = PROPOSAL_ABI.find((item) => item.includes('createProposal'));
			expect(createProposal).toBeDefined();
		});

		it('should have voting functions', () => {
			const castVote = PROPOSAL_ABI.find((item) => item.includes('castVote'));
			expect(castVote).toBeDefined();
		});

		it('should have proposal state functions', () => {
			const getProposal = PROPOSAL_ABI.find(
				(item) => item.includes('getProposal') || item.includes('proposals'),
			);
			expect(getProposal).toBeDefined();
		});

		it('should have execution functions', () => {
			const execute = PROPOSAL_ABI.find((item) => item.includes('execute'));
			expect(execute).toBeDefined();
		});
	});

	describe('Treasury ABI', () => {
		it('should have treasury balance functions', () => {
			const getBalance = TREASURY_ABI.find(
				(item) => item.includes('balance') || item.includes('getBalance'),
			);
			expect(getBalance).toBeDefined();
		});

		it('should have withdrawal/transfer functions', () => {
			const transfer = TREASURY_ABI.find(
				(item) =>
					item.includes('transfer') ||
					item.includes('withdraw') ||
					item.includes('execute'),
			);
			expect(transfer).toBeDefined();
		});
	});
});
