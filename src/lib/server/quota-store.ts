/**
 * Quota store for the request budgets (chat, debrief, tts).
 *
 * Backends:
 *  - UpstashStore: shared across every serverless instance. Selected when
 *    UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or the Vercel KV names
 *    KV_REST_API_URL + KV_REST_API_TOKEN) are both set. If a call fails or returns
 *    anything but two well-formed results, the request is REFUSED as "unavailable"
 *    (fail closed): a provider call must never go out because the counter was unreachable.
 *  - MisconfiguredStore: only one of the two variables is set. Every request is
 *    refused as "unavailable" and /api/health reports quotaStore: "misconfigured",
 *    so a half-configured production deploy fails loudly instead of silently
 *    falling back to per-instance counters.
 *  - MemoryStore: nothing configured. This instance's memory only; /api/health
 *    reports quotaStore: "memory".
 */

/** allowed = proceed; limit = the caller is over budget (429); unavailable = store problem (503). */
export type TakeResult = "allowed" | "limit" | "unavailable";

export interface QuotaStore {
  /** Count one hit for `key` inside a fixed window. */
  take(key: string, limit: number, windowMs: number, now: number): Promise<TakeResult>;
  readonly kind: "memory" | "upstash" | "misconfigured";
}

const MAX_TRACKED_KEYS = 10_000;

export class MemoryStore implements QuotaStore {
  readonly kind = "memory" as const;
  private windows = new Map<string, { count: number; resetAt: number }>();

  async take(key: string, limit: number, windowMs: number, now: number): Promise<TakeResult> {
    let w = this.windows.get(key);
    if (!w || now >= w.resetAt) {
      if (this.windows.size >= MAX_TRACKED_KEYS) {
        for (const [k, v] of this.windows) if (now >= v.resetAt) this.windows.delete(k);
        // Still full of live windows: refuse rather than grow without bound.
        if (this.windows.size >= MAX_TRACKED_KEYS) return "unavailable";
      }
      w = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, w);
    }
    if (w.count >= limit) return "limit";
    w.count += 1;
    return "allowed";
  }

  clear() {
    this.windows.clear();
  }
}

export class MisconfiguredStore implements QuotaStore {
  readonly kind = "misconfigured" as const;
  private warned = false;

  async take(): Promise<TakeResult> {
    if (!this.warned) {
      this.warned = true;
      console.error("quota-store: shared store is half-configured (URL or token missing); refusing provider work");
    }
    return "unavailable";
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
type PipelineReply = Array<{ result?: unknown; error?: string }>;

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

  async take(key: string, limit: number, windowMs: number): Promise<TakeResult> {
    // INCR + PEXPIRE NX in one pipeline: the first hit in a window sets the expiry, later hits
    // only count (PEXPIRE NX → 0 when a TTL already exists, which is the normal case).
    // Redis >= 7 (Upstash) supports the NX flag. Both replies are checked: a missing or failed
    // PEXPIRE would leave a counter that never resets, so it is treated as "unavailable".
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
      if (!res.ok) return this.unavailable(`HTTP ${res.status}`);
      const data = (await res.json()) as PipelineReply;
      if (!Array.isArray(data) || data.length !== 2) return this.unavailable("pipeline reply is not two results");
      const [incr, expire] = data;
      if (incr.error || typeof incr.result !== "number") return this.unavailable(incr.error || "INCR reply malformed");
      if (expire.error || (expire.result !== 0 && expire.result !== 1)) {
        return this.unavailable(expire.error || "PEXPIRE reply malformed");
      }
      return incr.result <= limit ? "allowed" : "limit";
    } catch (error) {
      return this.unavailable(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  private unavailable(reason: string): TakeResult {
    if (!this.warned) {
      this.warned = true;
      console.error(`quota-store: shared store unavailable, refusing provider work (${reason})`);
    }
    return "unavailable";
  }
}

type StoreConfig = { url?: string; token?: string };

function sharedStoreConfig(env: NodeJS.ProcessEnv): StoreConfig {
  return {
    url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || undefined,
    token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || undefined,
  };
}

/** Pure selection so it can be tested without touching process.env. */
export function selectQuotaStore(env: NodeJS.ProcessEnv): QuotaStore {
  const { url, token } = sharedStoreConfig(env);
  if (url && token) return new UpstashStore(url, token);
  if (url || token) return new MisconfiguredStore();
  return new MemoryStore();
}

let active: QuotaStore | null = null;

/** The store the budgets use. Built once per instance from the environment. */
export function quotaStore(): QuotaStore {
  if (!active) active = selectQuotaStore(process.env);
  return active;
}

export function setQuotaStoreForTest(store: QuotaStore | null) {
  active = store;
}
