import { NextRequest, NextResponse } from "next/server";
import { callAI, parseJSON, isAIConfigured } from "@/lib/engine/ai-client";
import { buildDebriefPrompt } from "@/lib/engine/prompts";
import { generateDebrief } from "@/lib/engine/dialogue";
import { getMission } from "@/lib/data/scenarios";
import type { Session, DebriefResult, GlossItem } from "@/lib/types";

interface DebriefRequest {
  missionId: string;
  session: {
    turns: Array<{
      role: string;
      rawInput: string;
      npcReplyCn?: string;
      understood?: boolean;
      errorTags?: string[];
      hintUsed?: number;
    }>;
    slotsFilledMap: Record<string, string>;
    hintUsageCount?: number;
  };
}

interface AIDebriefOutput {
  result: "success" | "partial_success" | "failure";
  score: number;
  strengths: string[];
  top_fixes: Array<{
    type: string;
    before: string;
    after: string;
    reason: string;
  }>;
  transfer_patterns: Array<{
    hanzi: string;
    pinyin: string;
    chunks: string[];
    gloss: string[];
    naturalEn: string;
    level: string;
  }>;
}

export async function POST(request: NextRequest) {
  // Parse body once, available in both try and catch
  let body: DebriefRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const mission = getMission(body.missionId);

    if (!mission) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }

    // If AI not configured, fall back to rule engine
    if (!isAIConfigured() || process.env.USE_RULE_ENGINE === "true") {
      const session: Session = {
        id: "debrief-session",
        missionId: mission.id,
        status: "completed",
        currentState: "complete",
        slotsFilledMap: body.session.slotsFilledMap,
        turns: body.session.turns.map((t, i) => ({
          id: `t${i}`,
          role: t.role as "user" | "npc" | "system",
          rawInput: t.rawInput,
          npcReplyCn: t.npcReplyCn,
          understood: t.understood,
          errorTags: t.errorTags,
          hintUsed: t.hintUsed,
          timestamp: new Date().toISOString(),
        })),
        hintLevel: 0,
        startedAt: new Date().toISOString(),
      };
      const result = generateDebrief(mission, session);
      return NextResponse.json({ ...result, aiPowered: false });
    }

    // AI-powered debrief
    const turns = body.session.turns.map((t) => ({
      role: t.role,
      input: t.npcReplyCn || t.rawInput,
      understood: t.understood,
      errorTags: t.errorTags,
    }));

    const filledSlots = Object.keys(body.session.slotsFilledMap);
    const hintUsageCount = body.session.hintUsageCount || 0;

    const prompt = buildDebriefPrompt(mission, turns, filledSlots, hintUsageCount);
    const raw = await callAI(prompt, "Generate debrief now.");
    const aiOutput = parseJSON<AIDebriefOutput>(raw.content);

    // Map to DebriefResult format
    const result: DebriefResult & { aiPowered: boolean } = {
      result: aiOutput.result,
      score: Math.max(0, Math.min(1, aiOutput.score)),
      strengths: aiOutput.strengths || [],
      topFixes: (aiOutput.top_fixes || []).map((f) => ({
        type: f.type,
        before: f.before,
        after: f.after,
        reason: f.reason,
      })),
      transferPatterns: (aiOutput.transfer_patterns || []).map(
        (p): GlossItem => ({
          hanzi: p.hanzi,
          pinyin: p.pinyin,
          chunks: p.chunks,
          gloss: p.gloss,
          naturalEn: p.naturalEn,
          level: (p.level as GlossItem["level"]) || "A0",
        }),
      ),
      aiPowered: true,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Debrief API error:", error);
    // Fall back to rule engine on any AI failure
    try {
      const mission = getMission(body.missionId);
      if (mission) {
        const session: Session = {
          id: "fallback",
          missionId: mission.id,
          status: "completed",
          currentState: "complete",
          slotsFilledMap: body.session.slotsFilledMap,
          turns: body.session.turns.map((t, i) => ({
            id: `t${i}`,
            role: t.role as "user" | "npc" | "system",
            rawInput: t.rawInput,
            npcReplyCn: t.npcReplyCn,
            understood: t.understood,
            errorTags: t.errorTags,
            timestamp: new Date().toISOString(),
          })),
          hintLevel: 0,
          startedAt: new Date().toISOString(),
        };
        const result = generateDebrief(mission, session);
        return NextResponse.json({ ...result, aiPowered: false });
      }
    } catch {
      // ignore
    }
    return NextResponse.json({ error: "Debrief generation failed" }, { status: 500 });
  }
}
