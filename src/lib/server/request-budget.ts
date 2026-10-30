/**
 * Server-side budgets for the routes that spend provider capacity (AI calls, Edge TTS).
 * The client-side quota in entitlements.ts is only UI; these checks run before any provider work.
 * Counters live in the quota store (see quota-store.ts): shared across instances when a
 * shared store is configured, this instance's memory otherwise.
 */

import { quotaStore } from "./quota-store";

interface Budget {
  perClient: number; // requests per client per window
  perTotal: number; // requests per window, all clients together (per instance when the store is memory)
  windowMs: number;
  maxBodyBytes: number;
}

export const BUDGETS = {
  chat: { perClient: 30, perTotal: 300, windowMs: 10 * 60_000, maxBodyBytes: 32_000 },
  debrief: { perClient: 10, perTotal: 100, windowMs: 10 * 60_000, maxBodyBytes: 48_000 },
  tts: { perClient: 60, perTotal: 600, windowMs: 10 * 60_000, maxBodyBytes: 4_000 },
} satisfies Record<string, Budget>;

export type BudgetName = keyof typeof BUDGETS;

// Vercel sets x-vercel-forwarded-for / x-real-ip from the connection; a client cannot supply them.
export function clientId(request: Request): string {
  const h = request.headers;
  const ip = h.get("x-vercel-forwarded-for") || h.get("x-real-ip") || h.get("x-forwarded-for") || "";
  return ip.split(",")[0].trim() || "unknown";
}

function refusal(windowMs: number): Response {
  return Response.json(
    { error: "Too many requests. Please try again in a few minutes.", fallback: true },
    { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } },
  );
}

/** Returns an error response when the request is over budget or too large; null when it may proceed. */
export async function checkBudget(
  name: BudgetName,
  request: Request,
  now = Date.now(),
): Promise<Response | null> {
  const b: Budget = BUDGETS[name];
  const length = Number(request.headers.get("content-length") || "0");
  if (length > b.maxBodyBytes) {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }
  const store = quotaStore();
  // Per-client first, so requests a client is refused do not use up the shared budget.
  if (!(await store.take(`budget:${name}:${clientId(request)}`, b.perClient, b.windowMs, now))) {
    return refusal(b.windowMs);
  }
  if (!(await store.take(`budget:${name}:*`, b.perTotal, b.windowMs, now))) {
    return refusal(b.windowMs);
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
