// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const calls: Array<{ voice: string; rate: string }> = [];
let lastVoice = "";

vi.mock("msedge-tts", () => {
  const { Readable } = require("node:stream");
  return {
    OUTPUT_FORMAT: { AUDIO_24KHZ_96KBITRATE_MONO_MP3: "mp3" },
    MsEdgeTTS: class {
      async setMetadata(voice: string) {
        lastVoice = voice;
      }
      toStream(_text: string, opts: { rate: string }) {
        calls.push({ voice: lastVoice, rate: opts.rate });
        return { audioStream: Readable.from([Buffer.from("synthetic-audio")]) };
      }
    },
  };
});

import { POST } from "./route";

function req(payload: unknown) {
  return new NextRequest("http://localhost/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
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
