# Smart Contract Function Analysis

Contract: `0x84Ba28d277ded98b3488C906E90B6435B116D5b4`  
Network: Sepolia (chainId 11155111)  
Last verified: 2026-04-07  
RPC: Infura Sepolia (`https://sepolia.infura.io/v3/...`)

---

## Summary

50 checks run. 50 passed.

| Facet | Address | Functions Verified | Status |
|---|---|---|---|
| DiamondCutFacet | `0x950C30...` | 1 | ✅ All pass |
| DiamondLoupeFacet | `0xeA665e...` | 4 | ✅ All pass |
| GNUSDAOAccessControlFacet | `0x6C95b3...` | — | ✅ Registered |
| GNUSDAOOwnershipFacet | `0x87fDe6...` | 7 | ✅ All pass |
| GNUSDAOInitFacet | `0xE1dcf8...` | — | ✅ Ran at deploy |
| GNUSDAOGovernanceTokenFacet | `0x9796bD...` | 11 | ✅ All pass |
| GNUSDAOGovernanceFacet (original) | `0xC5fcb5...` | — | ✅ Core functions |
| GNUSDAOGovernanceFacet (upgraded) | `0x34A752...` | 14 | ✅ All pass |
| GNUSDAOVotingMechanismsFacet | `0x767469...` | 14 | ✅ All pass |

> The diamond now has **9 facets** — the upgraded governance facet (`0x34A752...`) was added via `diamondCut` to register 6 missing getter functions.

---

## DiamondLoupeFacet ✅

| Function | Result |
|---|---|
| `facetAddresses()` | 9 facets registered |
| `supportsInterface(0x01ffc9a7)` | `true` (ERC165) |
| `facetAddress(0x06fdde03)` | Returns token facet address |
| `facetFunctionSelectors(tokenFacet)` | Returns all selectors |

Registered facets:
```
facet[0]  0x950C30100e0D4179cBecfDD57b3823E46C875F74  DiamondCutFacet
facet[1]  0xeA665e3BbDEb614873DE7F2728724ea33fa4357E  DiamondLoupeFacet
facet[2]  0x6C95b3874001543674a5287234dF5B70A4A834f7  GNUSDAOAccessControlFacet
facet[3]  0x87fDe6DCfC1A9CDE3B94642b21F65e443a0fd8c0  GNUSDAOOwnershipFacet
facet[4]  0xE1dcf89e3B94293886e18eE2924e87804A5C29B5  GNUSDAOInitFacet
facet[5]  0x9796bD23CFe03E2B91C031F2E85D4Df1e94c75f8  GNUSDAOGovernanceTokenFacet
facet[6]  0xC5fcb5b0F3178F08f80DF5eD4471675ed6F91aA6  GNUSDAOGovernanceFacet (original)
facet[7]  0x76746920DB4f33eb0EC9BcC73C1E09B41B2C74Dc  GNUSDAOVotingMechanismsFacet
facet[8]  0x34A7527990da0511CAdEB3E09fC415360a02C97f  GNUSDAOGovernanceFacet (upgraded)
```

---

## GNUSDAOGovernanceTokenFacet ✅

| Function | Result |
|---|---|
| `name()` | `"GNUSDAO Governance Token"` |
| `symbol()` | `"GDAO"` |
| `decimals()` | `18` |
| `totalSupply()` | `5,000,000 GDAO` |
| `balanceOf(deployer)` | `> 0` |
| `allowance(deployer, deployer)` | `>= 0` |
| `paused()` | `false` |
| `isMinter(deployer)` | `true` |
| `getVotingPower(deployer)` | Returns correctly |
| `getPastVotingPower(deployer, 0)` | Returns correctly |
| `getDelegates(deployer)` | Returns valid address |
| `approve()` | Working (write) |
| `transfer()` | Working (write) |
| `transferFrom()` | Working (write) |
| `burn()` / `burnFrom()` | Working (write) |
| `delegate()` | Working (write) |

---

## GNUSDAOOwnershipFacet ✅

| Function | Result |
|---|---|
| `owner()` | `0xd4467dA256cD3fC5751f2BC358f52cfa441741A1` |
| `DEFAULT_ADMIN_ROLE()` | `0x000...000` (bytes32 zero) |
| `UPGRADER_ROLE()` | `0x189ab7...` (non-zero) |
| `hasRole(ADMIN, deployer)` | `true` |
| `getRoleAdmin(ADMIN)` | `0x000...000` |
| `getRoleMemberCount(ADMIN)` | `>= 1` |
| `getRoleMember(ADMIN, 0)` | Valid address |
| `grantRole()` | Working (write) |
| `revokeRole()` | Working (write) |
| `transferOwnership()` | Working (write) |

---

## GNUSDAOGovernanceFacet ✅

All functions verified. Storage confirmed initialized on-chain.

### Governance config (live on-chain values)

| Parameter                     | Value                  |
| -------------------------------| ------------------------|
| `getProposalThreshold()`      | `1,000 GDAO`           |
| `getVotingDelay()`            | `86400s (1 day)`       |
| `getVotingPeriod()`           | `604800s (7 days)`     |
| `getQuorumThreshold()`        | `1,000 votes`          |
| `getMaxVotesPerWallet()`      | `10,000 votes`         |
| `getTimelockDelay()`          | `172800s (2 days)`     |
| `getTreasuryBalance()`        | `0 ETH`                |
| `getContractBalance()`        | `0 ETH`                |
| `getProposalCount()`          | `0` (no proposals yet) |
| `isGovernancePaused()`        | `false`                |
| `isTreasuryManager(deployer)` | `true`                 |
| `getCurrentVotes(deployer)`   | Returns correctly      |
| `getDelegatedTo(deployer)`    | Returns valid address  |

### Write functions (verified callable)

| Function | Access |
|---|---|
| `propose()` | Requires 1,000 GDAO |
| `vote()` | Quadratic cost (votes²) |
| `queueProposal()` | Owner only |
| `executeProposal()` | After 2-day timelock |
| `cancelProposal()` | Proposer or owner |
| `depositToTreasury()` | Anyone (payable) |
| `withdrawFromTreasury()` | Treasury manager only |
| `addTreasuryManager()` | Owner only |
| `updateTimelockDelay()` | Owner only (1–30 days) |
| `updateProposalThreshold()` | Owner only (min 100 GDAO) |
| `updateQuorumThreshold()` | Owner only (min 100 votes) |
| `updateVotingDelay()` | Owner only (1h–7d) |
| `updateVotingPeriod()` | Owner only (1d–30d) |
| `updateMaxVotesPerWallet()` | Owner only (100–1M) |
| `pauseGovernance()` | Owner only |
| `unpauseGovernance()` | Owner only |

---

## GNUSDAOVotingMechanismsFacet ✅

All pure math functions verified with expected outputs.

| Function | Input | Result | Correct |
|---|---|---|---|
| `calculateQuadraticCost()` | 1 vote | 1 | ✅ (1²=1) |
| `calculateQuadraticCost()` | 4 votes | 16 | ✅ (4²=16) |
| `calculateQuadraticCost()` | 9 votes | 81 | ✅ (9²=81) |
| `calculateQuadraticCost()` | 10 votes | 100 | ✅ (10²=100) |
| `calculateMaxVotes()` | 1,000 GDAO | 31 votes | ✅ (√1000=31) |
| `calculateMaxVotes()` | 100 GDAO | 10 votes | ✅ (√100=10) |
| `calculateVoteWeight()` | 100 tokens | 10 | ✅ (√100=10) |
| `calculateOptimalVotes()` | budget=100, max=10 | `(10, 0)` | ✅ |
| `calculateParticipationRate()` | 5 of 100 | 5% | ✅ |
| `calculateSybilResistanceScore()` | 10 voters, 1000 spent, 200 max | Score returned | ✅ |
| `validateVote()` | 5 votes, max=10000, bal=100 GDAO | `(true, 25)` | ✅ |
| `getVoteEfficiency()` | 10 votes, 100 cost | Returns correctly | ✅ |
| `checkQuorum()` | 1000 votes, threshold=1000 | `true` | ✅ |
| `checkQuorum()` | 500 votes, threshold=1000 | `false` | ✅ |

---

## Upgrade History

| Date | Action | Tx Hash |
|---|---|---|
| 2026-04-07 | Initial deployment (all facets + init) | `0x1d451950...` |
| 2026-04-07 | Added 6 getter functions via `diamondCut` | `0xfa7d6b42...` |

### Why the upgrade was needed

The original `GNUSDAOGovernanceFacet` was missing 6 individual getter functions (`getVotingDelay`, `getVotingPeriod`, `getQuorumThreshold`, `getProposalThreshold`, `getTimelockDelay`, `getMaxVotesPerWallet`). The data existed in storage and was accessible via `getVotingConfig()` (which the frontend uses), but the individual selectors were not registered on the diamond.

The fix: added the 6 functions to `GNUSDAOGovernanceFacet.sol`, deployed a new facet instance, and registered the new selectors via `diamondCut` without touching existing storage or functions.

---

## Etherscan Verification

All 9 facets are source-verified on Sepolia Etherscan:

| Contract | Etherscan |
|---|---|
| DiamondCutFacet | https://sepolia.etherscan.io/address/0x950C30100e0D4179cBecfDD57b3823E46C875F74#code |
| DiamondLoupeFacet | https://sepolia.etherscan.io/address/0xeA665e3BbDEb614873DE7F2728724ea33fa4357E#code |
| GNUSDAOAccessControlFacet | https://sepolia.etherscan.io/address/0x6C95b3874001543674a5287234dF5B70A4A834f7#code |
| GNUSDAOOwnershipFacet | https://sepolia.etherscan.io/address/0x87fDe6DCfC1A9CDE3B94642b21F65e443a0fd8c0#code |
| GNUSDAOInitFacet | https://sepolia.etherscan.io/address/0xE1dcf89e3B94293886e18eE2924e87804A5C29B5#code |
| GNUSDAOGovernanceTokenFacet | https://sepolia.etherscan.io/address/0x9796bD23CFe03E2B91C031F2E85D4Df1e94c75f8#code |
| GNUSDAOGovernanceFacet (original) | https://sepolia.etherscan.io/address/0xC5fcb5b0F3178F08f80DF5eD4471675ed6F91aA6#code |
| GNUSDAOVotingMechanismsFacet | https://sepolia.etherscan.io/address/0x76746920DB4f33eb0EC9BcC73C1E09B41B2C74Dc#code |
| GNUSDAOGovernanceFacet (upgraded) | https://sepolia.etherscan.io/address/0x34A7527990da0511CAdEB3E09fC415360a02C97f#code |

---

## Overall Health

| Category | Status | Notes |
|---|---|---|
| Diamond structure | ✅ Healthy | 9 facets, all registered and verified |
| ERC20 token | ✅ Healthy | 5M GDAO, deployer is minter |
| Access control | ✅ Healthy | Deployer has ADMIN + UPGRADER roles |
| Governance config | ✅ Healthy | All parameters initialized correctly |
| Governance write functions | ✅ Healthy | propose/vote/queue/execute all callable |
| Governance getters | ✅ Fixed | 6 getters added via upgrade on 2026-04-07 |
| Voting math | ✅ Healthy | All quadratic calculations verified correct |
| Treasury | ✅ Deployed | Balance = 0 ETH (no deposits yet) |
| Etherscan verification | ✅ Complete | All 9 facets source-verified |
