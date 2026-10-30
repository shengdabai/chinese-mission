// The free quota resets at the user's local midnight, not at UTC midnight.
// Records written before this change carry a UTC date and no `basis` field ("legacy" records). They keep their
// old meaning until their UTC day ends, so the switch never gives a user a second reset inside one local day
// and never takes away attempts that the old rule had already given back.
// The suite pins the time zone itself (Asia/Shanghai, UTC+8, no daylight saving), so it gives the same
// result on any machine.
process.env.TZ = "Asia/Shanghai";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { canStartMission, consumeAttempt, attemptsRemaining, getQuotaSummary } from "./entitlements";

const KEY = "chinese-mission-daily-quota";
const at = (iso: string) => vi.setSystemTime(new Date(iso));
const useAll = () => {
  for (let i = 0; i < 3; i++) expect(consumeAttempt().ok).toBe(true);
  expect(canStartMission()).toBe(false);
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("free quota day boundary", () => {
  it("resets at local midnight even when the UTC date has not changed", () => {
    at("2026-10-28T15:30:00Z"); // 23:30 on Oct 28 in Shanghai
    useAll();
    at("2026-10-28T16:00:30Z"); // 00:00:30 on Oct 29 in Shanghai, still Oct 28 in UTC
    expect(attemptsRemaining()).toBe(3);
  });

  it("does not reset at UTC midnight inside the same local day", () => {
    at("2026-10-28T23:30:00Z"); // 07:30 on Oct 29 in Shanghai
    useAll();
    at("2026-10-29T00:30:00Z"); // 08:30 on Oct 29 in Shanghai, a new UTC day
    expect(canStartMission()).toBe(false);
  });

  it("reports the next local midnight as the reset time", () => {
    at("2026-10-28T03:00:00Z"); // 11:00 on Oct 28 in Shanghai
    consumeAttempt();
    expect(getQuotaSummary().resetsAt).toBe("2026-10-28T16:00:00.000Z"); // 00:00 on Oct 29 in Shanghai
  });
});

describe("legacy UTC-dated records", () => {
  it("keeps a current legacy record until its UTC day ends, then switches to local days", () => {
    // Written by the old code at 20:00 on Oct 27 in Shanghai (12:00 UTC): the UTC date is Oct 27.
    localStorage.setItem(KEY, JSON.stringify({ date: "2026-10-27", attemptsUsed: 3 }));

    at("2026-10-27T23:00:00Z"); // 07:00 on Oct 28 in Shanghai, UTC day of the record not over yet
    expect(canStartMission()).toBe(false); // no extra attempts before the old reset time

    at("2026-10-28T00:00:30Z"); // 08:00:30 in Shanghai: the old rule gave the quota back here
    expect(attemptsRemaining()).toBe(3); // still given back: reading the record earlier must not re-date it

    useAll();
    at("2026-10-28T15:30:00Z"); // 23:30 on Oct 28 in Shanghai: same local day
    expect(canStartMission()).toBe(false);
    at("2026-10-28T16:00:30Z"); // 00:00:30 on Oct 29 in Shanghai: local midnight
    expect(attemptsRemaining()).toBe(3);
  });

  it("an attempt taken while a legacy record is current stays on the old day", () => {
    localStorage.setItem(KEY, JSON.stringify({ date: "2026-10-28", attemptsUsed: 1 }));
    at("2026-10-28T23:00:00Z"); // 07:00 on Oct 29 in Shanghai, UTC day Oct 28
    expect(consumeAttempt()).toEqual({ ok: true, remaining: 1 });
    at("2026-10-29T00:30:00Z"); // UTC day of the record is over
    expect(attemptsRemaining()).toBe(3);
  });

  it("ignores a legacy record from an earlier UTC day", () => {
    localStorage.setItem(KEY, JSON.stringify({ date: "2026-10-27", attemptsUsed: 3 }));
    at("2026-10-28T02:00:00Z"); // 10:00 on Oct 28 in Shanghai, UTC Oct 28
    expect(attemptsRemaining()).toBe(3);
  });

  it("reports the legacy reset time (next UTC midnight) while a legacy record is current", () => {
    localStorage.setItem(KEY, JSON.stringify({ date: "2026-10-28", attemptsUsed: 3 }));
    at("2026-10-28T23:00:00Z");
    expect(getQuotaSummary().resetsAt).toBe("2026-10-29T00:00:00.000Z");
  });
});
