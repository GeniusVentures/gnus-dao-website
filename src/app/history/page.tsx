"use client";

import {
  Transaction,
  TransactionType,
} from "@/lib/services/transactionHistoryService";
import { useAppSelector } from "@/lib/store";
import { ArrowDownTrayIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { ethers } from "ethers";
import { useEffect, useState } from "react";

const DIAMOND = "0x84Ba28d277ded98b3488C906E90B6435B116D5b4";
const BLOCK_RANGE = 216000; // ~30 days on Sepolia
// Infura is reliable for large eth_getLogs — public RPCs often silently fail
const INFURA_RPC = "https://sepolia.infura.io/v3/a9555646b9fb4da6ab4cc08c782f85ee";

const ABI = [
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, string ipfsHash, uint256 startTime, uint256 endTime)',
  'event VoteCast(uint256 indexed proposalId, address indexed voter, uint256 votes, uint256 tokensCost)',
  'event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];
const IFACE = new ethers.Interface(ABI);

export default function HistoryPage() {
  const { address } = useAppSelector((state) => state.wallet);
  const [manualAddress, setManualAddress] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<TransactionType | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Load when wallet address is available, or when manually entered
  const activeAddress = address || manualAddress;

  useEffect(() => {
    if (activeAddress) loadTransactionHistory(activeAddress);
  }, [activeAddress]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterType, searchQuery]);

  const loadTransactionHistory = async (addr: string) => {
    setLoading(true);
    setError(null);
    setTransactions([]);
    try {
      setLoadingStatus("Connecting to Sepolia...");
      const provider = new ethers.JsonRpcProvider(INFURA_RPC);
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - BLOCK_RANGE);

      setLoadingStatus("Fetching events...");
      const topics = {
        ProposalCreated: IFACE.getEvent('ProposalCreated')!.topicHash,
        VoteCast: IFACE.getEvent('VoteCast')!.topicHash,
        DelegateChanged: IFACE.getEvent('DelegateChanged')!.topicHash,
        Transfer: IFACE.getEvent('Transfer')!.topicHash,
      };
      const addrPadded = ethers.zeroPadValue(addr.toLowerCase(), 32);

      const [proposals, votes, delegates, transfersOut, transfersIn] = await Promise.all([
        provider.getLogs({ address: DIAMOND, topics: [topics.ProposalCreated, null, addrPadded], fromBlock, toBlock: 'latest' }).catch(() => []),
        provider.getLogs({ address: DIAMOND, topics: [topics.VoteCast, null, addrPadded], fromBlock, toBlock: 'latest' }).catch(() => []),
        provider.getLogs({ address: DIAMOND, topics: [topics.DelegateChanged, addrPadded], fromBlock, toBlock: 'latest' }).catch(() => []),
        provider.getLogs({ address: DIAMOND, topics: [topics.Transfer, addrPadded, null], fromBlock, toBlock: 'latest' }).catch(() => []),
        provider.getLogs({ address: DIAMOND, topics: [topics.Transfer, null, addrPadded], fromBlock, toBlock: 'latest' }).catch(() => []),
      ]);

      const allLogs = [...proposals, ...votes, ...delegates, ...transfersOut, ...transfersIn];
      setLoadingStatus(`Loading ${allLogs.length} events...`);

      // Batch-fetch unique block timestamps
      const uniqueBlocks = [...new Set(allLogs.map(e => e.blockNumber))];
      const blockMap = new Map<number, number>();
      await Promise.all(
        uniqueBlocks.map(async (bn) => {
          const b = await provider.getBlock(bn);
          if (b) blockMap.set(bn, b.timestamp);
        })
      );

      const txs: Transaction[] = [];
      const seen = new Set<string>();

      const push = (e: ethers.Log, type: TransactionType, details: Transaction['details']) => {
        const id = `${e.transactionHash}-${e.index}`;
        if (seen.has(id)) return;
        seen.add(id);
        txs.push({
          id,
          type,
          timestamp: blockMap.get(e.blockNumber) ?? 0,
          blockNumber: e.blockNumber,
          txHash: e.transactionHash,
          from: addr,
          details,
        });
      };

      for (const e of proposals) {
        const p = IFACE.parseLog(e);
        if (p) push(e, TransactionType.PROPOSAL_CREATED, { proposalId: p.args.proposalId, proposalTitle: p.args.title });
      }
      for (const e of votes) {
        const p = IFACE.parseLog(e);
        if (p) push(e, TransactionType.VOTE_CAST, { proposalId: p.args.proposalId, votes: p.args.votes, tokensCost: p.args.tokensCost });
      }
      for (const e of delegates) {
        const p = IFACE.parseLog(e);
        if (!p) continue;
        const to = p.args.toDelegate as string;
        const type = (to === ethers.ZeroAddress || to.toLowerCase() === addr.toLowerCase())
          ? TransactionType.DELEGATION_REVOKED
          : TransactionType.DELEGATION;
        push(e, type, { delegatee: to });
      }
      for (const e of [...transfersOut, ...transfersIn]) {
        const p = IFACE.parseLog(e);
        if (p) push(e, TransactionType.TOKEN_TRANSFER, { to: p.args.to, amount: p.args.value });
      }

      txs.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(txs);
      setLoadingStatus("");
    } catch (err: any) {
      console.error("Error loading transaction history:", err);
      setError(err?.message || "Failed to load history. Please try again.");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by type
    if (filterType !== "ALL") {
      filtered = filtered.filter((tx) => tx.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((tx) => {
        const query = searchQuery.toLowerCase();
        return (
          tx.txHash.toLowerCase().includes(query) ||
          tx.details.proposalTitle?.toLowerCase().includes(query) ||
          tx.details.delegatee?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredTransactions(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Type", "Date", "Transaction Hash", "Details"];
    const rows = filteredTransactions.map((tx) => [
      tx.type,
      new Date(tx.timestamp * 1000).toISOString(),
      tx.txHash,
      getTransactionDetails(tx),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gnus-dao-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTransactionDetails = (tx: Transaction): string => {
    switch (tx.type) {
      case TransactionType.PROPOSAL_CREATED:
        return `Created: ${tx.details.proposalTitle}`;
      case TransactionType.VOTE_CAST:
        return `Voted ${tx.details.votes} on: ${tx.details.proposalTitle}`;
      case TransactionType.DELEGATION:
        return `Delegated to: ${tx.details.delegatee}`;
      case TransactionType.DELEGATION_REVOKED:
        return `Revoked delegation`;
      case TransactionType.PROPOSAL_EXECUTED:
        return `Executed: ${tx.details.proposalTitle}`;
      case TransactionType.PROPOSAL_CANCELLED:
        return `Cancelled: ${tx.details.proposalTitle}`;
      case TransactionType.TOKEN_TRANSFER:
        return `${tx.from === address ? "Sent" : "Received"} ${ethers.formatEther(tx.details.amount || 0n)} GNUS`;
      default:
        return "";
    }
  };

  const getTypeColor = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.PROPOSAL_CREATED:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case TransactionType.VOTE_CAST:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case TransactionType.DELEGATION:
      case TransactionType.DELEGATION_REVOKED:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case TransactionType.PROPOSAL_EXECUTED:
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case TransactionType.PROPOSAL_CANCELLED:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case TransactionType.TOKEN_TRANSFER:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (!activeAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all governance actions and token transfers for any address
          </p>
        </div>
        <div className="bg-card border rounded-lg p-6 max-w-lg">
          <p className="text-sm text-muted-foreground mb-3">
            Connect your wallet, or enter an address to look up history:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="0x..."
              value={manualAddress}
              onChange={e => setManualAddress(e.target.value)}
              className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => manualAddress && loadTransactionHistory(manualAddress)}
              disabled={!manualAddress || !ethers.isAddress(manualAddress)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-gray-600 dark:text-gray-400">
          View all your governance actions and token transfers
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          {activeAddress}
          <button
            onClick={() => loadTransactionHistory(activeAddress)}
            className="ml-3 text-primary hover:underline"
          >
            ↻ Reload
          </button>
        </p>
      </div>

      {/* Filters and Export */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as TransactionType | "ALL")
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value={TransactionType.PROPOSAL_CREATED}>
                  Proposals
                </option>
                <option value={TransactionType.VOTE_CAST}>Votes</option>
                <option value={TransactionType.DELEGATION}>Delegations</option>
                <option value={TransactionType.TOKEN_TRANSFER}>
                  Transfers
                </option>
              </select>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search by hash or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Export CSV
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredTransactions.length} of {transactions.length}{" "}
          transactions
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {loadingStatus || "Loading transaction history..."}
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300 mb-3">{error}</p>
          <button
            onClick={() => loadTransactionHistory(activeAddress)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Retry
          </button>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <p className="text-gray-600 dark:text-gray-400">
            No transactions found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(tx.type)}`}
                    >
                      {tx.type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(tx.timestamp * 1000), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium mb-1">
                    {getTransactionDetails(tx)}
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                  </a>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Block #{tx.blockNumber}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
