// /api/tts must not forward the synthesizer's internal error text to the client.
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore, setQuotaStoreForTest } from "../src/lib/server/quota-store.ts";

const SECRET_DETAIL = "wss://speech.platform.bing.com/... 403 Forbidden token=abc";

mock.module("msedge-tts", {
  namedExports: {
    OUTPUT_FORMAT: { AUDIO_24KHZ_96KBITRATE_MONO_MP3: "audio-24khz-96kbitrate-mono-mp3" },
    MsEdgeTTS: class {
      async setMetadata() {
        throw new Error(SECRET_DETAIL);
      }
    },
  },
});

const { POST } = await import("../src/app/api/tts/route.ts");

beforeEach(() => setQuotaStoreForTest(new MemoryStore()));

test("a synthesizer failure returns a generic body without the upstream detail", async () => {
  const errors = [];
  const realError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const res = await POST(
      new Request("http://localhost/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "8.8.8.8" },
        body: JSON.stringify({ text: "你好" }),
      }),
    );
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error, "TTS synthesis failed");
    assert.equal(body.detail, undefined);
    assert.ok(!JSON.stringify(body).includes("token="), "no upstream text in the response");
    assert.ok(errors.some((e) => e.includes("403")), "the detail is still logged server-side");
  } finally {
    console.error = realError;
  }
});
