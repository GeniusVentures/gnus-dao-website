# 🗳️ GNUS DAO Governance Platform

A decentralized autonomous organization (DAO) governance platform built with Next.js 14, featuring quadratic voting, multi-chain support, and Diamond pattern smart contract integration (EIP-2535).

**Live:** https://feature-governance-dashboard.gnus-dao-web-2po.pages.dev/  
**Faucet:** https://gnus-dao-faucet.pages.dev/

## Features

### Governance
- Proposal creation with IPFS metadata storage (Pinata)
- Voting system (For/Against) with quadratic voting support
- Real-time proposal states (Active, Pending, Succeeded, Defeated, Executed)
- Vote tracking and user vote receipts
- Configurable voting periods and execution delays

### Technical
- Multi-chain support: Ethereum, Base, Polygon, SKALE, Sepolia (testnet)
- Diamond pattern smart contracts (EIP-2535) — upgradeable, modular facets
- WalletConnect v2 + MetaMask via Reown AppKit
- IPFS integration via Pinata for proposal metadata
- Static export (SPA) deployed to Cloudflare Pages with Workers
- Sentry error tracking and performance monitoring
- Dark/Light theme with mobile-responsive design

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn 4 (`packageManager: yarn@4.10.3`)
- MetaMask or compatible Web3 wallet

### Installation

```bash
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration (see .env.example for all options)

# Start development server
yarn dev
```

### Key Environment Variables

See `.env.example` for the full list. The minimum required:

```env
# WalletConnect (required) — get from https://cloud.reown.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# Contract address (Sepolia testnet)
NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS=0x84Ba28d277ded98b3488C906E90B6435B116D5b4

# IPFS / Pinata (required for proposal creation)
NEXT_PUBLIC_PINATA_API_KEY=
NEXT_PUBLIC_PINATA_SECRET_KEY=
NEXT_PUBLIC_PINATA_JWT=
```

## Project Structure

```
├── contracts/              # Solidity smart contracts (Diamond facets)
├── diamonds/               # Diamond configuration and ABIs
├── functions/              # Cloudflare Workers (serverless API)
│   ├── api/               # API routes (auth, health, ipfs, config, performance)
│   ├── utils/             # Worker utilities
│   └── _middleware.ts     # Edge middleware
├── scripts/               # Hardhat deployment & governance scripts
├── src/
│   ├── app/               # Next.js 14 App Router pages
│   │   ├── analytics/     # DAO analytics dashboard
│   │   ├── docs/          # Documentation pages
│   │   ├── governance/    # Governance settings
│   │   ├── history/       # Voting history
│   │   ├── proposals/     # Proposal listing & detail ([id])
│   │   ├── settings/      # User settings
│   │   └── treasury/      # Treasury management
│   ├── components/        # React components
│   │   ├── admin/         # Admin panel components
│   │   ├── analytics/     # Analytics charts & widgets
│   │   ├── auth/          # Authentication (SIWE)
│   │   ├── error/         # Error boundaries
│   │   ├── governance/    # Governance UI
│   │   ├── ipfs/          # IPFS upload & display
│   │   ├── layout/        # Header, sidebar, navigation
│   │   ├── monitoring/    # Performance monitoring
│   │   ├── proposals/     # Proposal cards, creation modal
│   │   ├── providers/     # Context providers (Web3, Redux, Theme)
│   │   ├── sections/      # Landing page sections
│   │   ├── treasury/      # Treasury components
│   │   ├── ui/            # Base UI (Button, Modal, Toast, etc.)
│   │   ├── voting/        # Voting interface
│   │   └── wallet/        # Wallet connection
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Core business logic
│   │   ├── auth/          # Authentication logic (SIWE)
│   │   ├── config/        # App configuration
│   │   ├── contracts/     # Smart contract service & ABIs
│   │   ├── ipfs/          # IPFS/Pinata integration
│   │   ├── middleware/    # Request middleware
│   │   ├── services/      # Business services
│   │   ├── store/         # Redux store & slices
│   │   ├── utils/         # Utility functions
│   │   └── web3/          # Web3 provider setup
│   └── types/             # TypeScript type definitions
└── hardhat.config.ts       # Hardhat configuration
```

## Development

### Scripts

```bash
# Development
yarn dev                    # Start dev server (port 3000, SSR mode)
yarn dev:turbo              # Dev server with Turbopack

# Building
yarn build                  # Production build (static export → out/)

# Preview
yarn preview:local          # Preview with Wrangler locally

# Testing
yarn test                   # Run Jest unit tests
yarn test:coverage          # Tests with coverage report
yarn test:e2e              # Playwright end-to-end tests
yarn test:e2e:ui           # Playwright with interactive UI
yarn validate              # type-check + lint + test:ci

# Code Quality
yarn lint                   # ESLint (max 50 warnings)
yarn lint:fix              # Auto-fix lint issues
yarn type-check            # TypeScript strict check
yarn format                # Prettier formatting

# Smart Contracts
yarn compile               # Compile contracts + generate Diamond ABI & typechain
yarn clean-compile         # Clean + compile
yarn test-hh              # Run Hardhat tests
yarn coverage             # Solidity coverage

# Deployment
yarn deploy:cloudflare     # Build + deploy to Cloudflare Pages
yarn deploy:prepare        # Build only

# Maintenance
yarn clean                 # Remove .next, out, dist, cache
yarn clean:all            # Remove everything including node_modules
```

### Smart Contract Development

The project uses the Diamond pattern (EIP-2535) with Hardhat:

```bash
# Compile contracts and generate ABI + typechain types
yarn compile

# Run contract tests
yarn test-hh

# Generate Diamond ABI only
yarn diamond:generate-abi

# Governance scripts (require .env configuration)
npx hardhat run scripts/init-governance.ts --network sepolia
npx hardhat run scripts/upgrade-governance-facet.ts --network sepolia
```

## Deployment

### Cloudflare Pages (Production)

Architecture: Static SPA (`out/`) + Cloudflare Workers (`functions/`).

```bash
# Build and deploy
yarn deploy:cloudflare

# Or preview locally first
yarn build
yarn preview:local
```

### CI/CD

Automated via GitHub Actions:
- Type checking, linting, and testing on PRs
- Automatic deployment to Cloudflare Pages on push to main
- Preview deployments for pull requests

## Architecture

### Smart Contracts

Diamond pattern (EIP-2535) deployed on Sepolia testnet:
- **Contract:** `0x84Ba28d277ded98b3488C906E90B6435B116D5b4`
- Modular facets: Proposals, Voting, Treasury, Token
- Upgradeable without redeployment via `diamondCut`

### Key Contract Interface

```typescript
// Proposals
propose(title, ipfsHash) → proposalId
getProposalBasic(proposalId) → (id, proposer, title, ipfsHash)
getProposalStatus(proposalId) → (startTime, endTime, totalVotes, executed, cancelled)

// Voting
vote(proposalId, votes)
hasVoted(proposalId, voter) → bool
getVote(proposalId, voter) → uint256

// Configuration
getVotingConfig() → (proposalThreshold, votingDelay, votingPeriod, quorumThreshold)
```

### Monitoring & Error Tracking

- **Sentry** for error tracking and performance monitoring
- Critical error alerting via webhooks (Slack, Discord)
- Web Vitals attribution (CLS, LCP, FID, FCP, TTFB)
- Custom performance monitoring hooks

## Security

```bash
# Run all security checks
yarn security-check

# Individual checks
yarn snyk:test             # Snyk vulnerability scan
yarn semgrep:scan          # Static analysis
yarn slither:scan          # Solidity security analysis
yarn git-secrets:scan      # Secret detection
```

## License

MIT
