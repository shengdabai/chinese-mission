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
    track("trial_start", { mission_id: "m1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/event");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ event: "trial_start", props: { mission_id: "m1" } });
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

  it("sends only the properties the event defines, with values from its vocabulary", () => {
    track("upgrade_click", { plan: "cm_yearly", source: "paywall", email: "a@b.co", note: "x".repeat(100), where: "hero" });
    track("share_click", { result: "Alice" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).props).toEqual({ plan: "cm_yearly", source: "paywall" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).props).toEqual({});
  });

  it("does not wait for the response", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never settles
    expect(track("cta_click")).toBeUndefined();
  });
});

describe("sanitizeProps()", () => {
  it("keeps documented string values and drops numbers, booleans, null and objects", () => {
    expect(sanitizeProps("result_view", { result: "success", mission_id: 3, extra: true, d: null, f: { g: 1 } } as never)).toEqual({
      result: "success",
    });
  });

  it("drops keys the server would refuse (PII-like, not identifier-shaped, or not the event's)", () => {
    expect(sanitizeProps("trial_start", { email: "a", user_id: "b", "Bad Key": "c", where: "hero", mission_id: "m2" })).toEqual({
      mission_id: "m2",
    });
  });

  it("drops values outside the event's vocabulary, email addresses included", () => {
    expect(sanitizeProps("cta_click", { where: "a@b.co" })).toEqual({});
    expect(sanitizeProps("cta_click", { where: "hero" })).toEqual({ where: "hero" });
  });

  it("returns an empty object for undefined", () => {
    expect(sanitizeProps("cta_click", undefined)).toEqual({});
  });
});
