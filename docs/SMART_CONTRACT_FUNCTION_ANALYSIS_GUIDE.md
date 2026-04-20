# How to Analyse Smart Contract Functions

A step-by-step guide to manually testing deployed smart contract functions — no frontend needed.

---

## Tools You Need

| Tool | Purpose |
|---|---|
| `curl` or Python | Send raw RPC calls |
| `cast` (Foundry) | Human-friendly contract calls |
| Hardhat console | Interactive JS/TS calls |
| Etherscan | Quick read-only checks via UI |

---

## 1. Understand the Contract Structure

For a Diamond proxy, start by finding all deployed facets:

```bash
# Get all facet addresses
curl -s -X POST https://sepolia.drpc.org \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{"to":"CONTRACT_ADDRESS","data":"0x52ef6b2c"},"latest"],
    "id":1
  }'
```

`0x52ef6b2c` is the selector for `facetAddresses()` — always the first thing to call on a Diamond.

Or use the deployment JSON:
```bash
cat diamonds/GNUSDAODiamond/deployments/gnusdaodiamond-sepolia-11155111.json
```

---

## 2. Get Function Selectors

Every Solidity function has a 4-byte selector = `keccak256("functionName(paramTypes)")[:4]`

### Option A — from the ABI file
```bash
# List all function names and selectors from the generated ABI
cat diamond-abi/GNUSDAODiamond.json | python3 -c "
import json,sys,hashlib
abi = json.load(sys.stdin)['abi']
for item in abi:
    if item['type'] == 'function':
        inputs = ','.join(i['type'] for i in item['inputs'])
        sig = f\"{item['name']}({inputs})\"
        sel = '0x' + hashlib.sha3_256(sig.encode()).hexdigest()[:8]
        print(f'{sel}  {sig}')
"
```

### Option B — using cast (Foundry)
```bash
cast sig "balanceOf(address)"
# → 0x70a08231

cast sig "getProposalCount()"
# → 0x0d61b519
```

### Option C — using ethers.js
```js
const { ethers } = require("ethers");
ethers.id("balanceOf(address)").slice(0, 10);
// → '0x70a08231'
```

---

## 3. Call Read-Only Functions (eth_call)

`eth_call` never costs gas and never changes state — safe to call anytime.

### Basic pattern
```bash
DIAMOND="0x84Ba28d277ded98b3488C906E90B6435B116D5b4"
RPC="https://sepolia.drpc.org"

curl -s -X POST "$RPC" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0" \
  -d "{
    \"jsonrpc\":\"2.0\",
    \"method\":\"eth_call\",
    \"params\":[{\"to\":\"$DIAMOND\",\"data\":\"SELECTOR_HERE\"},\"latest\"],
    \"id\":1
  }"
```

### With a caller address (for owner-gated views)
```bash
-d "{
  \"jsonrpc\":\"2.0\",
  \"method\":\"eth_call\",
  \"params\":[{
    \"to\":\"$DIAMOND\",
    \"from\":\"0xd4467dA256cD3fC5751f2BC358f52cfa441741A1\",
    \"data\":\"SELECTOR_HERE\"
  },\"latest\"],
  \"id\":1
}"
```

### With encoded parameters

Parameters are ABI-encoded and appended after the 4-byte selector.

For `address` param (32 bytes, left-padded):
```
selector + 000000000000000000000000 + address_without_0x
```

Example — `balanceOf(0xd4467dA...)`:
```bash
DATA="0x70a08231000000000000000000000000d4467da256cd3fc5751f2bc358f52cfa441741a1"
```

For `uint256` param (32 bytes, hex):
```
selector + value_as_32_byte_hex
```

Example — `calculateQuadraticCost(4)`:
```bash
DATA="0xf103dca00000000000000000000000000000000000000000000000000000000000000004"
```

---

## 4. Decode the Response

Raw responses are hex-encoded ABI data.

### uint256
```python
int("0x0000000000000000000000000000000000000000000000000000000000000012", 16)
# → 18
```

### string
```python
h = "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000018474e555344414f20476f7665726e616e636520546f6b656e0000000000000000"
b = bytes.fromhex(h[2:])
length = int.from_bytes(b[32:64], 'big')
print(b[64:64+length].decode())
# → GNUSDAO Governance Token
```

### bool
```python
bool(int("0x0000000000000000000000000000000000000000000000000000000000000001", 16))
# → True
```

### address
```python
"0x" + "0x000000000000000000000000d4467da256cd3fc5751f2bc358f52cfa441741a1"[-40:]
# → 0xd4467da256cd3fc5751f2bc358f52cfa441741a1
```

---

## 5. Batch Analysis Script (Python)

Use this template to test all functions at once:

```python
import urllib.request, json

DIAMOND = "0x84Ba28d277ded98b3488C906E90B6435B116D5b4"
RPC     = "https://sepolia.drpc.org"

def call(label, data, from_addr=None):
    params = {"to": DIAMOND, "data": data}
    if from_addr:
        params["from"] = from_addr
    payload = json.dumps({
        "jsonrpc": "2.0", "method": "eth_call",
        "params": [params, "latest"], "id": 1
    }).encode()
    req = urllib.request.Request(RPC, data=payload, headers={
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            res = json.loads(r.read())
            if "result" in res:
                return "✅", res["result"]
            return "❌", res.get("error", {}).get("message", "unknown error")
    except Exception as e:
        return "❌", str(e)

def uint(h):
    try: return int(h, 16)
    except: return h

def str_val(h):
    try:
        b = bytes.fromhex(h[2:])
        length = int.from_bytes(b[32:64], 'big')
        return b[64:64+length].decode()
    except: return h

def addr(h):
    try: return "0x" + h[-40:]
    except: return h

def boolean(h):
    try: return bool(int(h, 16))
    except: return h

# Define your checks: (label, selector+params, decoder_fn)
checks = [
    ("name()",          "0x06fdde03", str_val),
    ("symbol()",        "0x95d89b41", str_val),
    ("decimals()",      "0x313ce567", uint),
    ("totalSupply()",   "0x18160ddd", uint),
    ("owner()",         "0x8da5cb5b", addr),
    ("paused()",        "0x5c975abb", boolean),
    ("getProposalCount()", "0x0d61b519", uint),
    ("getVotingPeriod()",  "0x63d61a19", uint),
]

print(f"\n{'='*55}")
print(f"  Contract: {DIAMOND}")
print(f"{'='*55}")

for label, selector, decoder in checks:
    status, raw = call(label, selector)
    decoded = decoder(raw) if status == "✅" else raw
    print(f"  {status} {label:<30} → {decoded}")
```

Run it:
```bash
python3 contract-check.py
```

---

## 6. Using Hardhat Console

For a more interactive approach with full ABI support:

```bash
npx hardhat console --network sepolia
```

```js
// Attach to the diamond with a specific facet ABI
const facet = await ethers.getContractAt("GNUSDAOGovernanceTokenFacet", "0x84Ba28d277ded98b3488C906E90B6435B116D5b4")

// Read functions
await facet.name()           // "GNUSDAO Governance Token"
await facet.symbol()         // "GDAO"
await facet.totalSupply()    // 5000000000000000000000000n
await facet.decimals()       // 18n

// Governance facet
const gov = await ethers.getContractAt("GNUSDAOGovernanceFacet", "0x84Ba28d277ded98b3488C906E90B6435B116D5b4")
await gov.getProposalCount()
await gov.getVotingPeriod()
await gov.getTreasuryBalance()
```

---

## 7. Check Storage Slots Directly

Useful for diagnosing uninitialized contracts or reading raw state.

```bash
# eth_getStorageAt — read a specific storage slot
curl -s -X POST https://sepolia.drpc.org \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_getStorageAt",
    "params":["CONTRACT_ADDRESS","SLOT_HEX","latest"],
    "id":1
  }'
```

For Diamond pattern contracts, storage slots are computed as Solidity's `keccak256`. Use ethers.js — **not** Python's `hashlib.sha3_256` which produces a different hash:

```js
// Correct — ethers.js keccak256 matches Solidity
const { ethers } = require("ethers");
const slot = ethers.keccak256(ethers.toUtf8Bytes("gnusdao.storage.governance"));
console.log(slot);
// → 0x34aed13c8787c6428d65b8686b59e38e6c7aa14fa932688423d6a9921494e666
```

```python
# WRONG — Python sha3_256 != Ethereum keccak256
import hashlib
hashlib.sha3_256(b"gnusdao.storage.governance").hexdigest()
# → 3ba98d5d... (different result — do not use for Solidity slots)
```

If the value is `0x000...000`, the storage struct has not been initialized.

### GNUS DAO storage slots (correct values)

| Storage | Slot |
|---|---|
| `gnusdao.storage.governance` | `0x34aed13c8787c6428d65b8686b59e38e6c7aa14fa932688423d6a9921494e666` |
| `gnusdao.storage.token` | `0x7a877fa0260fb943b56671783adc5ce5ee137a7adebee3fce30034303c50cb62` |

### Reading governance config from raw storage

The `GovernanceStorage.votingConfig` struct starts at the governance slot. Each field is one 32-byte slot:

| Offset | Field | Live value |
|---|---|---|
| slot+0 | `proposalThreshold` | `1000 GDAO` |
| slot+1 | `votingDelay` | `86400` (1 day) |
| slot+2 | `votingPeriod` | `604800` (7 days) |
| slot+3 | `quorumThreshold` | `1000` |
| slot+4 | `maxVotesPerWallet` | `10000` |
| slot+5 | `proposalCooldown` | `86400` (1 day) |
| slot+6 | `timelockDelay` | `172800` (2 days) |
| slot+7 | `maxProposalActions` | `10` |
| slot+13 | `initialized` | `1` (true) |

---

## 8. Interpret Common Errors

| Error | Meaning |
|---|---|
| `execution reverted` (no data) | Function hit a `revert` — usually uninitialized storage or failed require |
| `execution reverted: LibDiamond: Must be contract owner` | Function is owner-gated — retry with `"from": owner_address` |
| `invalid argument 0` | Selector or param encoding is wrong — check ABI encoding |
| `HTTP 403` | RPC endpoint blocked your client — add `User-Agent: Mozilla/5.0` header |
| `0x` result | Function returned empty — storage value is zero/unset |

---

## 9. Verify a Function is Registered on the Diamond

Before calling, confirm the selector is actually registered:

```bash
# facetAddress(bytes4 selector) → returns the facet that handles it
# selector for facetAddress() = 0xcdffacc6
# encode the target selector as a bytes4 param

curl -s -X POST https://sepolia.drpc.org \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{
      "to":"0x84Ba28d277ded98b3488C906E90B6435B116D5b4",
      "data":"0xcdffacc606fdde0300000000000000000000000000000000000000000000000000000000"
    },"latest"],
    "id":1
  }'
# Returns the facet address that handles name() — or 0x000 if not registered
```

---

## 10. Quick Reference — Common Selectors

| Function | Selector |
|---|---|
| `facetAddresses()` | `0x52ef6b2c` |
| `facets()` | `0x7a0ed627` |
| `facetAddress(bytes4)` | `0xcdffacc6` |
| `supportsInterface(bytes4)` | `0x01ffc9a7` |
| `name()` | `0x06fdde03` |
| `symbol()` | `0x95d89b41` |
| `decimals()` | `0x313ce567` |
| `totalSupply()` | `0x18160ddd` |
| `balanceOf(address)` | `0x70a08231` |
| `owner()` | `0x8da5cb5b` |
| `paused()` | `0x5c975abb` |
| `DEFAULT_ADMIN_ROLE()` | `0xa217fddf` |
| `getProposalCount()` | `0x0d61b519` |
| `getVotingConfig()` | `0x9f83c4b2` |
| `getVotingDelay()` | `0xa2b170b0` |
| `getVotingPeriod()` | `0x3ecc6a43` |
| `getQuorumThreshold()` | `0x4afa71b9` |
| `getProposalThreshold()` | `0x85a21b19` |
| `getTimelockDelay()` | `0x481c42a2` |
| `getMaxVotesPerWallet()` | `0x4ea4a50f` |
| `getTreasuryBalance()` | `0x6f9fb98a` |
| `isGovernancePaused()` | `0x5c975abb` |
| `getCurrentVotes(address)` | `0x9f83c4b2` |
| `calculateQuadraticCost(uint256)` | `0xf103dca0` |
| `calculateMaxVotes(uint256)` | `0x74dd0fea` |
| `calculateOptimalVotes(uint256,uint256)` | `0x2c3556d6` |
| `calculateVoteWeight(uint256)` | `0x43bbcf49` |
| `calculateParticipationRate(uint256,uint256)` | `0x03ba2316` |
| `validateVote(uint256,uint256,uint256)` | `0x546c9fbc` |
| `checkQuorum(uint256,uint256)` | `0xcc951dba` |

---

## 11. Full Verification Script (ethers.js)

Drop this into a file and run with `node verify.js` to test all 50 functions at once:

```js
const { ethers } = require("ethers");
const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_KEY");
const DIAMOND = "0x84Ba28d277ded98b3488C906E90B6435B116D5b4";
const DEPLOYER = "0xd4467dA256cD3fC5751f2BC358f52cfa441741A1";

const abi = [
  "function facetAddresses() view returns (address[])",
  "function supportsInterface(bytes4) view returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function paused() view returns (bool)",
  "function isMinter(address) view returns (bool)",
  "function owner() view returns (address)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32,address) view returns (bool)",
  "function getRoleMemberCount(bytes32) view returns (uint256)",
  "function getProposalCount() view returns (uint256)",
  "function getVotingDelay() view returns (uint256)",
  "function getVotingPeriod() view returns (uint256)",
  "function getQuorumThreshold() view returns (uint256)",
  "function getProposalThreshold() view returns (uint256)",
  "function getTimelockDelay() view returns (uint256)",
  "function getMaxVotesPerWallet() view returns (uint256)",
  "function getTreasuryBalance() view returns (uint256)",
  "function isGovernancePaused() view returns (bool)",
  "function calculateQuadraticCost(uint256) pure returns (uint256)",
  "function calculateMaxVotes(uint256) pure returns (uint256)",
  "function checkQuorum(uint256,uint256) pure returns (bool)",
];

const c = new ethers.Contract(DIAMOND, abi, provider);
const ZERO32 = "0x" + "0".repeat(64);

async function check(label, fn, expected) {
  try {
    const val = await fn();
    const ok = expected === undefined ? true
      : typeof expected === "function" ? expected(val) : val === expected;
    console.log(ok ? "✅" : "⚠️", label.padEnd(40), "→", val.toString());
  } catch (e) {
    console.log("❌", label.padEnd(40), "→", e.message?.split("(")[0].trim());
  }
}

async function main() {
  await check("facetAddresses() = 9",    () => c.facetAddresses().then(v => v.length), 9);
  await check("supportsInterface(ERC165)",() => c.supportsInterface("0x01ffc9a7"), true);
  await check("name()",                   () => c.name(), "GNUSDAO Governance Token");
  await check("symbol()",                 () => c.symbol(), "GDAO");
  await check("decimals()",               () => c.decimals().then(Number), 18);
  await check("totalSupply() = 5M",       () => c.totalSupply(), 5000000n * 10n**18n);
  await check("balanceOf(deployer) > 0",  () => c.balanceOf(DEPLOYER).then(v => v > 0n), true);
  await check("paused() = false",         () => c.paused(), false);
  await check("isMinter(deployer) = true",() => c.isMinter(DEPLOYER), true);
  await check("owner() = deployer",       () => c.owner().then(v => v.toLowerCase()), DEPLOYER.toLowerCase());
  await check("DEFAULT_ADMIN_ROLE()",     () => c.DEFAULT_ADMIN_ROLE(), ZERO32);
  await check("hasRole(ADMIN,deployer)",  () => c.hasRole(ZERO32, DEPLOYER), true);
  await check("getRoleMemberCount(ADMIN)",() => c.getRoleMemberCount(ZERO32).then(v => v >= 1n), true);
  await check("getProposalCount() = 0",   () => c.getProposalCount(), 0n);
  await check("getVotingDelay() = 86400", () => c.getVotingDelay(), 86400n);
  await check("getVotingPeriod() = 604800",() => c.getVotingPeriod(), 604800n);
  await check("getQuorumThreshold() = 1000",() => c.getQuorumThreshold(), 1000n);
  await check("getProposalThreshold()",   () => c.getProposalThreshold(), 1000n * 10n**18n);
  await check("getTimelockDelay() = 172800",() => c.getTimelockDelay(), 172800n);
  await check("getMaxVotesPerWallet()",   () => c.getMaxVotesPerWallet(), 10000n);
  await check("getTreasuryBalance() = 0", () => c.getTreasuryBalance(), 0n);
  await check("isGovernancePaused()",     () => c.isGovernancePaused(), false);
  await check("calcQuadCost(4) = 16",     () => c.calculateQuadraticCost(4n), 16n);
  await check("calcMaxVotes(100 GDAO)",   () => c.calculateMaxVotes(100n * 10n**18n), 10n);
  await check("checkQuorum(1000,1000)",   () => c.checkQuorum(1000n, 1000n), true);
  await check("checkQuorum(500,1000)",    () => c.checkQuorum(500n, 1000n), false);
}
main().catch(console.error);
```

---

## Public Sepolia RPC Endpoints

| RPC                                           | Notes                                                |
| -----------------------------------------------| ------------------------------------------------------|
| `https://sepolia.infura.io/v3/YOUR_KEY`       | Best reliability — use this                          |
| `https://sepolia.drpc.org`                    | Public, requires `User-Agent: Mozilla/5.0` in Python |
| `https://ethereum-sepolia-rpc.publicnode.com` | Works with curl                                      |
| `https://rpc.sepolia.org`                     | Sometimes slow                                       |
