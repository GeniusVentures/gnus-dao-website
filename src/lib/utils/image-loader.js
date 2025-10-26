/**
 * Cloudflare-optimized image loader for Next.js
 * Provides optimized image loading with Cloudflare's image optimization service
 */

export default function cloudflareImageLoader({ src, width, quality }) {
  // Handle external URLs (IPFS, CDNs, etc.)
  if (src.startsWith("http")) {
    // For IPFS and external images, return as-is or use Cloudflare Image Resizing
    if (process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING === "true") {
      const params = new URLSearchParams({
        width: width.toString(),
        quality: (quality || 85).toString(),
        format: "auto",
      });
      return `/cdn-cgi/image/${params.toString()}/${src}`;
    }
    return src;
  }

  // Handle relative URLs
  const params = new URLSearchParams({
    w: width.toString(),
    q: (quality || 85).toString(),
  });

  // For static export, return the original path
  if (process.env.STATIC_EXPORT === "true") {
    return src;
  }

  // For Cloudflare Pages with image optimization
  return `/_next/image?${params.toString()}&url=${encodeURIComponent(src)}`;
}
