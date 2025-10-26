"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/store";
import {
  Bell,
  Globe,
  Shield,
  Vote,
  DollarSign,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import { useTheme } from "next-themes";

interface Settings {
  voting: {
    autoDelegate: boolean;
    voteReminders: boolean;
    quadraticVoting: boolean;
  };
  notifications: {
    proposalCreated: boolean;
    votingStarted: boolean;
    votingEnded: boolean;
    proposalExecuted: boolean;
    emailNotifications: boolean;
  };
  display: {
    currency: "USD" | "ETH" | "EUR" | "GBP";
    language: "en" | "es" | "fr" | "de" | "zh";
    theme: "light" | "dark" | "system";
  };
  privacy: {
    showAddress: boolean;
    showVotingHistory: boolean;
    analyticsTracking: boolean;
  };
}

const defaultSettings: Settings = {
  voting: {
    autoDelegate: false,
    voteReminders: true,
    quadraticVoting: true,
  },
  notifications: {
    proposalCreated: true,
    votingStarted: true,
    votingEnded: true,
    proposalExecuted: true,
    emailNotifications: false,
  },
  display: {
    currency: "USD",
    language: "en",
    theme: "system",
  },
  privacy: {
    showAddress: true,
    showVotingHistory: true,
    analyticsTracking: true,
  },
};

export default function SettingsPage() {
  const { address } = useAppSelector((state) => state.wallet);
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    if (address) {
      const savedSettings = localStorage.getItem(`settings-${address}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    }
  }, [address]);

  const updateSetting = (
    category: keyof Settings,
    key: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const saveSettings = () => {
    if (address) {
      localStorage.setItem(`settings-${address}`, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Apply theme setting
      if (settings.display.theme) {
        setTheme(settings.display.theme);
      }
    }
  };

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to access settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your GNUS DAO experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Voting Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Vote className="h-5 w-5 mr-2 text-blue-600" />
            Voting Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-delegate to self</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically delegate voting power to yourself
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.voting.autoDelegate}
                  onChange={(e) =>
                    updateSetting("voting", "autoDelegate", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Vote reminders</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get notified when proposals are ending soon
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.voting.voteReminders}
                  onChange={(e) =>
                    updateSetting("voting", "voteReminders", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Quadratic voting</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use quadratic voting by default
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.voting.quadraticVoting}
                  onChange={(e) =>
                    updateSetting("voting", "quadraticVoting", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-green-600" />
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New proposals</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notify when new proposals are created
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.proposalCreated}
                  onChange={(e) =>
                    updateSetting("notifications", "proposalCreated", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Voting started</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notify when voting period begins
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.votingStarted}
                  onChange={(e) =>
                    updateSetting("notifications", "votingStarted", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Voting ended</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notify when voting period ends
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.votingEnded}
                  onChange={(e) =>
                    updateSetting("notifications", "votingEnded", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Proposal executed</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notify when proposals are executed
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.proposalExecuted}
                  onChange={(e) =>
                    updateSetting("notifications", "proposalExecuted", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-purple-600" />
            Display Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Currency</label>
              <select
                value={settings.display.currency}
                onChange={(e) =>
                  updateSetting("display", "currency", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="ETH">ETH (Ξ)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">Language</label>
              <select
                value={settings.display.language}
                onChange={(e) =>
                  updateSetting("display", "language", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">Theme</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    updateSetting("display", "theme", "light");
                    setTheme("light");
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                    settings.display.theme === "light"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  <Sun className="h-5 w-5" />
                  Light
                </button>
                <button
                  onClick={() => {
                    updateSetting("display", "theme", "dark");
                    setTheme("dark");
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                    settings.display.theme === "dark"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  <Moon className="h-5 w-5" />
                  Dark
                </button>
                <button
                  onClick={() => {
                    updateSetting("display", "theme", "system");
                    setTheme("system");
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                    settings.display.theme === "system"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  <DollarSign className="h-5 w-5" />
                  System
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-red-600" />
            Privacy
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Show wallet address</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Display your address publicly
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.showAddress}
                  onChange={(e) =>
                    updateSetting("privacy", "showAddress", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Show voting history</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Make your votes public
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.showVotingHistory}
                  onChange={(e) =>
                    updateSetting("privacy", "showVotingHistory", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Analytics tracking</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Help improve the platform
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.analyticsTracking}
                  onChange={(e) =>
                    updateSetting("privacy", "analyticsTracking", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {saved ? (
              <>
                <Check className="h-5 w-5" />
                Saved!
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

