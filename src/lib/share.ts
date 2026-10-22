import { configuredSiteUrl } from "./site";

const SHARE_TITLE = "Chinese Mission";

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** Site URL to put in a shared message: NEXT_PUBLIC_SITE_URL, else the page's own origin. */
export function getShareUrl(): string {
  return configuredSiteUrl() ?? (typeof window !== "undefined" ? window.location.origin : "");
}

/** The message body: score and mission title only. The URL is added by the caller. */
export function buildShareText({ score, missionTitle }: { score: number; missionTitle?: string }): string {
  const pct = Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score * 100))) : 0;
  const task = missionTitle?.trim();
  return task ? `${SHARE_TITLE}: I scored ${pct}% on "${task}".` : `${SHARE_TITLE}: I scored ${pct}%.`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context: try the legacy path below.
  }
  try {
    if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Opens the native share sheet when the browser has one, otherwise copies the
 * message plus the site URL to the clipboard. Must run inside a click handler
 * (navigator.share needs a user gesture).
 */
export async function shareResult(input: { score: number; missionTitle?: string }): Promise<ShareOutcome> {
  const text = buildShareText(input);
  const url = getShareUrl();

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: SHARE_TITLE, text, url });
      return "shared";
    } catch (err) {
      if ((err as { name?: unknown } | null)?.name === "AbortError") return "cancelled"; // no instanceof: DOMException can come from another realm
      // Any other failure: fall through to the clipboard.
    }
  }
  return (await copyText(url ? `${text} ${url}` : text)) ? "copied" : "failed";
}
