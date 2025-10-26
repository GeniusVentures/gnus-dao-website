"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/store";
import { ethers } from "ethers";
import {
  transactionHistoryService,
  Transaction,
  TransactionType,
} from "@/lib/services/transactionHistoryService";
import { ArrowDownTrayIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";

export default function HistoryPage() {
  const { address } = useAppSelector((state) => state.wallet);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TransactionType | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (address) {
      loadTransactionHistory();
    }
  }, [address]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterType, searchQuery]);

  const loadTransactionHistory = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      await transactionHistoryService.initialize(provider);

      // Get transactions from the last 10000 blocks (adjust as needed)
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      const history = await transactionHistoryService.getTransactionHistory(
        address,
        fromBlock,
        "latest"
      );

      setTransactions(history);
    } catch (error) {
      console.error("Error loading transaction history:", error);
    } finally {
      setLoading(false);
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

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Transaction History</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to view transaction history
          </p>
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
                onChange={(e) => setFilterType(e.target.value as TransactionType | "ALL")}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value={TransactionType.PROPOSAL_CREATED}>Proposals</option>
                <option value={TransactionType.VOTE_CAST}>Votes</option>
                <option value={TransactionType.DELEGATION}>Delegations</option>
                <option value={TransactionType.TOKEN_TRANSFER}>Transfers</option>
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
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading transaction history...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <p className="text-gray-600 dark:text-gray-400">No transactions found</p>
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
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(tx.type)}`}>
                      {tx.type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(tx.timestamp * 1000), { addSuffix: true })}
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
                  <div className="text-sm text-gray-500 dark:text-gray-400">Block #{tx.blockNumber}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

