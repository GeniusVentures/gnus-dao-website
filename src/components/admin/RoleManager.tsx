"use client";

import { Button } from "@/components/ui/Button";
import { gnusDaoService } from "@/lib/contracts/gnusDaoService";
import { useWeb3Store } from "@/lib/web3/reduxProvider";
import { resolveEnsName } from "@/lib/utils";
import {
  Shield,
  UserPlus,
  UserMinus,
  Crown,
  Coins,
  Vault,
  XCircle,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface RoleManagerProps {
  onClose: () => void;
}

interface UserRole {
  address: string;
  ensName?: string;
  isTreasuryManager: boolean;
  isOwner: boolean;
}

export function RoleManager({ onClose }: RoleManagerProps) {
  const { wallet } = useWeb3Store();
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState<"treasury">("treasury");
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    loadRoleData();
  }, [wallet.address]);

  const loadRoleData = async () => {
    if (!wallet.address) return;

    setLoadingUsers(true);
    try {
      // Check if current user is owner
      const owner = await gnusDaoService.getOwner();
      const userIsOwner = owner.toLowerCase() === wallet.address.toLowerCase();
      setIsOwner(userIsOwner);

      // Load known users (this would typically come from your backend or indexer)
      // For now, we'll just show the current user and owner
      const knownAddresses = [wallet.address, owner];
      const uniqueAddresses = [...new Set(knownAddresses)];

      const userRoles: UserRole[] = await Promise.all(
        uniqueAddresses.map(async (address) => {
          const [isTreasuryManager, ensName] = await Promise.all([
            gnusDaoService.isTreasuryManager(address),
            resolveEnsName(address),
          ]);

          return {
            address,
            ensName: ensName ?? undefined,
            isTreasuryManager,
            isOwner: address.toLowerCase() === owner.toLowerCase(),
          };
        })
      );

      setUsers(userRoles);
    } catch (error) {
      console.error("Error loading role data:", error);
      toast.error("Failed to load role information");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddRole = async () => {
    if (!newAddress || !isOwner) return;

    // Resolve ENS name if needed
    let resolvedAddress = newAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(resolvedAddress)) {
      if (resolvedAddress.includes(".")) {
        try {
          const { ethers } = await import("ethers");
          const mainnet = new ethers.JsonRpcProvider("https://ethereum.publicnode.com");
          const resolved = await mainnet.resolveName(resolvedAddress);
          if (!resolved) {
            toast.error(`Could not resolve ENS name: ${resolvedAddress}`);
            return;
          }
          resolvedAddress = resolved;
        } catch {
          toast.error(`Failed to resolve ENS name: ${resolvedAddress}`);
          return;
        }
      } else {
        toast.error("Invalid Ethereum address");
        return;
      }
    }

    setLoading(true);
    try {
      if (selectedRole === "treasury") {
        await gnusDaoService.addTreasuryManager(resolvedAddress);
        toast.success("Treasury manager added successfully!");
      } else if (selectedRole === "minter") {
        // Note: This would need to be implemented in the service
        // await gnusDaoService.addMinter(newAddress);
        toast.error("Minter role management not yet implemented in contract");
        return;
      }

      setNewAddress("");
      await loadRoleData(); // Refresh the list
    } catch (error: any) {
      console.error("Error adding role:", error);
      toast.error(error.message || "Failed to add role");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (address: string, role: "treasury") => {
    if (!isOwner) return;

    setLoading(true);
    try {
      if (role === "treasury") {
        await gnusDaoService.removeTreasuryManager(address);
        toast.success("Treasury manager removed successfully!");
      } else if (role === "minter") {
        // Note: This would need to be implemented in the service
        // await gnusDaoService.removeMinter(address);
        toast.error("Minter role management not yet implemented in contract");
        return;
      }

      await loadRoleData(); // Refresh the list
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast.error(error.message || "Failed to remove role");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRoleIcon = (role: "treasury" | "minter" | "owner") => {
    switch (role) {
      case "treasury":
        return <Vault className="w-4 h-4" />;
      case "minter":
        return <Coins className="w-4 h-4" />;
      case "owner":
        return <Crown className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: "treasury" | "minter" | "owner") => {
    switch (role) {
      case "treasury":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/20";
      case "minter":
        return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "owner":
        return "text-purple-600 bg-purple-100 dark:bg-purple-900/20";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Role Management
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage treasury managers and minters
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {!isOwner && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  Only the contract owner can manage roles
                </span>
              </div>
            </div>
          )}

          {/* Add New Role */}
          {isOwner && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                Add New Role
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedRole("treasury")}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    >
                      <Vault className="w-4 h-4" />
                      Treasury Manager
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleAddRole}
                  disabled={loading || !newAddress}
                  className="w-full"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding Role...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span>Add Role</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Current Roles */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Current Roles
            </h3>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading roles...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No roles found
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.address}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.ensName || formatAddress(user.address)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.address}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Role Badges */}
                        {user.isOwner && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor("owner")}`}>
                            {getRoleIcon("owner")}
                            Owner
                          </span>
                        )}
                        
                        {user.isTreasuryManager && (
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor("treasury")}`}>
                              {getRoleIcon("treasury")}
                              Treasury Manager
                            </span>
                            {isOwner && !user.isOwner && (
                              <button
                                onClick={() => handleRemoveRole(user.address, "treasury")}
                                disabled={loading}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove treasury manager role"
                              >
                                <UserMinus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        {!user.isOwner && !user.isTreasuryManager && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            No roles
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}