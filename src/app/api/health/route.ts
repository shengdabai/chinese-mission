import { NextResponse } from "next/server";
import { isAIConfigured } from "@/lib/engine/ai-client";
import { quotaStore } from "@/lib/server/quota-store";

export const dynamic = "force-dynamic";

/**
 * Liveness + build identity for post-deploy smoke checks. No secrets: the build SHA,
 * whether a model key is present (not its value) and which quota store is active.
 */
export function GET() {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "dev").slice(0, 7);
  const store = quotaStore();
  return NextResponse.json(
    {
      ok: true,
      sha,
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      aiConfigured: isAIConfigured(),
      quotaStore: store.kind,
      quotaShared: store.kind !== "memory",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
