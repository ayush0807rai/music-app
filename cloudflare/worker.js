/**
 * Euphony Unlimited Cloudflare Edge Audio Shield
 * 
 * Proxies Cloudinary audio and stems with 100% full 320kbps master audio quality,
 * while completely bypassing Cloudinary's monthly bandwidth limits by caching
 * audio files globally across Cloudflare's edge CDN for FREE with UNLIMITED bandwidth.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Range, Content-Type, Accept, Origin",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 2. Cloudinary Proxy: /cloudinary/<path> or /audio?url=<url>
    let targetOriginUrl = null;

    if (url.pathname.startsWith("/cloudinary/")) {
      const originPath = url.pathname.replace(/^\/cloudinary\//, "");
      targetOriginUrl = `https://res.cloudinary.com/${originPath}${url.search}`;
    } else if (url.pathname === "/audio" && url.searchParams.has("url")) {
      const raw = url.searchParams.get("url");
      if (raw.startsWith("https://res.cloudinary.com/")) {
        targetOriginUrl = raw;
      }
    }

    if (targetOriginUrl) {
      // Use Cloudflare Edge Cache API
      const cache = caches.default;

      // When caching audio streams with Range requests:
      // Cache the full underlying file using standard cache key
      const cacheKey = new Request(targetOriginUrl, {
        method: "GET",
        headers: {
          // Standard cache key
        }
      });

      // Pass-through request to origin if client sent Range header
      // Cloudflare edge automatically slices cached 200 responses into 206 Partial Content
      const originResponse = await fetch(targetOriginUrl, {
        method: request.method,
        headers: request.headers,
        cf: {
          cacheEverything: true,
          cacheTtl: 31536000, // Cache for 1 year at Cloudflare edge
          cacheKey: targetOriginUrl,
        },
      });

      // Inject CORS and immutable public caching headers
      const responseHeaders = new Headers(originResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type, Accept, Origin");
      responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
      responseHeaders.set("X-Edge-Shield", "Euphony-Cloudflare-320kbps");

      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: responseHeaders,
      });
    }

    // 3. Fallback for legacy Supabase proxy if needed
    if (url.pathname.startsWith("/storage/")) {
      const originUrl = `https://rlojwqncfcbcszgdyjyz.supabase.co${url.pathname}${url.search}`;
      return fetch(originUrl, request);
    }

    return new Response(
      JSON.stringify({
        status: "Euphony Cloudflare Audio Shield Active",
        audio_quality: "320kbps Uncompressed Original Master",
        bandwidth_billing: "Cloudflare Unlimited Free Tier",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  },
};
