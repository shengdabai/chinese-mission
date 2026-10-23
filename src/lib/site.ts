/**
 * Public site URL, shared by the layout (metadataBase for Open Graph images)
 * and the share button. NEXT_PUBLIC_SITE_URL is inlined into the browser bundle
 * at build time; the literal `process.env.NEXT_PUBLIC_SITE_URL` below must stay
 * as written for that to work.
 */

/** The site's address when NEXT_PUBLIC_SITE_URL is not set: the canonical host. */
export const DEFAULT_SITE_URL = "https://chinese-mission.vercel.app";

/** The one site address for canonical links, metadataBase, robots, the sitemap and share links. */
export function siteUrl(): string {
  return configuredSiteUrl() ?? DEFAULT_SITE_URL;
}

/** Origin of NEXT_PUBLIC_SITE_URL when it is a valid http(s) URL, otherwise null. */
export function configuredSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}
