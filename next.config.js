/** @type {import('next').NextConfig} */
const { setupDevPlatform } = require("@cloudflare/next-on-pages/next-dev");

// Setup Cloudflare development platform
if (process.env.NODE_ENV === "development") {
  setupDevPlatform();
}

// Environment detection
const isCloudflarePages = process.env.CLOUDFLARE_PAGES === "true";
const isProduction = process.env.NODE_ENV === "production";
const isStaticExport = process.env.STATIC_EXPORT === "true";
const useAdapter = process.env.USE_CLOUDFLARE_ADAPTER === "true";

const nextConfig = {
  // Core Next.js optimizations
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,

  // Enhanced compression and optimization
  compress: true,
  generateEtags: true,

  // Cloudflare Pages configuration with adapter support
  ...(isCloudflarePages &&
    useAdapter && {
      // Configuration for @cloudflare/next-on-pages adapter
      experimental: {
        runtime: "edge",
      },
    }),

  // Hybrid configuration: Static export with API routes for runtime config
  ...(isProduction &&
    isStaticExport &&
    !useAdapter && {
      output: "export",
      trailingSlash: false, // Changed to false for better Cloudflare Pages compatibility
      distDir: "out",
      images: {
        unoptimized: true, // Required for static export
      },
      // Enable API routes for runtime configuration
      experimental: {
        ...(isProduction && isStaticExport && !useAdapter
          ? {}
          : {
              runtime: "edge",
            }),
      },
    }),

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

    // Cloudflare-specific optimizations
    ...(isCloudflarePages &&
      useAdapter && {
        runtime: "edge",
      }),

    // Performance monitoring
    webVitalsAttribution: ["CLS", "LCP", "FID", "FCP", "TTFB"],

    // Advanced optimizations (disabled due to critters dependency)
    // optimizeCss: !useAdapter, // Disabled for edge runtime compatibility
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

  // Enhanced image optimization with Cloudflare compatibility
  images: {
    // Disable optimization for static export, enable for adapter
    unoptimized: isStaticExport && !useAdapter,

    // Cloudflare-compatible image domains
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

    // Cloudflare-optimized caching
    minimumCacheTTL: isCloudflarePages ? 86400 : 60, // 24 hours for Cloudflare

    // Loader configuration for Cloudflare
    ...(isCloudflarePages &&
      !isStaticExport && {
        loader: "custom",
        loaderFile: "./src/lib/utils/image-loader.js",
      }),
  },

  // Enhanced security headers (disabled for static export, handled by _headers file)
  ...(!isStaticExport && {
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            // Security headers
            {
              key: "X-Frame-Options",
              value: "DENY",
            },
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            {
              key: "X-XSS-Protection",
              value: "1; mode=block",
            },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains; preload",
            },
            // Enhanced CSP for Web3 applications
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://verify.walletconnect.com https://registry.walletconnect.com https://explorer-api.walletconnect.com",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: https: blob:",
                "font-src 'self' data: https://fonts.gstatic.com",
                "connect-src 'self' https: wss: blob:",
                "frame-src 'none'",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "upgrade-insecure-requests",
              ].join("; "),
            },
            // Permissions policy
            {
              key: "Permissions-Policy",
              value:
                "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
            },
            // Performance headers
            {
              key: "X-DNS-Prefetch-Control",
              value: "on",
            },
          ],
        },
        // API routes security
        {
          source: "/api/(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "no-store, max-age=0",
            },
          ],
        },
        // Static assets caching
        {
          source: "/_next/static/(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        {
          source: "/favicon.ico",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        {
          source: "/manifest.json",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
      ];
    },
  }),

  // Enhanced webpack configuration for Cloudflare and Web3 compatibility
  webpack: (config, { isServer }) => {
    // Cloudflare Edge Runtime compatibility
    if (useAdapter && !isServer) {
      config.target = "webworker";
    }

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

        // Web3 and IPFS specific
        "ipfs-http-client": false,
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

    // Optimization for Cloudflare
    if (isCloudflarePages) {
      config.optimization = {
        ...config.optimization,
        sideEffects: false,
        usedExports: true,
        providedExports: true,
      };
    }

    return config;
  },

  // Enhanced redirects (disabled for static export, handled by _redirects file)
  ...(!isStaticExport && {
    async redirects() {
      return [
        // Legacy governance routes
        {
          source: "/governance",
          destination: "/proposals",
          permanent: true,
        },
        {
          source: "/vote",
          destination: "/proposals",
          permanent: true,
        },
        {
          source: "/voting",
          destination: "/proposals",
          permanent: true,
        },
        // DAO routes
        {
          source: "/dao",
          destination: "/proposals",
          permanent: true,
        },
        {
          source: "/dao/governance",
          destination: "/proposals",
          permanent: true,
        },
        // Legacy proposal routes
        {
          source: "/proposal/:id",
          destination: "/proposals/:id",
          permanent: true,
        },
      ];
    },
  }),

  // Enhanced rewrites for API compatibility
  ...(!isStaticExport && {
    async rewrites() {
      return [
        // API routes for Cloudflare compatibility
        {
          source: "/api/health",
          destination: "/api/health",
        },
        // IPFS gateway rewrites
        {
          source: "/ipfs/:hash*",
          destination: "/api/ipfs/:hash*",
        },
      ];
    },
  }),

  // Output configuration
  output: isStaticExport ? "export" : "standalone",

  // Cloudflare-specific optimizations
  ...(isCloudflarePages && {
    // Additional Cloudflare Pages optimizations
    generateBuildId: async () => {
      return process.env.CF_PAGES_COMMIT_SHA || "development";
    },
  }),
};

module.exports = nextConfig;
