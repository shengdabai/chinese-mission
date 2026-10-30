/**
 * Quota store for the request budgets (chat, debrief, tts).
 *
 * Two backends:
 *  - UpstashStore: shared across every serverless instance. Selected when
 *    UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or the Vercel KV names
 *    KV_REST_API_URL + KV_REST_API_TOKEN) are set. If the store is configured but a
 *    call fails, the request is REFUSED (fail closed): a provider call must never
 *    go out because the counter was unreachable.
 *  - MemoryStore: this instance's memory only. Used when no shared store is
 *    configured. /api/health reports which one is active so a production deploy
 *    without a shared store is visible, not silent.
 */

export interface QuotaStore {
  /** Count one hit for `key` inside a fixed window; true = allowed, false = refused. */
  take(key: string, limit: number, windowMs: number, now: number): Promise<boolean>;
  readonly kind: "memory" | "upstash";
}

const MAX_TRACKED_KEYS = 10_000;

export class MemoryStore implements QuotaStore {
  readonly kind = "memory" as const;
  private windows = new Map<string, { count: number; resetAt: number }>();

  async take(key: string, limit: number, windowMs: number, now: number): Promise<boolean> {
    let w = this.windows.get(key);
    if (!w || now >= w.resetAt) {
      if (this.windows.size >= MAX_TRACKED_KEYS) {
        for (const [k, v] of this.windows) if (now >= v.resetAt) this.windows.delete(k);
        // Still full of live windows: refuse rather than grow without bound.
        if (this.windows.size >= MAX_TRACKED_KEYS) return false;
      }
      w = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, w);
    }
    if (w.count >= limit) return false;
    w.count += 1;
    return true;
  }

  clear() {
    this.windows.clear();
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export class UpstashStore implements QuotaStore {
  readonly kind = "upstash" as const;
  private warned = false;
  private readonly url: string;
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  // No TS parameter properties here: Node's type stripping (used by `npm test`) cannot erase them.
  constructor(url: string, token: string, fetchImpl?: FetchLike, timeoutMs = 1500) {
    this.url = url;
    this.token = token;
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = timeoutMs;
  }

  async take(key: string, limit: number, windowMs: number): Promise<boolean> {
    // INCR + PEXPIRE NX in one pipeline: the first hit in a window sets the expiry,
    // later hits only count. Redis >= 7 (Upstash) supports the NX flag.
    const body = JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, String(windowMs), "NX"],
    ]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.url.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      if (!res.ok) return this.refuse(`HTTP ${res.status}`);
      const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
      const first = data?.[0];
      if (!first || typeof first.result !== "number") return this.refuse(first?.error || "unexpected reply");
      return first.result <= limit;
    } catch (error) {
      return this.refuse(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  private refuse(reason: string): boolean {
    if (!this.warned) {
      this.warned = true;
      console.error(`quota-store: shared store unavailable, refusing provider work (${reason})`);
    }
    return false;
  }
}

function sharedStoreConfig(env: NodeJS.ProcessEnv): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

let active: QuotaStore | null = null;

/** The store the budgets use. Built once per instance from the environment. */
export function quotaStore(): QuotaStore {
  if (!active) {
    const cfg = sharedStoreConfig(process.env);
    active = cfg ? new UpstashStore(cfg.url, cfg.token) : new MemoryStore();
  }
  return active;
}

/** True when budgets are shared across instances (what production should run with). */
export function quotaStoreIsShared(): boolean {
  return quotaStore().kind !== "memory";
}

export function setQuotaStoreForTest(store: QuotaStore | null) {
  active = store;
}
