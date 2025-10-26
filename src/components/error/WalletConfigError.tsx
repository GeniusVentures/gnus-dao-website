'use client'

interface WalletConfigErrorProps {
  error: string
  onRetry?: () => void
}

export function WalletConfigError({ error, onRetry }: WalletConfigErrorProps) {
  const isWalletConnectError = error.includes('WalletConnect') || error.includes('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')

  return (
    <div className="max-w-2xl mx-auto p-4 border border-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="text-red-500 mt-1">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
            Wallet Configuration Error
          </h3>
          <p className="text-red-700 dark:text-red-300 text-sm mb-3">{error}</p>

          {isWalletConnectError && (
            <div className="space-y-2 text-sm text-red-600 dark:text-red-400">
              <p>To enable wallet connectivity, configure WalletConnect:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Visit <a href="https://cloud.walletconnect.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                  WalletConnect Cloud ↗
                </a></li>
                <li>Create a new project</li>
                <li>Copy your Project ID</li>
                <li>Add it as <code className="bg-red-100 dark:bg-red-900 px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> environment variable</li>
              </ol>
            </div>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-3 py-1 text-sm border border-red-500 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
