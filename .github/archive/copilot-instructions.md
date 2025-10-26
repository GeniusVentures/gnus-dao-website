# Copilot Instructions for GNUS-DAO Project

These instructions guide you, the AI Coding Agent, in completing the GNUS-DAO smart contract project within the provided Hardhat-based development environment. You must adhere strictly to these guidelines to ensure professional, maintainable, secure, and audit-ready code. Follow security-first principles, best practices in smart contract architecture, comprehensive testing, and thorough documentation. Do not deviate from the project structure or introduce unapproved dependencies without explicit security review.

## 1. Project Overview

- **Project Name**: GNUS-DAO
- **Purpose**: A secure, upgradeable DAO implementation using ERC-2535 Diamond Proxy Standard with comprehensive governance, treasury management, and member functionality.
- **Security Classification**: High - This is a financial smart contract system handling user funds and governance decisions.
- **Dependencies**:
  - Primary: `diamonds` module for ERC-2535 implementation
  - Configuration: `hardhat-diamonds` module for deployment and management
  - Testing: `hardhat-multichain` for multi-blockchain testing environments
  - Monitoring: `diamonds-monitor` for real-time security and performance monitoring of smart contracts
  - Type Safety: `diamonds-abi` with Typechain for TypeScript integration
- **Tech Stack**:
  - **Languages**: TypeScript (primary), Solidity ^0.8.2 (for contracts)
  - **Framework**: Hardhat for Ethereum development (compilation, testing, deployment)
  - **Architecture**: ERC-2535 Diamond Proxy Standard for upgradeability
  - **Tools**: Yarn Workspaces (monorepo), ESLint/Prettier (linting/formatting), Husky (git hooks), GitHub Actions (CI/CD)
  - **Security Tools**: Integrated security scanning via Slither and custom security checks
  - **Libraries**: Use pre-audited, well-established libraries only. All new dependencies require security review.

  The project is a monorepo. Focus on completing the `GNUS-DAO` smart contracts while ensuring integration with the overall environment. The parent monorepo project will need to support a variety of testing scenarios including deploying the contracts to the local Hardhat network and to testnets by using the scripts in `./scripts/deploy/`. This will also require the creation of additional test cases and new scripts to facilitate the monitor for this parent project.

## 2. Security-First Development Principles

### 2.1 Smart Contract Security Requirements

- **Access Control**: Every function must have appropriate access modifiers and role-based permissions
- **Reentrancy Protection**: Use OpenZeppelin's ReentrancyGuard or equivalent for all state-changing functions
- **Input Validation**: Validate all parameters, especially addresses (non-zero, contract validation where appropriate)
- **Diamond Security**:
  - Implement proper diamond storage patterns
  - Use diamond-specific access controls

### 2.2 Code Security Standards

- **No Hard-coded Values**: All configuration through constructor parameters or diamond storage
- **Event Emission**: Emit events for all significant state changes for transparency and monitoring
- **Gas Optimization**: Efficient code that minimizes attack surface through reduced complexity
- **Upgrade Safety**: Diamond upgrades must maintain state compatibility and cannot break existing functionality
- **Emergency Controls**: Implement pause mechanisms and emergency upgrade capabilities with proper governance

### 2.3 Development Security Workflow

- **Security Scanning**: All code must pass integrated security scanners (Slither, custom rules)
- **Test Coverage**: Minimum 90% line coverage with specific security test cases
- **Audit Preparation**: Code must be audit-ready with comprehensive documentation
- **Dependency Security**: Regular dependency audits and updates through automated tools

## 3. Project Architecture and Constraints

### 3.1 Directory Structure

```bash
./                               # Git monorepo root
├── contracts/                   # Solidity contracts
│   └── gnus-dao/                # GNUS DAO contracts git submodule
├── docs/                        # Technical and security documentation
│   └── devs/
├── diamond-abi/                 # Diamond ABI files
├── diamond-typechain-types/     # TypeScript types for diamond contracts
├── diamonds/                    # Diamond config, deploy & callbacks git submodule
│   ├── callbacks/               # Deployment callbacks
│   ├── deployments/             # Deployment records
│   └── gnusdaodiamond.config.json  # Diamond configuration file
├── logs/                        # Log files (e.g., emergency bypass logs) 
├── reports/                     # Test and coverage reports
├── scripts/                     # Deployment and utility scripts
│   ├── deploy/                  # Deployment strategies
│   │   ├── defender/
│   │   └── rpc/
│   ├── setup/                   # Setup scripts
│   └── utils/                   # Helper scripts
├── test/                        # Comprehensive test suite
│   ├── unit/                    # Unit tests for individual functions
│   ├── integration/             # Cross-facet integration tests
│   ├── deployment/              # Deployment tests
│   ├── fuzz/                    # Fuzz testing
│   ├── e2e/                     # End-to-end tests
│   ├── performance/             # Performance tests
│   ├── security/                # Security tests
│   ├── invariant-fuzz/          # Invariant Fuzzing tests
│   └── utils/                   # Test utilities
├── test-assets/                 # Test assets
│   ├── test-diamonds/               # Test diamond configurations
│   └── test-output/                 # Test output files
└── [other standard files]       # package.json, tsconfig.json, etc.
```

### 3.2 Development Environment

- **Package Manager**: Yarn only (for lockfile security)
- **Node Version**: Use .nvmrc specified version
- **Network Support**: Local (Hardhat), Testnets (Sepolia, Goerli), Mainnet
- **Environment Variables**: Use .env for configuration (never commit secrets)
- **Build Process**: `yarn compile` → `yarn test` → `yarn security-check` → deploy

### 3.3 Security Tools Integration

- **Pre-commit Hooks**: Husky enforces security checks, linting, and tests
- **CI/CD Pipeline**: GitHub Actions with comprehensive security scanning
- **Local Security**: `yarn security-check` runs all security tools locally
- **Monitoring**: Integration with security monitoring tools for deployed contracts

## 4. Development Methodologies and Best Practices

### 4.1 Security-First Architecture

- **Principle of Least Privilege**: Functions have minimal required permissions
- **Defense in Depth**: Multiple layers of security controls
- **Fail-Safe Defaults**: System defaults to secure state on errors
- **Complete Mediation**: All access requests are checked
- **Diamond-Specific Patterns**:
  - Use LibDiamond for standard diamond operations
  - Implement diamond-specific storage patterns
  - Ensure facet isolation and proper selector management

### 4.2 Smart Contract Development Standards

- **Solidity Version**: ^0.8.19 (latest stable with security improvements)
- **Inheritance**: Prefer composition over inheritance; use interfaces extensively
- **State Management**: Use diamond storage patterns for upgradeable state
- **Error Handling**: Custom errors with descriptive messages (gas efficient)
- **Documentation**: NatSpec comments for all public/external functions
- **Security Patterns**:

  ```solidity
  // Example security pattern
  modifier onlyAuthorized(bytes4 selector) {
      require(
          LibAccessControl.hasRole(msg.sender, selector),
          "Unauthorized access"
      );
      _;
  }
  ```

### 4.3 TypeScript Development Standards

- **Strict Typing**: Use strict TypeScript configuration
- **Interface Design**: Define interfaces for all contract interactions
- **Async/Await**: Consistent async patterns for blockchain interactions
- **Error Handling**: Comprehensive try-catch with specific error types
- **Type Safety**: Leverage Typechain-generated types for contract interactions
- **Security Validations**: Runtime validation of addresses, parameters, and return values

### 4.4 Testing Methodology (Security-Focused TDD)

- **Test-First Development**: Write security tests before implementation
- **Test Categories**:
  - **Unit Tests**: Individual function security and logic
  - **Integration Tests**: Cross-facet interactions and diamond behavior
  - **Security Tests**: Attack vectors, edge cases, access control
  - **Upgrade Tests**: Diamond upgrade scenarios and state preservation
  - **Gas Tests**: Gas optimization and DoS prevention
- **Coverage Requirements**: 90%+ line coverage, 100% critical path coverage
- **Attack Simulation**: Test common attack patterns (reentrancy, overflow, etc.)

## 5. Security Implementation Guidelines

### 5.1 Smart Contract Security Checklist

```solidity
// Security checklist for every function:
// ✓ Access control modifier
// ✓ Input validation
// ✓ Reentrancy protection (if needed)
// ✓ State changes before external calls
// ✓ Event emission
// ✓ Gas optimization
// ✓ Proper error handling

function secureFunction(
    address target,
    uint256 amount
) external onlyAuthorized nonReentrant {
    require(target != address(0), "Invalid target");
    require(amount > 0, "Invalid amount");
    
    // State changes first
    _updateState(target, amount);
    
    // External interactions last
    _executeTransfer(target, amount);
    
    emit SecureActionExecuted(target, amount);
}
```

### 5.2 Security Testing Requirements

```typescript
// Security test template
describe("Security: [Function/Feature]", () => {
    beforeEach(async () => {
        // Setup with security-focused initialization
    });

    it("should prevent unauthorized access", async () => {
        // Test access control
    });

    it("should handle reentrancy attacks", async () => {
        // Test reentrancy protection
    });

    it("should validate all inputs", async () => {
        // Test input validation
    });

    it("should emit security events", async () => {
        // Verify event emission
    });
});
```

## 6. Workflow for Security-Focused Development

### 6.1 Feature Implementation Process

1. **Security Analysis**: Analyze security implications of new feature
2. **Test Design**: Write security-focused tests first
3. **Implementation**: Code with security patterns
4. **Security Review**: Self-review against security checklist
5. **Integration Testing**: Test cross-facet security implications
6. **Documentation**: Update security documentation

### 6.2 Code Review Standards

- **Security Focus**: Every change reviewed for security implications
- **Attack Vector Analysis**: Consider potential attack vectors
- **Gas Optimization**: Ensure efficient resource usage
- **Upgrade Impact**: Consider impact on diamond upgradeability
- **Documentation**: Verify security documentation is current

### 6.3 Security Incident Response

- **Immediate**: Identify and contain security issues
- **Analysis**: Analyze root cause and impact
- **Fix**: Implement comprehensive fix with tests
- **Review**: Security review of fix
- **Documentation**: Update security procedures

## 7. Professional and Compliance Standards

### 7.1 Audit Readiness

- **Code Quality**: Production-ready, well-documented code
- **Test Coverage**: Comprehensive test suite with security focus
- **Documentation**: Complete technical and security documentation
- **Deployment**: Tested deployment procedures with rollback capabilities

### 7.2 Compliance Requirements

- **Industry Standards**: Follow established DeFi security practices
- **Regulatory Considerations**: Design for potential regulatory requirements
- **Privacy**: Implement appropriate privacy protections
- **Transparency**: Public verification of contracts and governance

### 7.3 Continuous Security

- **Monitoring**: Ongoing security monitoring of deployed contracts
- **Updates**: Regular security updates and dependency management
- **Incident Response**: Prepared incident response procedures
- **Community**: Engagement with security community and researchers

## 8. Response Guidelines for AI Coding Agent

### 8.1 Security-First Responses

- **Risk Assessment**: Always assess security implications first
- **Secure Defaults**: Provide most secure implementation by default
- **Security Explanation**: Explain security considerations in responses
- **Best Practices**: Reference and implement security best practices
- **Testing**: Include security tests with all implementations

### 8.2 Code Generation Standards

- **Security Patterns**: Use established security patterns
- **Input Validation**: Always validate inputs
- **Access Control**: Implement appropriate access controls
- **Error Handling**: Comprehensive error handling with security considerations
- **Documentation**: Include security-focused documentation

### 8.3 Refusal Criteria

- **Unsafe Patterns**: Refuse to implement known unsafe patterns
- **Insufficient Security**: Decline requests that compromise security
- **Unvalidated Dependencies**: Refuse to add unverified dependencies
- **Bypass Security**: Never help bypass security controls
- **Malicious Code**: Absolutely refuse any malicious implementations

## 9. Integration Requirements

### 9.1 Diamond Module Integration

- **BaseDeploymentStrategy**: Extend for GNUS-DAO specific deployment
- **LocalDeploymentStrategy**: Use for local testing environments
- **RPCDeploymentStrategy**: Use for testnet deployments
- **ABI Generation**: Leverage diamond-abi for TypeScript integration

### 9.2 Security Tool Integration

- **Local Scanning**: Integrate with local security scanning tools
- **CI/CD Security**: Ensure all security checks pass in pipeline
- **Monitoring**: Connect with security monitoring infrastructure
- **Alerting**: Implement security alert mechanisms

## 10. Success Criteria and Quality Gates

### 10.1 Code Quality Gates

- ✅ 90%+ test coverage with security test focus
- ✅ All security scanners pass (zero high-severity issues)
- ✅ Comprehensive documentation with security considerations
- ✅ Successful deployment on testnets
- ✅ Gas optimization within acceptable limits
- ✅ Full TypeScript type safety

### 10.2 Security Quality Gates

- ✅ No known security vulnerabilities
- ✅ Access control properly implemented
- ✅ Input validation comprehensive
- ✅ Upgrade mechanisms secure and tested
- ✅ Emergency procedures implemented and tested
- ✅ Security incident response procedures documented

### 10.3 Production Readiness

- ✅ Audit-ready codebase
- ✅ Comprehensive security documentation
- ✅ Tested deployment procedures
- ✅ Monitoring and alerting systems
- ✅ Incident response procedures
- ✅ Community security engagement plan

## Final Instructions

- **Never compromise on security** - When in doubt, choose the most secure approach
- **Test everything** - Every feature must have comprehensive security tests
- **Document security decisions** - Explain security rationale in code and docs
- **Stay current** - Keep up with latest security best practices and vulnerabilities
- **Community engagement** - Consider how implementation affects the broader security community

Remember: You are building a financial smart contract system that will handle real user funds and governance decisions. Security is not optional—it is the foundation of everything you build.

Follow these instructions precisely. If any instruction conflicts with security best practices, prioritize security. When uncertain about security implications, ask for clarification before proceeding.
