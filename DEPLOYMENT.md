# Deployment Guide

This document describes how to deploy the GNUS DAO frontend to Cloudflare Pages with integrated Cloudflare Functions.

## Overview

The application is deployed as a static site to Cloudflare Pages with serverless functions for API endpoints. The build process automatically:

1. Builds Next.js as a static export
2. Copies Cloudflare Functions to the output directory
3. Includes necessary configuration files (`_headers`, `_redirects`)
4. Deploys everything to Cloudflare Pages

## Quick Start

### Build Only
```bash
yarn build:pages
```

### Build and Deploy
```bash
yarn deploy:pages
```

## Build Process

The build process consists of several automated steps:

### 1. Static Export
- Builds Next.js with `output: "export"`
- Generates static HTML, CSS, and JavaScript files
- Includes all assets and public files

### 2. Functions Integration
- Copies the `functions/` directory to `out/functions/`
- Includes all Cloudflare Workers for API endpoints:
  - `/api/health` - Health monitoring
  - `/api/performance` - Performance metrics
  - `/api/config/runtime-env` - Runtime configuration
  - `/api/auth/*` - Authentication endpoints
  - `/api/ipfs/*` - IPFS integration

### 3. Configuration Files
- `_headers` - Security headers and caching rules
- `_redirects` - SPA routing and legacy redirects

## Available Scripts

| Script | Description |
|--------|-------------|
| `yarn build:pages` | Build for Cloudflare Pages (includes functions) |
| `yarn deploy:pages` | Build and deploy to Cloudflare Pages |
| `yarn build:production` | Build Next.js static export only |
| `yarn build:cloudflare` | Build using OpenNext.js adapter (alternative) |

## Deployment Configuration

### Environment Variables

Set these in Cloudflare Pages dashboard:

**Required:**
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS`
- `NEXT_PUBLIC_POLYGON_AMOY_GNUS_DAO_ADDRESS`
- `NEXT_PUBLIC_BASE_SEPOLIA_GNUS_DAO_ADDRESS`
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_GNUS_DAO_ADDRESS`

**Optional:**
- `PINATA_JWT` - For IPFS functionality
- `SENTRY_DSN` - For error tracking
- `NEXT_PUBLIC_IPFS_GATEWAY` - Custom IPFS gateway

### Build Settings

In Cloudflare Pages dashboard:
- **Build command:** `yarn build:pages`
- **Build output directory:** `out`
- **Root directory:** (leave empty)

## Manual Deployment

If you need to deploy manually:

```bash
# Build the application
yarn build:pages

# Deploy using Wrangler CLI
wrangler pages deploy out --project-name=gnus-dao-web
```

## Troubleshooting

### Functions Not Working
- Ensure functions are copied to `out/functions/`
- Check Cloudflare Pages Functions logs
- Verify environment variables are set

### Build Failures
- Check TypeScript compilation: `yarn type-check`
- Verify all dependencies are installed: `yarn install`
- Clear cache: `yarn clean`

### Deployment Issues
- Ensure you're logged into Wrangler: `wrangler auth login`
- Check project name matches Cloudflare Pages project
- Verify build output exists in `out/` directory

## Architecture

```
out/
├── _headers              # Security headers
├── _redirects           # SPA routing rules
├── functions/           # Cloudflare Workers
│   ├── api/
│   │   ├── health.ts
│   │   ├── performance.ts
│   │   └── config/
│   └── utils/
├── _next/               # Next.js assets
└── *.html               # Static pages
```

## Performance

- **Static files:** Served from Cloudflare's global CDN
- **Functions:** Run on Cloudflare's edge network
- **Caching:** Configured via `_headers` file
- **Compression:** Automatic gzip/brotli compression

## Security

- CSP headers configured in `_headers`
- CORS policies for API endpoints
- Rate limiting on sensitive endpoints
- Error tracking with Sentry integration