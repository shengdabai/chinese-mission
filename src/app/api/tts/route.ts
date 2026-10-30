import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { rateLimitResponse } from "@/lib/rate-limit";
import { checkBudget, readJsonCapped } from "@/lib/server/request-budget";
import { sanitizeForSsml, MAX_AUDIO_BYTES } from "@/lib/server/tts-text";

// Microsoft Edge Neural Voices for zh-CN (curated short list).
// Quality is far better than the iOS built-in Tingting compact voice.
const VOICES: Record<string, string> = {
  // Female, warm, friendly — best fit for a barista/server NPC
  female: "zh-CN-XiaoxiaoNeural",
  // Female, calm/professional — for hotel/work scenarios
  professional: "zh-CN-YunxiNeural",
  // Male, energetic — for taxi driver / casual social
  male: "zh-CN-YunyangNeural",
  // Female, gentle/youth — for student-aged friends
  youth: "zh-CN-XiaoyiNeural",
};

const DEFAULT_VOICE = VOICES.female;
const MAX_TEXT_LENGTH = 400;
const VOICE_ID_PATTERN = /^[a-z]{2,3}-[A-Z]{2}(-[A-Za-z]+)?-[A-Za-z]+Neural$/;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Two layers before any synthesis: the per-minute in-memory burst limit (rate-limit.ts),
  // then the shared per-client and total budget (request-budget.ts).
  const limited = rateLimitResponse(request, "tts");
  if (limited) return limited;
  const refused = await checkBudget("tts", request);
  if (refused) return refused;

  const body = await readJsonCapped<{ text?: unknown; voice?: unknown; rate?: unknown }>(request, "tts");
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body.text !== undefined && typeof body.text !== "string") {
    return NextResponse.json({ error: "text must be a string" }, { status: 400 });
  }
  const text = (typeof body.text === "string" ? body.text : "").trim();
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` },
      { status: 400 },
    );
  }

  // The voice id is interpolated into SSML by the TTS client, so only accept
  // curated keys or a strictly well-formed neural voice id (no markup).
  const voiceKey = typeof body.voice === "string" ? body.voice : "female";
  const voice = Object.hasOwn(VOICES, voiceKey)
    ? VOICES[voiceKey]
    : VOICE_ID_PATTERN.test(voiceKey)
      ? voiceKey
      : DEFAULT_VOICE;

  // Edge TTS rate: -50% to +100%, "+0%" = neutral
  // Map our 0.7-1.2 multiplier scale to Edge prosody
  const rateMultiplier =
    typeof body.rate === "number" && Number.isFinite(body.rate) ? body.rate : 0.9;
  const ratePct = Math.round((rateMultiplier - 1) * 100);
  const ratePctClamped = Math.max(-50, Math.min(50, ratePct));
  const rateStr = ratePctClamped >= 0 ? `+${ratePctClamped}%` : `${ratePctClamped}%`;

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    // Plain text only: escaped so a caller cannot inject SSML tags or control characters.
    const stream = tts.toStream(sanitizeForSsml(text), { rate: rateStr });

    // Collect to buffer (text is short, < 400 chars, no need to stream)
    const chunks: Buffer[] = [];
    let received = 0;
    await new Promise<void>((resolve, reject) => {
      stream.audioStream.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_AUDIO_BYTES) {
          stream.audioStream.destroy?.();
          reject(new Error(`audio exceeds ${MAX_AUDIO_BYTES} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      stream.audioStream.on("end", () => resolve());
      stream.audioStream.on("close", () => resolve());
      stream.audioStream.on("error", (err: Error) => reject(err));
    });

    const audio = Buffer.concat(chunks);
    if (audio.length === 0) {
      return NextResponse.json({ error: "Empty audio from TTS" }, { status: 502 });
    }

    return new NextResponse(audio as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Length": String(audio.length),
      },
    });
  } catch (error) {
    // Upstream detail stays in the server log; the client gets a generic body (no provider internals).
    console.error("TTS error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "TTS synthesis failed", fallback: true }, { status: 502 });
  }
}
