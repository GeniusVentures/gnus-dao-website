/**
 * OpenNext Cloudflare Configuration
 * 
 * This file configures the OpenNext adapter for Cloudflare Workers deployment.
 * 
 * @see https://opennext.js.org/cloudflare/get-started
 */

import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  /**
   * Incremental Cache Configuration
   * 
   * Uses Cloudflare R2 for Next.js incremental static regeneration (ISR) caching.
   * This requires a R2 bucket binding named "NEXT_INC_CACHE_R2_BUCKET" in wrangler.jsonc.
   * 
   * To enable R2 caching:
   * 1. Create an R2 bucket in your Cloudflare dashboard
   * 2. Add the binding to wrangler.jsonc (see example in that file)
   * 3. Uncomment the line below
   */
  // incrementalCache: r2IncrementalCache,
});

