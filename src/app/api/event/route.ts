import { NextRequest, NextResponse } from "next/server";
import { MAX_EVENT_BODY_BYTES, parseEventBody } from "@/lib/events";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * First-party funnel counter. One structured log line per accepted event, which
 * can be searched in the host's logs (Vercel: filter on "zt_event"). Nothing is
 * stored, and the caller's IP and user agent are never logged. The limiter keeps
 * the IP only in memory, as a counter key.
 */

/** Reads the body as text, or returns null when it is larger than maxBytes. */
async function readBodyCapped(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(request, "event");
  if (limited) return limited;

  let text: string | null;
  try {
    text = await readBodyCapped(request, MAX_EVENT_BODY_BYTES);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (text === null) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseEventBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  console.log(JSON.stringify({ zt_event: parsed.event, props: parsed.props, ts: new Date().toISOString() }));
  return new NextResponse(null, { status: 204 });
}
