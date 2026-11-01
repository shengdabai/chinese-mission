import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore, MisconfiguredStore, UpstashStore, selectQuotaStore } from "../src/lib/server/quota-store.ts";

/** A fake Upstash REST endpoint: one shared Map stands in for the Redis database. */
function fakeUpstash() {
  const db = new Map();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization });
    const commands = JSON.parse(init.body);
    const out = [];
    for (const [cmd, key, ...rest] of commands) {
      if (cmd === "INCR") {
        const v = (db.get(key)?.count ?? 0) + 1;
        db.set(key, { ...(db.get(key) ?? {}), count: v });
        out.push({ result: v });
      } else if (cmd === "PEXPIRE") {
        const entry = db.get(key);
        const nx = rest[1] === "NX";
        // Redis semantics: NX → 1 only when the key had no TTL yet, 0 otherwise.
        if (entry && (!nx || entry.ttl === undefined)) {
          entry.ttl = Number(rest[0]);
          out.push({ result: 1 });
        } else {
          out.push({ result: 0 });
        }
      }
    }
    return new Response(JSON.stringify(out), { status: 200 });
  };
  return { db, calls, fetchImpl };
}

const silent = async (fn) => {
  const real = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = real;
  }
};

test("two store instances (two serverless instances) share one counter; PEXPIRE NX → 0 on later hits is fine", async () => {
  const up = fakeUpstash();
  const a = new UpstashStore("https://example.upstash.io", "tok", up.fetchImpl);
  const b = new UpstashStore("https://example.upstash.io", "tok", up.fetchImpl);
  const limit = 3;
  assert.equal(await a.take("budget:chat:1.1.1.1", limit, 60_000, 0), "allowed");
  assert.equal(await b.take("budget:chat:1.1.1.1", limit, 60_000, 0), "allowed");
  assert.equal(await a.take("budget:chat:1.1.1.1", limit, 60_000, 0), "allowed");
  assert.equal(await b.take("budget:chat:1.1.1.1", limit, 60_000, 0), "limit", "4th hit across instances is over the limit");
  assert.equal(up.db.get("budget:chat:1.1.1.1").ttl, 60_000, "expiry set once by the first hit");
  assert.equal(up.calls[0].auth, "Bearer tok");
  assert.match(up.calls[0].url, /\/pipeline$/);
});

test("a configured shared store that is unreachable is 'unavailable' (fail closed), never 'allowed'", async () => {
  await silent(async () => {
    const down = new UpstashStore("https://example.upstash.io", "tok", async () => {
      throw new Error("ECONNRESET");
    });
    assert.equal(await down.take("k", 100, 60_000, 0), "unavailable");
    const http500 = new UpstashStore("https://example.upstash.io", "tok", async () => new Response("boom", { status: 500 }));
    assert.equal(await http500.take("k", 100, 60_000, 0), "unavailable");
    const garbage = new UpstashStore("https://example.upstash.io", "tok", async () => new Response(JSON.stringify([{ error: "WRONGTYPE" }, { result: 0 }]), { status: 200 }));
    assert.equal(await garbage.take("k", 100, 60_000, 0), "unavailable");
  });
});

test("a failed or missing PEXPIRE reply is 'unavailable' even when INCR succeeded", async () => {
  await silent(async () => {
    const expireError = new UpstashStore("https://example.upstash.io", "tok", async () =>
      new Response(JSON.stringify([{ result: 1 }, { error: "ERR PEXPIRE failed" }]), { status: 200 }));
    assert.equal(await expireError.take("k", 100, 60_000, 0), "unavailable");
    const onlyOne = new UpstashStore("https://example.upstash.io", "tok", async () =>
      new Response(JSON.stringify([{ result: 1 }]), { status: 200 }));
    assert.equal(await onlyOne.take("k", 100, 60_000, 0), "unavailable");
    const weird = new UpstashStore("https://example.upstash.io", "tok", async () =>
      new Response(JSON.stringify([{ result: 1 }, { result: "OK" }]), { status: 200 }));
    assert.equal(await weird.take("k", 100, 60_000, 0), "unavailable");
  });
});

test("store selection: both variables → upstash; one of them → misconfigured (refuses); none → memory", async () => {
  assert.equal(selectQuotaStore({ UPSTASH_REDIS_REST_URL: "https://x", UPSTASH_REDIS_REST_TOKEN: "t" }).kind, "upstash");
  assert.equal(selectQuotaStore({ KV_REST_API_URL: "https://x", KV_REST_API_TOKEN: "t" }).kind, "upstash");
  assert.equal(selectQuotaStore({ UPSTASH_REDIS_REST_URL: "https://x" }).kind, "misconfigured");
  assert.equal(selectQuotaStore({ KV_REST_API_TOKEN: "t" }).kind, "misconfigured");
  assert.equal(selectQuotaStore({}).kind, "memory");
  await silent(async () => assert.equal(await new MisconfiguredStore().take("k", 1, 1, 0), "unavailable"));
});

test("the memory store counts per window and refuses at the limit", async () => {
  const m = new MemoryStore();
  for (let i = 0; i < 5; i++) assert.equal(await m.take("k", 5, 1000, 0), "allowed");
  assert.equal(await m.take("k", 5, 1000, 0), "limit");
  assert.equal(await m.take("k", 5, 1000, 1000), "allowed", "a new window starts fresh");
  assert.equal(m.kind, "memory");
});
