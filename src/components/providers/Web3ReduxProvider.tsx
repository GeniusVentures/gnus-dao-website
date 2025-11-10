"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { initializeWeb3 } from "@/lib/store/slices/web3Slice";
import {
  handleAccountsChanged,
  handleChainChanged,
  refreshBalance,
} from "@/lib/store/slices/walletSlice";
import { initializeGnusDao } from "@/lib/store/slices/gnusDaoSlice";

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

  return <>{children}</>;
}
