import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

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

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { text?: string; voice?: string; rate?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` },
      { status: 400 },
    );
  }

  const voiceKey = body.voice || "female";
  const voice = VOICES[voiceKey] || (voiceKey.includes("-") ? voiceKey : DEFAULT_VOICE);

  // Edge TTS rate: -50% to +100%, "+0%" = neutral
  // Map our 0.7-1.2 multiplier scale to Edge prosody
  const rateMultiplier = body.rate ?? 0.9;
  const ratePct = Math.round((rateMultiplier - 1) * 100);
  const ratePctClamped = Math.max(-50, Math.min(50, ratePct));
  const rateStr = ratePctClamped >= 0 ? `+${ratePctClamped}%` : `${ratePctClamped}%`;

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const stream = tts.toStream(text, { rate: rateStr });

    // Collect to buffer (text is short, < 400 chars, no need to stream)
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
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
    console.error("TTS error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "TTS synthesis failed", detail: msg }, { status: 500 });
  }
}
