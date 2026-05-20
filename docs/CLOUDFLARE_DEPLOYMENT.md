# Cloudflare Pages Deployment Guide

## Prerequisites

- Node.js installed
- Yarn package manager
- Wrangler CLI (available via `npx wrangler`)
- Cloudflare account with Pages project `gnus-dao-web`

---

## 1. Login to Cloudflare

Run this in your terminal (opens browser for OAuth):

```bash
npx wrangler login
```

> If `wrangler` is not found globally, always use `npx wrangler`.

---

## 2. Environment Setup

Make sure `.env` exists. If not, copy from the example:

```bash
cp .env.example .env
```

Set the required values in `.env`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id   # from https://cloud.reown.com
NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS=0x84Ba28d277ded98b3488C906E90B6435B116D5b4
```

> `.env` is also required for Hardhat diamond ABI generation — without it the diamond task silently produces an empty ABI.

---

## 3. Compile Contracts (if needed)

```bash
npx hardhat clean
npx hardhat compile
npx hardhat diamond:generate-abi-typechain --diamond-name GNUSDAODiamond --target-network sepolia
```

---

## 4. Build

```bash
yarn build
```

Output goes to the `out/` directory.

---

## 5. Deploy to Cloudflare Pages

```bash
npx wrangler pages deploy out --project-name=gnus-dao-web --commit-dirty=true
```

---

## 6. Set Secrets

Secrets must be set for **both** `production` and `preview` environments.  
`wrangler pages deploy` always deploys to **preview** — secrets missing from preview won't be available to workers.

### Generate JWT_SECRET

```bash
openssl rand -base64 32
```

### Set secrets for production

```bash
echo "YOUR_JWT_SECRET"   | npx wrangler pages secret put JWT_SECRET                        --project-name=gnus-dao-web
echo "YOUR_PINATA_JWT"   | npx wrangler pages secret put PINATA_JWT                        --project-name=gnus-dao-web
echo "YOUR_PINATA_KEY"   | npx wrangler pages secret put PINATA_API_KEY                    --project-name=gnus-dao-web
echo "YOUR_PINATA_SEC"   | npx wrangler pages secret put PINATA_SECRET_KEY                 --project-name=gnus-dao-web
echo "YOUR_WC_ID"        | npx wrangler pages secret put NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID --project-name=gnus-dao-web
```

### Set secrets for preview

```bash
echo "YOUR_JWT_SECRET"   | npx wrangler pages secret put JWT_SECRET                        --project-name=gnus-dao-web --env=preview
echo "YOUR_PINATA_JWT"   | npx wrangler pages secret put PINATA_JWT                        --project-name=gnus-dao-web --env=preview
echo "YOUR_PINATA_KEY"   | npx wrangler pages secret put PINATA_API_KEY                    --project-name=gnus-dao-web --env=preview
echo "YOUR_PINATA_SEC"   | npx wrangler pages secret put PINATA_SECRET_KEY                 --project-name=gnus-dao-web --env=preview
echo "YOUR_WC_ID"        | npx wrangler pages secret put NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID --project-name=gnus-dao-web --env=preview
```

### List current secrets

```bash
npx wrangler pages secret list --project-name=gnus-dao-web
```

---

## 7. Redeploy after setting secrets

Secrets take effect only after a new deployment:

```bash
npx wrangler pages deploy out --project-name=gnus-dao-web --commit-dirty=true
```

---

## 8. Verify Workers

Test all endpoints after deployment:

```bash
BASE="https://<deployment-id>.gnus-dao-web-2po.pages.dev"

curl "$BASE/api/health"
curl "$BASE/api/config/runtime-env"
curl "$BASE/api/performance"
curl "$BASE/api/auth/nonce"
curl "$BASE/api/auth/session"
curl -X POST -H "Content-Type: application/json" -d '{}' "$BASE/api/auth/verify"
curl -X POST -H "Content-Type: application/json" -d '{}' "$BASE/api/ipfs/upload"
```

### Expected responses

| Endpoint | Expected |
|---|---|
| `/api/health` | `{"status":"healthy",...}` with ipfs `authenticated: true` |
| `/api/config/runtime-env` | JSON with `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` populated |
| `/api/performance` | `{"status":"healthy",...}` |
| `/api/auth/nonce` | `{"nonce":"...","expiresAt":...}` |
| `/api/auth/session` | `{"error":"Missing or invalid authorization header"}` (correct — no token sent) |
| `/api/auth/verify` | `{"error":"Invalid or expired nonce"}` (correct — JWT_SECRET is bound) |
| `/api/ipfs/upload` | `{"error":"Unauthorized"}` (correct — requires auth token) |

---

## Known Issues & Fixes

### "Loading configuration..." slow on page load

The frontend was fetching `/api/config/runtime-env` on every load, but in local dev that Cloudflare Worker endpoint isn't served by `next dev`, causing a hang.

Fix applied in `src/lib/config/runtime-env.ts`:
- In development, build-time env vars are used directly — no API fetch
- In production, a 3-second timeout prevents indefinite hangs
- `RuntimeEnvLoader` no longer blocks page rendering

### Diamond ABI generates 0 functions/events

Caused by a missing `.env` file. The `diamond:generate-abi-typechain` task silently falls back to an empty ABI when it can't initialize.

Fix: ensure `.env` exists before running compile.

### Secrets not available to workers

Secrets set via `wrangler pages secret put` default to the `production` environment, but `wrangler pages deploy` deploys to `preview`. Always set secrets for both environments (see step 6).

---

## Pinata Credentials

| Key | Where to get |
|---|---|
| `PINATA_JWT` | [app.pinata.cloud/developers/api-keys](https://app.pinata.cloud/developers/api-keys) |
| `PINATA_API_KEY` | Same page |
| `PINATA_SECRET_KEY` | Same page |

## WalletConnect Project ID

Get from [cloud.reown.com](https://cloud.reown.com).
