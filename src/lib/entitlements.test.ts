import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isPremium, attemptsRemaining, canStartMission, consumeAttempt } from "./entitlements";

const today = () => new Date().toISOString().slice(0, 10);

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("entitlements", () => {
  it("ignores the localStorage premium debug flag in production builds", () => {
    vi.stubEnv("NODE_ENV", "production");
    localStorage.setItem("chinese-mission-premium-debug", "true");
    expect(isPremium()).toBe(false);
    expect(attemptsRemaining()).toBe(3);
  });

  it("still honours the debug flag outside production (QA toggle)", () => {
    vi.stubEnv("NODE_ENV", "development");
    localStorage.setItem("chinese-mission-premium-debug", "true");
    expect(isPremium()).toBe(true);
  });

  it("treats a corrupted quota record as used-up-to-date zero, never as unlimited", () => {
    for (const attemptsUsed of [-999, "abc", null, 1.5, {}]) {
      localStorage.setItem(
        "chinese-mission-daily-quota",
        JSON.stringify({ date: today(), attemptsUsed }),
      );
      expect(attemptsRemaining()).toBe(3);
      consumeAttempt();
      consumeAttempt();
      consumeAttempt();
      expect(canStartMission()).toBe(false);
      expect(consumeAttempt().ok).toBe(false);
    }
  });

  it("does not throw when the quota cannot be persisted", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(() => consumeAttempt()).not.toThrow();
  });
});
