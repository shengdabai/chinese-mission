// /api/tts: the synthesizer's internal error text never reaches the client, and caller text
// is escaped before it is interpolated into SSML.
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { MemoryStore, setQuotaStoreForTest } from "../src/lib/server/quota-store.ts";
import { sanitizeForSsml } from "../src/lib/server/tts-text.ts";

const SECRET_DETAIL = "wss://speech.platform.bing.com/... 403 Forbidden token=abc";
let mode = "fail";
const synthesized = [];

mock.module("msedge-tts", {
  namedExports: {
    OUTPUT_FORMAT: { AUDIO_24KHZ_96KBITRATE_MONO_MP3: "audio-24khz-96kbitrate-mono-mp3" },
    MsEdgeTTS: class {
      async setMetadata() {
        if (mode === "fail") throw new Error(SECRET_DETAIL);
      }
      toStream(text) {
        synthesized.push(text);
        const audioStream = new EventEmitter();
        setTimeout(() => {
          audioStream.emit("data", Buffer.from("ID3-fake-mp3"));
          audioStream.emit("end");
        }, 0);
        return { audioStream };
      }
    },
  },
});

const { POST } = await import("../src/app/api/tts/route.ts");

const req = (body) =>
  new Request("http://localhost/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "8.8.8.8" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  setQuotaStoreForTest(new MemoryStore());
  synthesized.length = 0;
});

test("a synthesizer failure returns a generic body without the upstream detail", async () => {
  mode = "fail";
  const errors = [];
  const realError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const res = await POST(req({ text: "你好" }));
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

test("caller text is escaped before synthesis, so SSML tags cannot be injected", async () => {
  mode = "ok";
  const payload = '你好 <break time="10s"/> & <audio src="https://evil/x.mp3"/>';
  const res = await POST(req({ text: payload }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "audio/mpeg");
  assert.equal(synthesized.length, 1);
  assert.ok(!synthesized[0].includes("<"), "no raw angle brackets reach the synthesizer");
  assert.ok(synthesized[0].includes("&lt;break"), "tags arrive as escaped text");
  assert.equal(synthesized[0], sanitizeForSsml(payload));
});

test("sanitizeForSsml escapes XML specials and drops control characters", () => {
  assert.equal(sanitizeForSsml("a<b>&\"c'\u0007"), "a&lt;b&gt;&amp;&quot;c&apos;");
  assert.equal(sanitizeForSsml("  你好  "), "你好");
});
