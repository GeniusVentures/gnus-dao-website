# GNUS DAO Website

# 🗳️ GNUS DAO Governance Platform

A modern, decentralized autonomous organization (DAO) governance platform built with Next.js 14, featuring quadratic voting, multi-chain support, and Diamond pattern smart contract integration.

## 📚 Documentation

### User Guides
- **[📖 Complete Usage Guide](USAGE_GUIDE.md)** - Comprehensive user manual for all features
- **[⚡ Quick Reference](QUICK_REFERENCE.md)** - Essential commands and troubleshooting
- **[🔧 Technical Documentation](TECHNICAL_DOCS.md)** - Developer and architecture guide

### Getting Started
1. **New Users**: Start with the [Usage Guide](USAGE_GUIDE.md)
2. **Quick Help**: Check the [Quick Reference](QUICK_REFERENCE.md)
3. **Developers**: Read the [Technical Docs](TECHNICAL_DOCS.md)

## 🌟 Features

### Core Governance Features
- **✅ Proposal Creation**: Create and submit governance proposals with IPFS metadata storage
- **✅ Quadratic Voting System**: Advanced voting mechanism with cost = votes² formula
- **✅ Proposal Management**: Complete lifecycle from creation to execution
- **✅ Vote Tracking**: Comprehensive voting history and receipts
- **✅ Treasury Operations**: Decentralized fund management
- **✅ Role Management**: Admin controls for treasury managers and permissions
- **✅ Real-time Updates**: Live proposal status and voting results

### Advanced Features
- **✅ Diamond Pattern Integration**: Upgradeable smart contracts using EIP-2535
- **✅ IPFS Integration**: Decentralized metadata storage with multiple gateway fallback
- **✅ Multi-Wallet Support**: MetaMask, WalletConnect, and other Web3 wallets
- **✅ Mobile Responsive**: Optimized interface for all devices
- **✅ Error Handling**: Comprehensive error tracking and user feedback
- **✅ Security Features**: Input validation, rate limiting, and safe transactions

### Technical Stack
- **Frontend**: Next.js 14.2.35 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **State Management**: Redux Toolkit
- **Web3**: ethers.js v6 with TypeChain
- **Smart Contracts**: Diamond pattern (7 facets)
- **Network**: Ethereum Sepolia Testnet

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and yarn
- MetaMask or compatible Web3 wallet

### Development
```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Open http://localhost:3000
```

### Deployment
```bash
# Build and deploy to Cloudflare Pages
yarn deploy:pages

# Or build only
yarn build:pages
```

📋 **For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**
- Access to Sepolia testnet (for development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd gnus-dao-website

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
yarn dev
```

### First Time Setup
1. **Connect Wallet**: Use MetaMask on Sepolia testnet
2. **Get Test Tokens**: Acquire GNUS tokens for voting
3. **Explore Interface**: Check out proposals and treasury
4. **Cast First Vote**: Participate in governance

For detailed setup instructions, see the [Usage Guide](USAGE_GUIDE.md#getting-started).

### Environment Configuration

Create a `.env.local` file with the following variables:

```env
# WalletConnect Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=805f6520f2f2934352c65fe6bd70d15d

# Network Configuration (Sepolia Testnet)
NEXT_PUBLIC_SEPOLIA_RPC_URL=
NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS=0x57AE78C65F7Dd6d158DE9F4cA9CCeaA98C988199

# IPFS Configuration (Pinata)
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js 14 App Router pages
│   ├── proposals/         # Proposal management pages
│   │   ├── page.tsx       # Main proposals listing
│   │   └── [id]/          # Individual proposal details
│   ├── treasury/          # Treasury management
│   ├── analytics/         # DAO analytics dashboard
│   └── governance/        # Governance settings
├── components/            # Reusable React components
│   ├── proposals/         # Proposal-related components
│   │   ├── CreateProposalModal.tsx  # Proposal creation
│   │   └── ProposalCard.tsx         # Proposal display
│   ├── voting/           # Voting interface components
│   ├── wallet/           # Wallet connection components
│   └── ui/               # Base UI components (Button, Modal, etc.)
├── lib/                  # Core business logic
│   ├── contracts/        # Smart contract interactions
│   │   ├── gnusDaoService.ts        # Main DAO service
│   │   └── GNUSDAODiamond.json      # Contract ABI
│   ├── web3/            # Web3 provider and Redux store
│   ├── ipfs/            # IPFS integration (Pinata)
│   └── utils/           # Utility functions
├── types/               # TypeScript type definitions
└── scripts/             # Build and deployment scripts
```

## 🔧 Development

### Available Scripts

```bash
# Development
yarn dev                    # Start development server (port 3000)
yarn dev:turbo             # Start development server with Turbopack

# Building
yarn build                 # Standard Next.js build
yarn build:production      # Production build with optimizations for Cloudflare Pages

# Testing
yarn test                  # Run unit tests
yarn test:coverage         # Run tests with coverage
yarn test:e2e             # Run Playwright end-to-end tests
yarn test:e2e:ui          # Run Playwright tests with UI
yarn validate             # Run type-check + lint + tests

# Code Quality
yarn lint                  # Run ESLint
yarn lint:fix             # Fix linting issues automatically
yarn type-check           # TypeScript type checking
yarn format               # Format code with Prettier

# Deployment
yarn deploy:prepare        # Build for production
yarn deploy:cloudflare     # Deploy to Cloudflare Pages

# Maintenance
yarn clean                 # Clean build artifacts
yarn clean:all            # Clean everything including node_modules
```

### Testing Strategy

The project includes comprehensive testing:

- **✅ Unit Tests**: Jest with React Testing Library for component testing
- **✅ E2E Tests**: Playwright for end-to-end user flow testing
- **✅ Type Safety**: Full TypeScript coverage with strict mode
- **✅ Linting**: ESLint with custom rules for Web3 development
- **✅ Integration Tests**: Contract interaction testing

### Development Workflow

1. **Local Development**: `yarn dev` starts the development server
2. **Code Quality**: `yarn validate` runs all quality checks
3. **Testing**: `yarn test:coverage` ensures >80% test coverage
4. **Building**: `yarn build:hybrid` creates production-ready build
5. **Deployment**: Automatic deployment via GitHub Actions

## 🌐 Deployment

### Cloudflare Pages (Production)

The project is optimized for Cloudflare Pages deployment:

```bash
# Build for production
yarn build:production

# Deploy using Wrangler CLI
yarn deploy:cloudflare
```

**Live Deployment**: https://gnus-dao-web.pages.dev

### GitHub Actions CI/CD

Automated deployment pipeline includes:

- **✅ Code Quality Checks**: TypeScript, ESLint, Prettier
- **✅ Automated Testing**: Unit and integration tests
- **✅ Build Verification**: Ensures successful production builds
- **✅ Automatic Deployment**: Deploy to Cloudflare Pages on main branch
- **✅ Preview Deployments**: Deploy preview for pull requests


## 🏗️ Architecture

### Smart Contract Integration

The platform integrates with Diamond pattern smart contracts (EIP-2535):

- **✅ Upgradeable Architecture**: Modular contract system with facets
- **✅ Gas Optimization**: Efficient function delegation and storage
- **✅ Feature Modularity**: Separate facets for proposals, voting, treasury
- **✅ Contract Address**: `0x57AE78C65F7Dd6d158DE9F4cA9CCeaA98C988199` (Sepolia)

### Key Contract Functions

```typescript
// Proposal Management
propose(title: string, ipfsHash: string) → uint256
getProposalBasic(proposalId: uint256) → (id, proposer, title, ipfsHash)
getProposalStatus(proposalId: uint256) → (startTime, endTime, totalVotes, executed, cancelled)

// Voting System
vote(proposalId: uint256, votes: uint256) → void
hasVoted(proposalId: uint256, voter: address) → bool
getVote(proposalId: uint256, voter: address) → uint256

// Configuration
getVotingConfig() → (proposalThreshold, votingDelay, votingPeriod, quorumThreshold)
```

## 📊 Current Status

### ✅ Completed Features

- **Proposal Creation**: Full end-to-end proposal creation with IPFS upload

- **Proposal Display**: Real-time proposal states and time remaining
- **Wallet Integration**: WalletConnect v2 support and MetaMask support
- **Navigation**: Seamless routing between proposal list and details
- **State Management**: Proper proposal state calculation from contract data
- **Error Handling**: Comprehensive error handling and user feedback
- **Build System**: Hybrid build for Cloudflare Pages deployment
- **CI/CD Pipeline**: Automated testing and deployment

### 🔄 Current Tasks

- **Enhanced UI/UX**: Improve visual design and user experience
- **Wallet Integration**: WalletConnect v2 support, SIWE for cloudflare
- **Voting System**: Vote For/Against functionality with wallet integration
- **Performance Optimization**: Optimize bundle size and loading times
- **Advanced Voting**: Implement delegation and quadratic voting features
- **Treasury Management**: Add treasury proposal and execution features
- **Analytics Dashboard**: Implement governance analytics and metrics
