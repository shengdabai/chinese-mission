import { sanitizeProps, type TrackEvent } from "./events";

/**
 * Fire-and-forget funnel event for /api/event. Never throws, never blocks the UI,
 * and stays silent when the request cannot be sent (offline, blocked, rate limited).
 * keepalive lets a click that navigates away (e.g. a link) still deliver its event.
 */
export function track(event: TrackEvent, props?: Record<string, string | number | boolean | null | undefined>): void {
  try {
    if (typeof fetch !== "function") return;
    const sending = fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, props: sanitizeProps(event, props) }),
      keepalive: true,
    });
    sending.catch(() => {});
  } catch {
    // Counting must never break the page.
  }
}
