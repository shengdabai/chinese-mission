import { test } from "node:test";
import assert from "node:assert/strict";
import { isPremium, devSetPremium } from "../src/lib/entitlements.ts";

test("a forged debug flag never grants production or test Premium", () => {
  globalThis.window = {};
  let reads = 0;
  globalThis.localStorage = { getItem: () => { reads++; return "true"; } };
  for (const mode of ["production", "test"]) {
    process.env.NODE_ENV = mode;
    assert.equal(isPremium(), false);
  }
  assert.equal(reads, 0);
});

test("development Premium remains available and blocked storage cannot crash it", () => {
  process.env.NODE_ENV = "development";
  globalThis.localStorage = { getItem: () => "true" };
  assert.equal(isPremium(), true);
  globalThis.localStorage = { getItem: () => { throw new Error("denied"); } };
  assert.equal(isPremium(), false);
});

test("the production debug setter does not write storage", () => {
  process.env.NODE_ENV = "production";
  globalThis.localStorage = { setItem: () => assert.fail("production write"), removeItem: () => assert.fail("production removal") };
  devSetPremium(true);
  devSetPremium(false);
});
