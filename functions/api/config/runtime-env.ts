/**
 * Cloudflare Worker: Runtime Environment Config
 * Serves environment variables to the frontend at runtime
 * GET /api/config/runtime-env
 */

interface Env {
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string;
  NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS?: string;
  NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS?: string;
  NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS?: string;
  NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS?: string;
  NEXT_PUBLIC_PINATA_API_KEY?: string;
  NEXT_PUBLIC_PINATA_SECRET_KEY?: string;
  NEXT_PUBLIC_PINATA_JWT?: string;
  NEXT_PUBLIC_IPFS_GATEWAY?: string;
  NEXT_PUBLIC_IPFS_API_URL?: string;
  NEXT_PUBLIC_IPFS_API_KEY?: string;
  NEXT_PUBLIC_IPFS_API_SECRET?: string;
  NEXT_PUBLIC_ANALYTICS_ID?: string;
  NEXT_PUBLIC_API_BASE_URL?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  const runtimeEnv = {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS:
      env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS || '',
    NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS:
      env.NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS || '',
    NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS:
      env.NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS || '',
    NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS:
      env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS || '',
    NEXT_PUBLIC_PINATA_API_KEY: env.NEXT_PUBLIC_PINATA_API_KEY || '',
    NEXT_PUBLIC_PINATA_SECRET_KEY: env.NEXT_PUBLIC_PINATA_SECRET_KEY || '',
    NEXT_PUBLIC_PINATA_JWT: env.NEXT_PUBLIC_PINATA_JWT || '',
    NEXT_PUBLIC_IPFS_GATEWAY:
      env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
    NEXT_PUBLIC_IPFS_API_URL: env.NEXT_PUBLIC_IPFS_API_URL || '',
    NEXT_PUBLIC_IPFS_API_KEY: env.NEXT_PUBLIC_IPFS_API_KEY || '',
    NEXT_PUBLIC_IPFS_API_SECRET: env.NEXT_PUBLIC_IPFS_API_SECRET || '',
    NEXT_PUBLIC_ANALYTICS_ID: env.NEXT_PUBLIC_ANALYTICS_ID || '',
    NEXT_PUBLIC_API_BASE_URL: env.NEXT_PUBLIC_API_BASE_URL || '',
  };

  return new Response(JSON.stringify(runtimeEnv), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
