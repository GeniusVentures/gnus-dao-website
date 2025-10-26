"use client";

import React, { useState, useEffect } from "react";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { DelegationManager } from "@/components/governance/DelegationManager";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { Settings, Shield, Pause, User } from "lucide-react";

interface GovernanceConfig {
  votingDelay: bigint;
  votingPeriod: bigint;
  proposalThreshold: bigint;
  quorumVotes: bigint;
}

interface UserPermissions {
  isOwner: boolean;
  isTreasuryManager: boolean;
  isMinter: boolean;
  isPaused: boolean;
}

export default function GovernanceClient() {
  const { wallet } = useWeb3Store();
  const { address, isConnected } = wallet;
  
  const [config, setConfig] = useState<GovernanceConfig | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({
    isOwner: false,
    isTreasuryManager: false,
    isMinter: false,
    isPaused: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGovernanceData();
  }, [isConnected, address]);

  const loadGovernanceData = async () => {
    setIsLoading(true);
    try {
      const governanceParams = await gnusDaoService.getGovernanceParams();
      if (governanceParams) {
        setConfig(governanceParams);
      }

      if (address) {
        const [owner, isTreasuryManager, isMinter, isPaused] = await Promise.all([
          gnusDaoService.getOwner(),
          gnusDaoService.isTreasuryManager(address),
          gnusDaoService.isMinter(address),
          gnusDaoService.isPaused(),
        ]);

        setPermissions({
          isOwner: owner.toLowerCase() === address.toLowerCase(),
          isTreasuryManager,
          isMinter,
          isPaused,
        });
      }
    } catch (error) {
      console.error("Error loading governance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Governance
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your voting power, view governance settings, and check your permissions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Delegation */}
        <div className="lg:col-span-2">
          <DelegationManager />
        </div>

        {/* Right Column - Config & Permissions */}
        <div className="space-y-6">
          {/* Governance Configuration */}
          <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Governance Config
            </h3>

            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : config ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Voting Delay</span>
                  <span className="font-semibold">{config.votingDelay.toString()} blocks</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Voting Period</span>
                  <span className="font-semibold">{config.votingPeriod.toString()} blocks</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Proposal Threshold</span>
                  <span className="font-semibold">{config.proposalThreshold.toString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Quorum</span>
                  <span className="font-semibold">{config.quorumVotes.toString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Failed to load configuration
              </p>
            )}
          </div>

          {/* User Permissions */}
          {isConnected && (
            <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Your Permissions
              </h3>

              <div className="space-y-2">
                {permissions.isPaused && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <Pause className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">
                      Contract Paused
                    </span>
                  </div>
                )}

                <PermissionBadge
                  label="Owner"
                  active={permissions.isOwner}
                  icon={<User className="w-4 h-4" />}
                />
                <PermissionBadge
                  label="Treasury Manager"
                  active={permissions.isTreasuryManager}
                  icon={<Shield className="w-4 h-4" />}
                />
                <PermissionBadge
                  label="Minter"
                  active={permissions.isMinter}
                  icon={<Settings className="w-4 h-4" />}
                />

                {!permissions.isOwner && !permissions.isTreasuryManager && !permissions.isMinter && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No special permissions
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PermissionBadge({ label, active, icon }: { label: string; active: boolean; icon: React.ReactNode }) {
  return (
    <div className={`
      flex items-center justify-between p-3 rounded-lg border
      ${active
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
      }
    `}>
      <div className="flex items-center gap-2">
        <div className={active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
          {icon}
        </div>
        <span className={`text-sm font-medium ${active ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
          {label}
        </span>
      </div>
      <div className={`
        w-2 h-2 rounded-full
        ${active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
      `} />
    </div>
  );
}

