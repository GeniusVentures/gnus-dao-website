import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  BookOpen, Code, Users, Vote, Wallet, ExternalLink,
  ArrowRight, Shield, DollarSign, Clock, Zap, AlertTriangle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description: "GNUS DAO documentation and guides",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <h2 className="text-2xl font-bold mb-4 pb-2 border-b">{title}</h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

function InfoBox({ type = "info", children }: { type?: "info" | "warning" | "tip"; children: React.ReactNode }) {
  const styles = {
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100",
    tip: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100",
  };
  return (
    <div className={`border rounded-lg p-4 mb-4 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">GNUS DAO Documentation</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Complete guide to participating in GNUS DAO governance on Sepolia testnet
        </p>
      </div>

      {/* Table of Contents */}
      <div className="bg-card border rounded-xl p-6 mb-12">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> Contents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {[
            ["#what-is-gnus-dao", "What is GNUS DAO?"],
            ["#connect-wallet", "Connecting Your Wallet"],
            ["#gdao-token", "GDAO Token"],
            ["#proposals", "Creating Proposals"],
            ["#voting", "Voting on Proposals"],
            ["#quadratic-voting", "Quadratic Voting Explained"],
            ["#delegation", "Delegating Voting Power"],
            ["#treasury", "Treasury Management"],
            ["#governance-params", "Governance Parameters"],
            ["#smart-contracts", "Smart Contracts"],
            ["#faq", "FAQ"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="text-primary hover:underline flex items-center gap-1">
              <ArrowRight className="h-3 w-3 flex-shrink-0" /> {label}
            </a>
          ))}
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-12">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" /> Quick Start
        </h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            ["1", "Connect Wallet", "Click Connect Wallet in the header. Use MetaMask on Sepolia testnet."],
            ["2", "Get GDAO", "You need GDAO tokens to vote and create proposals. The deployer holds 5M GDAO."],
            ["3", "Browse Proposals", "Go to Proposals to see active governance proposals."],
            ["4", "Vote", "Click a proposal, wait for voting to open (1h delay), then cast your vote."],
          ].map(([num, title, desc]) => (
            <div key={num} className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2 font-bold">{num}</div>
              <h3 className="font-medium mb-1 text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Button asChild>
            <Link href="/proposals">Go to Proposals <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      {/* What is GNUS DAO */}
      <Section id="what-is-gnus-dao" title="What is GNUS DAO?">
        <p className="text-muted-foreground mb-4">
          GNUS DAO is a decentralized autonomous organization built on Ethereum (currently deployed on Sepolia testnet).
          It uses the <strong>Diamond Pattern (ERC-2535)</strong> for upgradeable smart contracts and
          <strong> quadratic voting</strong> to ensure fair governance where large token holders can't dominate decisions.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            [Vote, "Quadratic Voting", "Voting costs scale quadratically — 1 vote costs 1 token, 4 votes cost 16 tokens. This limits whale dominance."],
            [Shield, "Diamond Pattern", "The contract is upgradeable via ERC-2535 Diamond standard, allowing new features without redeployment."],
            [DollarSign, "Treasury", "The DAO holds a treasury that can only be spent via governance proposals voted on by token holders."],
          ].map(([Icon, title, desc]) => (
            <div key={title as string} className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-medium">{title as string}</span>
              </div>
              <p className="text-sm text-muted-foreground">{desc as string}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Connect Wallet */}
      <Section id="connect-wallet" title="Connecting Your Wallet">
        <SubSection title="Supported Wallets">
          <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
            <li>MetaMask (recommended)</li>
            <li>Coinbase Wallet</li>
            <li>WalletConnect (any compatible wallet)</li>
          </ul>
        </SubSection>
        <SubSection title="Network Setup">
          <p className="text-sm text-muted-foreground mb-2">The DAO is deployed on <strong>Sepolia testnet</strong>. Add it to MetaMask:</p>
          <div className="bg-muted rounded-lg p-4 text-sm font-mono space-y-1">
            <div><span className="text-muted-foreground">Network Name:</span> Sepolia</div>
            <div><span className="text-muted-foreground">Chain ID:</span> 11155111</div>
            <div><span className="text-muted-foreground">RPC URL:</span> https://sepolia.infura.io/v3/YOUR_KEY</div>
            <div><span className="text-muted-foreground">Currency:</span> ETH</div>
            <div><span className="text-muted-foreground">Explorer:</span> https://sepolia.etherscan.io</div>
          </div>
        </SubSection>
        <SubSection title="Sign-In with Ethereum (SIWE)">
          <p className="text-sm text-muted-foreground">
            Some actions (creating proposals, uploading to IPFS) require SIWE authentication.
            This is a free, gasless signature that proves you own your wallet — it does not send a transaction.
            You'll be prompted automatically when needed.
          </p>
        </SubSection>
      </Section>

      {/* GDAO Token */}
      <Section id="gdao-token" title="GDAO Token">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <SubSection title="Token Details">
              <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">GNUSDAO Governance Token</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Symbol</span><span className="font-medium">GDAO</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Decimals</span><span className="font-medium">18</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Supply</span><span className="font-medium">5,000,000 GDAO</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span className="font-medium">Sepolia</span></div>
              </div>
            </SubSection>
          </div>
          <div>
            <SubSection title="What GDAO is used for">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" /><span><strong>Voting:</strong> Spend GDAO to cast votes. Cost = votes² (quadratic).</span></li>
                <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" /><span><strong>Proposals:</strong> Need 1,000 GDAO voting power to create a proposal.</span></li>
                <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" /><span><strong>Delegation:</strong> Delegate your GDAO voting power to another address.</span></li>
              </ul>
            </SubSection>
          </div>
        </div>
        <InfoBox type="tip">
          To send GDAO to another wallet or the treasury, go to the <Link href="/governance" className="underline font-medium">Governance page</Link> and use the "Send GDAO Tokens" panel.
        </InfoBox>
      </Section>

      {/* Proposals */}
      <Section id="proposals" title="Creating Proposals">
        <SubSection title="Requirements">
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Wallet connected to Sepolia</li>
            <li>Signed in with Ethereum (SIWE)</li>
            <li>At least 1,000 GDAO voting power</li>
            <li>1-hour cooldown between proposals from the same address</li>
          </ul>
        </SubSection>
        <SubSection title="Proposal Categories">
          <div className="grid md:grid-cols-2 gap-3">
            {[
              ["Governance Change", "Changes to voting rules, delays, quorum thresholds. No on-chain actions needed."],
              ["Protocol Upgrade", "Technical changes to smart contracts. No on-chain actions needed."],
              ["Community Initiative", "Programs, grants, partnerships. No on-chain actions needed."],
              ["Treasury Management", "Transfer ETH or tokens from the treasury. Requires an on-chain action."],
            ].map(([cat, desc]) => (
              <div key={cat as string} className="bg-card border rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">{cat as string}</p>
                <p className="text-muted-foreground">{desc as string}</p>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Proposal Lifecycle">
          <div className="flex flex-col gap-2">
            {[
              ["Pending", "yellow", "Proposal created. Voting hasn't started yet (1-hour delay)."],
              ["Active", "green", "Voting is open. Token holders can cast votes."],
              ["Succeeded", "blue", "Voting ended with quorum met. Ready to queue."],
              ["Defeated", "red", "Voting ended but quorum not met (< 1,000 votes)."],
              ["Queued", "indigo", "Proposal queued for execution. 2-day timelock starts."],
              ["Executed", "purple", "Proposal executed on-chain."],
              ["Canceled", "gray", "Proposal canceled by proposer or owner."],
            ].map(([state, color, desc]) => (
              <div key={state as string} className="flex items-start gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-300 whitespace-nowrap`}>{state as string}</span>
                <span className="text-muted-foreground">{desc as string}</span>
              </div>
            ))}
          </div>
        </SubSection>
      </Section>

      {/* Voting */}
      <Section id="voting" title="Voting on Proposals">
        <SubSection title="How to Vote">
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Go to <Link href="/proposals" className="text-primary underline">Proposals</Link> and click a proposal with "Active" status</li>
            <li>Connect your wallet if not already connected</li>
            <li>Choose how many votes to cast (1 vote = 1 GDAO, 4 votes = 16 GDAO, etc.)</li>
            <li>Click "Vote" — MetaMask will open to confirm the transaction</li>
            <li>Your GDAO tokens are burned as the voting cost</li>
          </ol>
        </SubSection>
        <InfoBox type="warning">
          <strong>Votes burn tokens.</strong> When you vote, the GDAO tokens used as the quadratic cost are permanently burned. You cannot get them back. Think carefully about how many votes to cast.
        </InfoBox>
        <SubSection title="Voting Power">
          <p className="text-sm text-muted-foreground">
            Your voting power equals your GDAO balance (or the balance of whoever delegated to you).
            You can check your voting power on the <Link href="/governance" className="text-primary underline">Governance page</Link>.
          </p>
        </SubSection>
      </Section>

      {/* Quadratic Voting */}
      <Section id="quadratic-voting" title="Quadratic Voting Explained">
        <p className="text-muted-foreground mb-4 text-sm">
          Quadratic voting makes it expensive to cast many votes, preventing wealthy token holders from dominating governance.
          The cost to cast <em>n</em> votes is <em>n²</em> tokens.
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border px-4 py-2 text-left">Votes cast</th>
                <th className="border px-4 py-2 text-left">GDAO cost</th>
                <th className="border px-4 py-2 text-left">Cost per vote</th>
              </tr>
            </thead>
            <tbody>
              {[[1,1,"1.0"],[2,4,"2.0"],[4,16,"4.0"],[9,81,"9.0"],[10,100,"10.0"],[31,961,"31.0"],[100,10000,"100.0"]].map(([v,c,cpp]) => (
                <tr key={v} className="border-b">
                  <td className="border px-4 py-2">{v} vote{Number(v)>1?'s':''}</td>
                  <td className="border px-4 py-2 font-medium">{c} GDAO</td>
                  <td className="border px-4 py-2 text-muted-foreground">{cpp} GDAO/vote</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <InfoBox type="tip">
          With 1,000 GDAO you can cast a maximum of 31 votes (31² = 961 ≤ 1000). Use the Quadratic Vote button on a proposal to calculate the optimal number of votes for your balance.
        </InfoBox>
      </Section>

      {/* Delegation */}
      <Section id="delegation" title="Delegating Voting Power">
        <p className="text-sm text-muted-foreground mb-4">
          Delegation lets you give your voting power to another address without transferring your tokens.
          The delegatee can vote on your behalf. You can revoke delegation at any time.
        </p>
        <SubSection title="Key Points">
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Delegation is all-or-nothing — you delegate your entire balance, not a specific amount</li>
            <li>Your tokens stay in your wallet — only voting power moves</li>
            <li>The delegatee cannot transfer or spend your tokens</li>
            <li>Revoke delegation anytime to get your voting power back instantly</li>
            <li>To split voting power, transfer some GDAO to a second wallet first</li>
          </ul>
        </SubSection>
        <InfoBox type="info">
          Manage delegation on the <Link href="/governance" className="underline font-medium">Governance page</Link> under "Delegation Status".
        </InfoBox>
      </Section>

      {/* Treasury */}
      <Section id="treasury" title="Treasury Management">
        <p className="text-sm text-muted-foreground mb-4">
          The DAO treasury holds ETH that can only be spent via governance proposals.
          Anyone can deposit ETH into the treasury. Withdrawals require a passed and executed proposal.
        </p>
        <SubSection title="Depositing to Treasury">
          <p className="text-sm text-muted-foreground">
            Go to the <Link href="/treasury" className="text-primary underline">Treasury page</Link> and use the "Deposit ETH" form.
            You can also send ETH directly to the contract address: <span className="font-mono text-xs">0x84Ba28d277ded98b3488C906E90B6435B116D5b4</span>
          </p>
        </SubSection>
        <SubSection title="Withdrawing from Treasury">
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Create a "Treasury Management" proposal with the recipient and amount</li>
            <li>Community votes on the proposal (7-day voting period)</li>
            <li>If passed (≥1,000 votes), owner queues the proposal</li>
            <li>After 2-day timelock, proposal can be executed</li>
            <li>ETH is transferred to the recipient</li>
          </ol>
        </SubSection>
        <SubSection title="Treasury Managers">
          <p className="text-sm text-muted-foreground">
            Addresses with the Treasury Manager role can withdraw directly without a proposal.
            The owner can assign this role on the <Link href="/governance" className="text-primary underline">Governance page</Link> → Manage Roles.
          </p>
        </SubSection>
      </Section>

      {/* Governance Parameters */}
      <Section id="governance-params" title="Governance Parameters">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border px-4 py-2 text-left">Parameter</th>
                <th className="border px-4 py-2 text-left">Current Value</th>
                <th className="border px-4 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Voting Delay", "1 hour", "Time between proposal creation and voting start"],
                ["Voting Period", "7 days", "How long voting is open"],
                ["Proposal Threshold", "1,000 GDAO", "Minimum voting power to create a proposal"],
                ["Quorum", "1,000 votes", "Minimum votes for a proposal to pass"],
                ["Max Votes/Wallet", "10,000 votes", "Maximum votes one wallet can cast per proposal"],
                ["Proposal Cooldown", "1 hour", "Minimum time between proposals from same address"],
                ["Timelock Delay", "2 days", "Delay between queuing and executing a proposal"],
              ].map(([param, val, desc]) => (
                <tr key={param as string} className="border-b">
                  <td className="border px-4 py-2 font-medium">{param as string}</td>
                  <td className="border px-4 py-2 text-primary font-mono">{val as string}</td>
                  <td className="border px-4 py-2 text-muted-foreground">{desc as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <InfoBox type="info">
          These parameters can be changed via governance proposals. The owner can also update them directly.
        </InfoBox>
      </Section>

      {/* Smart Contracts */}
      <Section id="smart-contracts" title="Smart Contracts">
        <SubSection title="Diamond Contract (Proxy)">
          <div className="bg-muted rounded-lg p-4 text-sm font-mono mb-3">
            <div className="text-muted-foreground mb-1">Sepolia Testnet</div>
            <a href="https://sepolia.etherscan.io/address/0x84Ba28d277ded98b3488C906E90B6435B116D5b4" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
              0x84Ba28d277ded98b3488C906E90B6435B116D5b4
            </a>
          </div>
        </SubSection>
        <SubSection title="Deployed Facets">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border px-3 py-2 text-left">Facet</th>
                  <th className="border px-3 py-2 text-left">Address</th>
                  <th className="border px-3 py-2 text-left">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["DiamondCutFacet", "0x950C30...", "Upgrade the diamond"],
                  ["DiamondLoupeFacet", "0xeA665e...", "Inspect facets and selectors"],
                  ["GNUSDAOOwnershipFacet", "0x87fDe6...", "Access control and roles"],
                  ["GNUSDAOGovernanceTokenFacet", "0x9796bD...", "ERC20 token + delegation"],
                  ["GNUSDAOGovernanceFacet", "0xC5fcb5...", "Proposals, voting, treasury"],
                  ["GNUSDAOVotingMechanismsFacet", "0x767469...", "Quadratic math calculations"],
                  ["GNUSDAOInitFacet", "0xE1dcf8...", "One-time initialization"],
                ].map(([name, addr, purpose]) => (
                  <tr key={name as string} className="border-b">
                    <td className="border px-3 py-2 font-medium">{name as string}</td>
                    <td className="border px-3 py-2 font-mono text-muted-foreground">{addr as string}</td>
                    <td className="border px-3 py-2 text-muted-foreground">{purpose as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SubSection>
        <SubSection title="Diamond Pattern (ERC-2535)">
          <p className="text-sm text-muted-foreground">
            The contract uses the Diamond Pattern — a single proxy address that delegates calls to multiple implementation contracts (facets).
            This allows upgrading individual features without redeploying the entire contract or losing state.
            All facets share the same storage via namespaced storage slots.
          </p>
        </SubSection>
      </Section>

      {/* FAQ */}
      <Section id="faq" title="FAQ">
        <div className="space-y-4">
          {[
            ["Why do my votes burn tokens?",
             "Quadratic voting requires burning tokens as the cost of voting. This prevents wealthy holders from dominating governance by making it exponentially expensive to cast many votes."],
            ["Can I get my tokens back after voting?",
             "No. Burned tokens are permanently removed from supply. This is by design — it creates a real cost for governance participation."],
            ["Why does my proposal show 'Pending'?",
             "There's a 1-hour voting delay after proposal creation. The proposal will become Active automatically after that delay."],
            ["Why can't I create a proposal?",
             "You need at least 1,000 GDAO voting power. Also there's a 1-hour cooldown between proposals from the same address."],
            ["What happens if a proposal doesn't reach quorum?",
             "If fewer than 1,000 total votes are cast, the proposal is Defeated and cannot be executed."],
            ["Can I cancel my proposal?",
             "Yes, the proposer can cancel a proposal before it's queued. The owner can cancel at any time before execution."],
            ["Is this on mainnet?",
             "No, GNUS DAO is currently deployed on Sepolia testnet for testing. Mainnet deployment is planned for the future."],
            ["How do I get GDAO tokens?",
             "On testnet, GDAO can be transferred from the deployer wallet. The deployer holds 5,000,000 GDAO. Contact the team to receive test tokens."],
          ].map(([q, a]) => (
            <div key={q as string} className="bg-card border rounded-lg p-4">
              <p className="font-medium mb-2 text-sm">{q as string}</p>
              <p className="text-sm text-muted-foreground">{a as string}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Support */}
      <div className="bg-muted rounded-xl p-6 text-center">
        <h3 className="text-xl font-semibold mb-2">Need Help?</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Can't find what you're looking for? Check the GitHub repository or open an issue.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="outline" asChild>
            <a href="https://github.com/GeniusVentures/gnus-dao-website" target="_blank" rel="noopener noreferrer">
              GitHub <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://sepolia.etherscan.io/address/0x84Ba28d277ded98b3488C906E90B6435B116D5b4" target="_blank" rel="noopener noreferrer">
              Etherscan <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
