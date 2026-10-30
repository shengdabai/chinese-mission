/**
 * Free-tier entitlements & quota tracking.
 *
 * Free users: 3 mission attempts per day. The day is the user's local calendar day: the quota resets at local midnight.
 * Premium users: unlimited.
 *
 * RevenueCat SDK integration is intentionally stubbed - currently a `false` constant
 * so the paywall always shows for non-premium tracking. Once `@revenuecat/purchases-capacitor`
 * is wired up (阶段 3.x), replace `isPremium()` body with the real entitlement check.
 */

const QUOTA_KEY = "chinese-mission-daily-quota";
const PREMIUM_KEY = "chinese-mission-premium-debug"; // dev override only
const FREE_DAILY_LIMIT = 3;

export interface DailyQuota {
  /** YYYY-MM-DD. A local calendar day when basis is "local"; a UTC day for legacy records. */
  date: string;
  attemptsUsed: number;
  /**
   * "local" for records written since the switch to local-midnight resets. Records written before it have no
   * basis and a UTC date ("legacy"). A legacy record keeps its old meaning until its UTC day ends, because its
   * attempts may belong to either of the two local days that the UTC day overlaps: re-dating it to the local day
   * could take away attempts, and dropping it early could give a second reset inside one local day.
   */
  basis?: "local";
}

function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function todayLocal(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function freshQuota(now = new Date()): DailyQuota {
  return { date: todayLocal(now), attemptsUsed: 0, basis: "local" };
}

function isCurrent(q: Partial<DailyQuota>, now: Date): boolean {
  return q.basis === "local" ? q.date === todayLocal(now) : q.date === todayUtc(now);
}

function readQuota(): DailyQuota {
  const now = new Date();
  if (typeof window === "undefined") return freshQuota(now);
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (!raw) return freshQuota(now);
    const parsed = JSON.parse(raw) as Partial<DailyQuota> | null;
    if (!parsed || typeof parsed.date !== "string" || !isCurrent(parsed, now)) {
      // New day (or unreadable record), reset
      return freshQuota(now);
    }
    // A corrupted/tampered counter (negative, NaN, string...) must never widen the quota.
    const used = parsed.attemptsUsed;
    const attemptsUsed =
      typeof used === "number" && Number.isInteger(used) && used >= 0 ? used : 0;
    // Keep the record's own basis: a current legacy record stays on its UTC day until that day ends.
    return parsed.basis === "local" ? { date: parsed.date, attemptsUsed, basis: "local" } : { date: parsed.date, attemptsUsed };
  } catch {
    return freshQuota(now);
  }
}

function writeQuota(q: DailyQuota): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(q));
    return true;
  } catch {
    // Storage full / blocked (private mode): report it instead of crashing the click handler.
    return false;
  }
}

/**
 * Check premium entitlement. Currently uses a localStorage debug flag for development;
 * production must replace this with `await Purchases.getCustomerInfo()` from RevenueCat.
 */
export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  // The debug flag is a QA toggle only. In production builds it must not grant
  // premium: anyone can write localStorage from DevTools.
  if (process.env.NODE_ENV === "production") return false;
  try {
    return localStorage.getItem(PREMIUM_KEY) === "true";
  } catch {
    return false;
  }
}

export function attemptsRemaining(): number {
  if (isPremium()) return Infinity;
  const q = readQuota();
  return Math.max(0, FREE_DAILY_LIMIT - q.attemptsUsed);
}

export function canStartMission(): boolean {
  return attemptsRemaining() > 0;
}

/**
 * Call when a mission is started (not when completed) to debit one attempt.
 * Idempotent within a single mission session — caller tracks "did I already debit this attempt".
 */
export function consumeAttempt(): { ok: boolean; remaining: number } {
  if (isPremium()) return { ok: true, remaining: Infinity };
  const q = readQuota();
  if (q.attemptsUsed >= FREE_DAILY_LIMIT) {
    return { ok: false, remaining: 0 };
  }
  const updated: DailyQuota = { ...q, attemptsUsed: q.attemptsUsed + 1 };
  if (!writeQuota(updated)) {
    return { ok: false, remaining: Math.max(0, FREE_DAILY_LIMIT - q.attemptsUsed) };
  }
  return { ok: true, remaining: FREE_DAILY_LIMIT - updated.attemptsUsed };
}

export function getQuotaSummary(): {
  premium: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
} {
  const premium = isPremium();
  if (premium) {
    return { premium: true, used: 0, limit: Infinity, remaining: Infinity, resetsAt: "" };
  }
  const q = readQuota();
  const tomorrow = new Date();
  if (q.basis === "local") {
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // next local midnight
  } else {
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0); // a current legacy record ends at the next UTC midnight
  }
  return {
    premium: false,
    used: q.attemptsUsed,
    limit: FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - q.attemptsUsed),
    resetsAt: tomorrow.toISOString(),
  };
}

/**
 * Dev-only premium toggle for QA.
 * Guarded behind NODE_ENV check — no-ops in production to prevent paywall bypass via DevTools.
 */
export function devSetPremium(on: boolean): void {
  if (process.env.NODE_ENV !== "development") return;
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem(PREMIUM_KEY, "true");
  else localStorage.removeItem(PREMIUM_KEY);
}
