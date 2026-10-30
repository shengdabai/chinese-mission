// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const calls: Array<{ voice: string; rate: string }> = [];
let lastVoice = "";
let failWith: string | null = null;

vi.mock("msedge-tts", () => {
  const { Readable } = require("node:stream");
  return {
    OUTPUT_FORMAT: { AUDIO_24KHZ_96KBITRATE_MONO_MP3: "mp3" },
    MsEdgeTTS: class {
      async setMetadata(voice: string) {
        lastVoice = voice;
      }
      toStream(_text: string, opts: { rate: string }) {
        if (failWith) throw new Error(failWith);
        calls.push({ voice: lastVoice, rate: opts.rate });
        return { audioStream: Readable.from([Buffer.from("synthetic-audio")]) };
      }
    },
  };
});

import { POST } from "./route";
import { resetRateLimits } from "@/lib/rate-limit";

function req(payload: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  resetRateLimits();
  failWith = null;
  calls.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/tts input boundary", () => {
  it("answers 400 for non-string text instead of crashing", async () => {
    for (const payload of [{ text: 42 }, { text: ["你好"] }, { text: { a: 1 } }, null, [1]]) {
      const res = await POST(req(payload));
      expect(res.status, JSON.stringify(payload)).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it("never forwards attacker-controlled voice markup or a NaN rate to the synthesiser", async () => {
    const res = await POST(
      req({ text: "你好", voice: "x-y'><break time='10s'/><voice name='zh-CN-XiaoxiaoNeural", rate: "fast" }),
    );
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].voice).toBe("zh-CN-XiaoxiaoNeural");
    expect(calls[0].rate).toBe("-10%");
  });

  it("still accepts curated keys and well-formed neural voice ids", async () => {
    await POST(req({ text: "你好", voice: "male", rate: 1.2 }));
    await POST(req({ text: "你好", voice: "zh-CN-YunjianNeural" }));
    expect(calls.map((c) => c.voice)).toEqual(["zh-CN-YunyangNeural", "zh-CN-YunjianNeural"]);
    expect(calls[0].rate).toBe("+20%");
  });
});

describe("POST /api/tts rate limit", () => {
  const from = (ip: string) => ({ "x-forwarded-for": ip });

  it("answers 429 with Retry-After once a client passes 30 requests a minute, without synthesising", async () => {
    for (let i = 0; i < 30; i++) {
      expect((await POST(req({ text: "你好" }, from("203.0.113.30")))).status).toBe(200);
    }
    const res = await POST(req({ text: "你好" }, from("203.0.113.30")));
    expect(res.status).toBe(429);
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect((await res.json()).error).toMatch(/too many requests/i);
    expect(calls).toHaveLength(30); // the 31st request never reached the paid-for synthesiser
  });

  it("keeps other clients unaffected", async () => {
    for (let i = 0; i < 30; i++) await POST(req({ text: "你好" }, from("203.0.113.30")));
    expect((await POST(req({ text: "你好" }, from("203.0.113.30")))).status).toBe(429);
    expect((await POST(req({ text: "你好" }, from("203.0.113.31")))).status).toBe(200);
  });
});

describe("POST /api/tts error responses", () => {
  it("does not echo internal error details back to the client", async () => {
    failWith = "wss://speech.example.internal handshake failed: token=abc123";
    const res = await POST(req({ text: "你好" }));
    // main answers an upstream synthesis failure with 502 and a generic body (tests/tts-error-body.test.mjs agrees).
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "TTS synthesis failed", fallback: true });
    expect(JSON.stringify(body)).not.toContain("abc123");
  });
});
