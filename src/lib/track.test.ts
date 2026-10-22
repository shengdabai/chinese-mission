import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { track } from "./track";
import { sanitizeProps } from "./events";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("track()", () => {
  it("POSTs the event as JSON to /api/event with keepalive", () => {
    track("trial_start", { mission_id: "cafe-01" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/event");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ event: "trial_start", props: { mission_id: "cafe-01" } });
  });

  it("sends an empty props object when none are given", () => {
    track("paywall_view");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ event: "paywall_view", props: {} });
  });

  it("stays silent when the request fails (rejected promise)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    expect(() => track("cta_click")).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("stays silent when fetch itself throws or does not exist", () => {
    fetchMock.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => track("cta_click")).not.toThrow();
    vi.stubGlobal("fetch", undefined);
    expect(() => track("cta_click")).not.toThrow();
  });

  it("never sends more than 5 props or values over 40 characters", () => {
    track("share_click", { a: "1", b: "2", c: "3", d: "4", e: "5", f: "6", g: "7" });
    track("share_click", { a: "x".repeat(100) });
    const first = JSON.parse(fetchMock.mock.calls[0][1].body).props;
    const second = JSON.parse(fetchMock.mock.calls[1][1].body).props;
    expect(Object.keys(first)).toHaveLength(5);
    expect(second.a).toHaveLength(40);
  });

  it("does not wait for the response", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never settles
    expect(track("cta_click")).toBeUndefined();
  });
});

describe("sanitizeProps()", () => {
  it("keeps strings, stringifies numbers and booleans, drops everything else", () => {
    expect(sanitizeProps({ a: "x", b: 3, c: true, d: null, e: undefined, f: { g: 1 }, h: [1] } as never)).toEqual({
      a: "x",
      b: "3",
      c: "true",
    });
  });

  it("drops keys the server would refuse (PII-like or not identifier-shaped)", () => {
    expect(sanitizeProps({ email: "a", user_id: "b", "Bad Key": "c", ok_key: "d", mission_id: "e" })).toEqual({
      ok_key: "d",
      mission_id: "e",
    });
  });

  it("drops values that look like email addresses", () => {
    expect(sanitizeProps({ where: "a@b.co", ok: "fine" })).toEqual({ ok: "fine" });
  });

  it("returns an empty object for undefined", () => {
    expect(sanitizeProps(undefined)).toEqual({});
  });
});
