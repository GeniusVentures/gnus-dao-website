"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { initializeWeb3 } from "@/lib/store/slices/web3Slice";
import {
  handleAccountsChanged,
  handleChainChanged,
  refreshBalance,
} from "@/lib/store/slices/walletSlice";
import { initializeGnusDao, refreshGnusDaoData } from "@/lib/store/slices/gnusDaoSlice";

interface Web3ReduxProviderProps {
  children: React.ReactNode;
}

export function Web3ReduxProvider({ children }: Web3ReduxProviderProps) {
  const dispatch = useAppDispatch();
  const { isConnected, address } = useAppSelector((state) => state.wallet);
  const { isInitialized } = useAppSelector((state) => state.web3);

  useEffect(() => {
    // Initialize Web3 store
    if (!isInitialized) {
      dispatch(initializeWeb3());
    }
  }, [dispatch, isInitialized]);

  useEffect(() => {
    // Set up event listeners when wallet is connected
    if (isConnected && (window as any).ethereum) {
      const handleAccountsChangedEvent = (accounts: string[]) => {
        dispatch(handleAccountsChanged(accounts));
        if (accounts.length > 0) {
          dispatch(refreshBalance());
        }
      };

      const handleChainChangedEvent = (chainId: string) => {
        dispatch(handleChainChanged(chainId));
        dispatch(refreshBalance());
      };

      const handleDisconnectEvent = () => {
        // This will be handled by the disconnect action
      };

      (window as any).ethereum.on(
        "accountsChanged",
        handleAccountsChangedEvent,
      );
      (window as any).ethereum.on("chainChanged", handleChainChangedEvent);
      (window as any).ethereum.on("disconnect", handleDisconnectEvent);

      return () => {
        (window as any).ethereum.removeListener(
          "accountsChanged",
          handleAccountsChangedEvent,
        );
        (window as any).ethereum.removeListener(
          "chainChanged",
          handleChainChangedEvent,
        );
        (window as any).ethereum.removeListener(
          "disconnect",
          handleDisconnectEvent,
        );
      };
    }
    // Return undefined if no cleanup is needed
    return undefined;
  }, [dispatch, isConnected]);

  useEffect(() => {
    // Initialize GNUS DAO when wallet is connected
    if (isConnected && address) {
      dispatch(initializeGnusDao());
    }
  }, [dispatch, isConnected, address]);

  // Subscribe to contract events for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    let cleanupFns: (() => void)[] = [];

    const subscribeToEvents = async () => {
      try {
        const { gnusDaoService } = await import('@/lib/contracts/gnusDaoService');
        if (!gnusDaoService.isInitialized()) return;

        const contract = (gnusDaoService as any).contract;
        if (!contract) return;

        // Define event handlers that refresh DAO data
        const handleProposalEvent = () => {
          dispatch(refreshGnusDaoData());
        };

        // Subscribe to governance events (only events confirmed in the deployed Diamond ABI)
        const events = [
          'ProposalCreated',
          'VoteCast',
          'ProposalExecuted',
          'ProposalCancelled',
          // NOTE: QuadraticVoteCast is NOT in the deployed Diamond ABI — do not add it here
        ];

        for (const eventName of events) {
          try {
            contract.on(eventName, handleProposalEvent);
            cleanupFns.push(() => {
              try { contract.off(eventName, handleProposalEvent); } catch { /* ignore */ }
            });
          } catch {
            // Event not available on this contract version
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Could not subscribe to contract events:', error);
        }
      }
    };

    subscribeToEvents();

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, [dispatch, isConnected]);

  return <>{children}</>;
}
