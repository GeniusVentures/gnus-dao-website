# Roles & Access Control

This document covers all roles in the GNUS DAO diamond contract, what each one controls, and how to assign them.

## Contract Address

```
0x84Ba28d277ded98b3488C906E90B6435B116D5b4
```

---

## Role Overview

| Role | Type | Assigned At Deploy | Grantable Via |
|---|---|---|---|
| Diamond Owner | LibDiamond ownership | Deployer | `transferOwnership()` |
| `DEFAULT_ADMIN_ROLE` | AccessControl | Deployer | `grantRole()` by admin |
| `UPGRADER_ROLE` | AccessControl | Deployer | `grantRole()` by admin |
| Treasury Manager | GovernanceFacet mapping | Nobody (manual) | `addTreasuryManager()` by owner |

---

## Role Details

### Diamond Owner
- Stored in `LibDiamond` storage, not AccessControl
- Required to call `addTreasuryManager`, `removeTreasuryManager`, `transferOwnership`
- The `onlySuperAdminRole` modifier checks this
- Only one address can hold this at a time
- Transferring ownership **revokes it from the previous holder**

### DEFAULT_ADMIN_ROLE
- `bytes32(0)` — OpenZeppelin's top-level AccessControl role
- Can call `grantRole` and `revokeRole` for any role
- Protected: cannot be renounced or revoked from the Diamond Owner (`safeRenounceRole` / `safeRevokeRole` will revert)
- Deployer receives this during `diamondInitialize000`

### UPGRADER_ROLE
- `keccak256("UPGRADER_ROLE")`
- Required for diamond facet upgrades
- Deployer receives this during `diamondInitialize000`
- Transferred automatically when `transferOwnership` is called

### Treasury Manager
- Stored as `mapping(address => bool)` in `GovernanceStorage`, not AccessControl
- Required to call `withdrawFromTreasury`
- Diamond Owner also passes the `onlyTreasuryManager` check implicitly
- Assignable from the **Role Manager UI** in the Governance page

---

## Deployer Roles (at launch)

After `diamondInitialize000` runs, the deployer holds:

- Diamond Owner
- `DEFAULT_ADMIN_ROLE`
- `UPGRADER_ROLE`
- Initial token mint (10% of max supply, auto-delegated for voting)

---

## Assigning Roles to Another Address

### Option A — Shared access (both addresses retain access)

```ts
// Via ethers.js or Hardhat script
const diamond = await ethers.getContractAt("GNUSDAOAccessControlFacet", DIAMOND);

await diamond.grantRole(ethers.ZeroHash, targetAddress);       // DEFAULT_ADMIN_ROLE
await diamond.grantRole(ethers.id("UPGRADER_ROLE"), targetAddress); // UPGRADER_ROLE

// Treasury Manager — requires Diamond Owner
const governance = await ethers.getContractAt("GNUSDAOGovernanceFacet", DIAMOND);
await governance.addTreasuryManager(targetAddress);
```

### Option B — Full ownership transfer

This removes Diamond Owner (and UPGRADER_ROLE + DEFAULT_ADMIN_ROLE) from the current holder:

```ts
const ownership = await ethers.getContractAt("GNUSDAOOwnershipFacet", DIAMOND);
await ownership.transferOwnership(targetAddress);
```

---

## Role Manager UI

The Governance page includes a Role Manager panel (admin only) that currently supports:

- Viewing current Treasury Managers and Owner
- Adding / removing Treasury Managers

`DEFAULT_ADMIN_ROLE` and `UPGRADER_ROLE` must be managed via contract calls directly (Etherscan write tab or a script).

---

## Access Matrix

| Action | Diamond Owner | DEFAULT_ADMIN_ROLE | UPGRADER_ROLE | Treasury Manager |
|---|:---:|:---:|:---:|:---:|
| Upgrade facets | ✅ | ❌ | ✅ | ❌ |
| Grant / revoke roles | ✅ | ✅ | ❌ | ❌ |
| Add treasury manager | ✅ | ❌ | ❌ | ❌ |
| Withdraw from treasury | ✅ | ❌ | ❌ | ✅ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ |
| Mint tokens | ✅ | ✅ | ❌ | ❌ |
| Pause token transfers | ✅ | ✅ | ❌ | ❌ |
| Create proposals | any token holder above threshold | | | |
| Vote on proposals | any token holder | | | |
