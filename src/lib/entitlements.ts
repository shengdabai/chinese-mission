/**
 * Free-tier entitlements & quota tracking.
 *
 * Free users: 3 mission attempts per day (UTC-based reset).
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
  date: string; // YYYY-MM-DD UTC
  attemptsUsed: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function readQuota(): DailyQuota {
  if (typeof window === "undefined") return { date: todayUtc(), attemptsUsed: 0 };
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (!raw) return { date: todayUtc(), attemptsUsed: 0 };
    const parsed = JSON.parse(raw) as DailyQuota;
    if (parsed.date !== todayUtc()) {
      // New day, reset
      return { date: todayUtc(), attemptsUsed: 0 };
    }
    return parsed;
  } catch {
    return { date: todayUtc(), attemptsUsed: 0 };
  }
}

function writeQuota(q: DailyQuota): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUOTA_KEY, JSON.stringify(q));
}

/**
 * Check premium entitlement. Currently uses a localStorage debug flag for development;
 * production must replace this with `await Purchases.getCustomerInfo()` from RevenueCat.
 */
export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREMIUM_KEY) === "true";
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
  const updated = { date: q.date, attemptsUsed: q.attemptsUsed + 1 };
  writeQuota(updated);
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
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
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
