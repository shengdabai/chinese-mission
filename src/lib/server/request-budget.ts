/**
 * Server-side budgets for the routes that spend provider capacity (AI calls, Edge TTS).
 * The client-side quota in entitlements.ts is only UI; these checks run before any provider work.
 * Counters live in this server instance's memory: they bound what one client can draw from an
 * instance and cap the instance's total provider work per window. They are not shared across instances.
 */

interface Budget {
  perClient: number; // requests per client per window
  perInstance: number; // requests per instance per window, all clients together
  windowMs: number;
  maxBodyBytes: number;
}

export const BUDGETS = {
  chat: { perClient: 30, perInstance: 300, windowMs: 10 * 60_000, maxBodyBytes: 32_000 },
  debrief: { perClient: 10, perInstance: 100, windowMs: 10 * 60_000, maxBodyBytes: 48_000 },
  tts: { perClient: 60, perInstance: 600, windowMs: 10 * 60_000, maxBodyBytes: 4_000 },
} satisfies Record<string, Budget>;

export type BudgetName = keyof typeof BUDGETS;

const MAX_TRACKED_KEYS = 10_000;
const windows = new Map<string, { count: number; resetAt: number }>();

function take(key: string, limit: number, windowMs: number, now: number): boolean {
  let w = windows.get(key);
  if (!w || now >= w.resetAt) {
    if (windows.size >= MAX_TRACKED_KEYS) {
      for (const [k, v] of windows) if (now >= v.resetAt) windows.delete(k);
      // Still full of live windows: refuse rather than grow without bound.
      if (windows.size >= MAX_TRACKED_KEYS) return false;
    }
    w = { count: 0, resetAt: now + windowMs };
    windows.set(key, w);
  }
  if (w.count >= limit) return false;
  w.count += 1;
  return true;
}

// Vercel sets x-vercel-forwarded-for / x-real-ip from the connection; a client cannot supply them.
export function clientId(request: Request): string {
  const h = request.headers;
  const ip = h.get("x-vercel-forwarded-for") || h.get("x-real-ip") || h.get("x-forwarded-for") || "";
  return ip.split(",")[0].trim() || "unknown";
}

/** Returns an error response when the request is over budget or too large; null when it may proceed. */
export function checkBudget(
  name: BudgetName,
  request: Request,
  now = Date.now(),
): Response | null {
  const b: Budget = BUDGETS[name];
  const length = Number(request.headers.get("content-length") || "0");
  if (length > b.maxBodyBytes) {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }
  // Per-client first, so requests a client is refused do not use up the instance budget.
  if (!take(`${clientId(request)}:${name}`, b.perClient, b.windowMs, now) || !take(`*:${name}`, b.perInstance, b.windowMs, now)) {
    return Response.json(
      { error: "Too many requests. Please try again in a few minutes.", fallback: true },
      { status: 429, headers: { "Retry-After": String(Math.ceil(b.windowMs / 1000)) } },
    );
  }
  return null;
}

/** Reads the JSON body with a hard size cap (content-length can be absent or wrong). */
export async function readJsonCapped<T>(request: Request, name: BudgetName): Promise<T | null> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > BUDGETS[name].maxBodyBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function resetBudgetsForTest() {
  windows.clear();
}
