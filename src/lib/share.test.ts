import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildShareText, getShareUrl, shareResult } from "./share";
import { configuredSiteUrl } from "./site";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("configuredSiteUrl()", () => {
  it("returns the origin of NEXT_PUBLIC_SITE_URL when it is a valid http(s) URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test/some/path/");
    expect(configuredSiteUrl()).toBe("https://example.test");
  });

  it("returns null when unset, blank, malformed or not http(s)", () => {
    for (const v of ["", "   ", "not a url", "javascript:alert(1)", "ftp://example.test"]) {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", v);
      expect(configuredSiteUrl(), JSON.stringify(v)).toBeNull();
    }
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined as unknown as string);
    expect(configuredSiteUrl()).toBeNull();
  });
});

describe("getShareUrl()", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    expect(getShareUrl()).toBe("https://example.test");
  });

  it("falls back to the current origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getShareUrl()).toBe(window.location.origin);
  });
});

describe("buildShareText()", () => {
  it("contains the score and the mission title, and nothing else personal", () => {
    expect(buildShareText({ score: 0.854, missionTitle: "Order a coffee" })).toBe(
      'Chinese Mission: I scored 85% on "Order a coffee".',
    );
  });

  it("leaves the task out when no title is given", () => {
    expect(buildShareText({ score: 1 })).toBe("Chinese Mission: I scored 100%.");
  });

  it("clamps the score into 0-100 and survives NaN", () => {
    expect(buildShareText({ score: 7 })).toContain("100%");
    expect(buildShareText({ score: -3 })).toContain("0%");
    expect(buildShareText({ score: Number.NaN })).toContain("0%");
  });
});

describe("shareResult()", () => {
  const input = { score: 0.5, missionTitle: "Check in" };

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
  });

  it("uses navigator.share with title, text and url when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    expect(await shareResult(input)).toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0]).toEqual({
      title: "Chinese Mission",
      text: 'Chinese Mission: I scored 50% on "Check in".',
      url: "https://example.test",
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("does not fall back to the clipboard when the user closes the share sheet", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    expect(await shareResult(input)).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies text plus URL when navigator.share does not exist", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    expect(await shareResult(input)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith('Chinese Mission: I scored 50% on "Check in". https://example.test');
  });

  it("copies when navigator.share fails for a reason other than cancel", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    expect(await shareResult(input)).toBe("copied");
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("reports failed when neither share nor clipboard works", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) } });
    expect(await shareResult(input)).toBe("failed");
    vi.stubGlobal("navigator", {});
    expect(await shareResult(input)).toBe("failed");
  });
});
