/** @type {import('next').NextConfig} */

const { withSentryConfig } = require("@sentry/nextjs");

// Environment detection
const isCloudflarePages = process.env.CLOUDFLARE_PAGES === "true";
const isProduction = process.env.NODE_ENV === "production";

const nextConfig = {
  // Static export configuration for SPA deployment
  output: "export",
  trailingSlash: false,
  distDir: "out",

  // Core Next.js optimizations
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,

  // Enhanced compression and optimization
  compress: true,
  generateEtags: true,

  // Enhanced performance optimizations
  experimental: {
    // Package import optimizations for better tree shaking
    optimizePackageImports: [
      "@heroicons/react",
      "react-hot-toast",
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "@walletconnect/ethereum-provider",
      "@reown/appkit",
      "ethers",
      "framer-motion",
      "@tanstack/react-query",
      "@reduxjs/toolkit",
    ],

    // Performance monitoring
    webVitalsAttribution: ["CLS", "LCP", "FID", "FCP", "TTFB"],

    // Advanced optimizations
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },

    // ESM handling
    esmExternals: "loose",
  },

  // Enhanced compiler optimizations
  compiler: {
    // Production optimizations
    removeConsole: isProduction
      ? {
        exclude: ["error", "warn"], // Keep error and warning logs
      }
      : false,

    // Remove test attributes and debug properties in production
    reactRemoveProperties: isProduction
      ? {
        properties: ["^data-testid$", "^data-test$", "^data-debug$"],
      }
      : false,
  },

  // Build-time optimizations
  eslint: {
    ignoreDuringBuilds: isProduction, // Only ignore in production builds
    dirs: ["src"], // Limit ESLint to src directory
  },

  // TypeScript optimizations
  typescript: {
    ignoreBuildErrors: isProduction, // Only ignore in production builds
    tsconfigPath: "./tsconfig.json",
  },

  // Enhanced image optimization for static export
  images: {
    // Disable optimization for static export
    unoptimized: true,

    // IPFS and project image domains
    remotePatterns: [
      // IPFS gateways
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "cloudflare-ipfs.com",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "dweb.link",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "ipfs.infura.io",
        pathname: "/ipfs/**",
      },
      // Project domains
      {
        protocol: "https",
        hostname: "gnus.ai",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "geniusventures.io",
        pathname: "/**",
      },
      // Cloudflare domains
      {
        protocol: "https",
        hostname: "*.cloudflare.com",
        pathname: "/**",
      },
      // CDN domains
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/**",
      },
    ],

    // Modern image formats with fallbacks
    formats: ["image/avif", "image/webp"],

    // Responsive breakpoints optimized for modern devices
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Enhanced webpack configuration for Web3 compatibility
  webpack: (config, { isServer }) => {

    // Enhanced node modules polyfills for Web3
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node.js built-ins
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: false,
        util: false,
        events: false,
        querystring: false,

        // Node.js prefixed modules
        "node:fs": false,
        "node:path": false,
        "node:crypto": false,
        "node:stream": false,
        "node:util": false,
        "node:url": false,
        "node:buffer": false,
        "node:events": false,
        "node:querystring": false,

        // Web3 and IPFS specific (Helia-compatible)
        multiformats: false,
        uint8arrays: false,
        "it-all": false,
        "it-map": false,
      };
    }

    // Enhanced ESM and module handling
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true,
      layers: true,
    };

    // Cloudflare-specific externals
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        "utf-8-validate": "commonjs utf-8-validate",
        bufferutil: "commonjs bufferutil",
        encoding: "commonjs encoding",
      });
    }

    // Enhanced resolve aliases for better compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      "@walletconnect/keyvaluestorage": require.resolve(
        "@walletconnect/keyvaluestorage",
      ),
      // Add more aliases for problematic packages
      "react-native-get-random-values": false,
      "react-native": false,
    };

    // Enhanced module rules for better compatibility
    config.module.rules.push(
      // Handle ES modules
      {
        test: /\.m?js$/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      },
      // Handle SVG files
      {
        test: /\.svg$/,
        use: ["@svgr/webpack"],
      },
      // Handle WASM files for Cloudflare
      {
        test: /\.wasm$/,
        type: "webassembly/async",
      },
    );

    // Enhanced plugins for Cloudflare compatibility
    config.plugins.push(
      // Handle node: scheme imports
      {
        apply: (compiler) => {
          compiler.hooks.normalModuleFactory.tap(
            "NodeSchemePlugin",
            (factory) => {
              factory.hooks.beforeResolve.tap(
                "NodeSchemePlugin",
                (resolveData) => {
                  if (
                    resolveData.request &&
                    resolveData.request.startsWith("node:")
                  ) {
                    const moduleName = resolveData.request.slice(5);
                    resolveData.request = moduleName;
                  }
                },
              );
            },
          );
        },
      },
    );

    // Enhanced warning filters
    config.ignoreWarnings = [
      /Failed to parse source map/,
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Error: Can't resolve 'encoding'/,
      /Module not found: Error: Can't resolve 'pino-pretty'/,
      /the request of a dependency is an expression/,
    ];

    // Optimization for production builds
    if (isProduction) {
      config.optimization = {
        ...config.optimization,
        sideEffects: false,
        usedExports: true,
        providedExports: true,
      };
    }

    return config;
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production
  dryRun: process.env.NODE_ENV !== "production",

  // Disable server-side plugin for static export (no server-side code)
  disableServerWebpackPlugin: true,
  // Only enable client-side plugin if auth token is provided
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from public
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
};

// Export configuration with Sentry wrapper
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
