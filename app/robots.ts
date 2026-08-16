import type { MetadataRoute } from "next";

/**
 * Nothing here should ever be indexed.
 *
 * The gate makes crawling pointless, but this app spent time publicly readable
 * before the gate existed, and a `noindex` costs nothing next to the chance of
 * a cached copy of a member's contact details outliving the fix. `proxy.ts`
 * sets the matching `X-Robots-Tag` header on every response.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
