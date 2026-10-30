import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore, UpstashStore } from "../src/lib/server/quota-store.ts";

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
        if (entry && (!nx || entry.ttl === undefined)) entry.ttl = Number(rest[0]);
        out.push({ result: entry?.ttl !== undefined ? 1 : 0 });
      }
    }
    return new Response(JSON.stringify(out), { status: 200 });
  };
  return { db, calls, fetchImpl };
}

test("two store instances (two serverless instances) share one counter", async () => {
  const up = fakeUpstash();
  const a = new UpstashStore("https://example.upstash.io", "tok", up.fetchImpl);
  const b = new UpstashStore("https://example.upstash.io", "tok", up.fetchImpl);
  const limit = 3;
  assert.equal(await a.take("budget:chat:1.1.1.1", limit, 60_000, 0), true);
  assert.equal(await b.take("budget:chat:1.1.1.1", limit, 60_000, 0), true);
  assert.equal(await a.take("budget:chat:1.1.1.1", limit, 60_000, 0), true);
  assert.equal(await b.take("budget:chat:1.1.1.1", limit, 60_000, 0), false, "4th hit across instances is refused");
  assert.equal(up.db.get("budget:chat:1.1.1.1").ttl, 60_000, "expiry set once by the first hit");
  assert.equal(up.calls[0].auth, "Bearer tok");
  assert.match(up.calls[0].url, /\/pipeline$/);
});

test("a configured shared store that is unreachable refuses (fail closed)", async () => {
  const down = new UpstashStore("https://example.upstash.io", "tok", async () => {
    throw new Error("ECONNRESET");
  });
  assert.equal(await down.take("k", 100, 60_000, 0), false);
  const http500 = new UpstashStore("https://example.upstash.io", "tok", async () => new Response("boom", { status: 500 }));
  assert.equal(await http500.take("k", 100, 60_000, 0), false);
  const garbage = new UpstashStore("https://example.upstash.io", "tok", async () => new Response(JSON.stringify([{ error: "WRONGTYPE" }]), { status: 200 }));
  assert.equal(await garbage.take("k", 100, 60_000, 0), false);
});

test("the memory store counts per window and refuses at the limit", async () => {
  const m = new MemoryStore();
  for (let i = 0; i < 5; i++) assert.equal(await m.take("k", 5, 1000, 0), true);
  assert.equal(await m.take("k", 5, 1000, 0), false);
  assert.equal(await m.take("k", 5, 1000, 1000), true, "a new window starts fresh");
  assert.equal(m.kind, "memory");
});
