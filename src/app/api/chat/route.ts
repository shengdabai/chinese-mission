import { NextRequest, NextResponse } from "next/server";
import { callAI, parseJSON, isAIConfigured } from "@/lib/engine/ai-client";
import { buildPolicyPrompt, buildNpcPrompt } from "@/lib/engine/prompts";
import { processUserInput, detectScript } from "@/lib/engine/dialogue";
import { getMission } from "@/lib/data/scenarios";
import type { Mission, Session } from "@/lib/types";

interface ChatRequest {
  missionId: string;
  userInput: string;
  session: {
    currentState: string;
    slotsFilledMap: Record<string, string>;
    turns: Array<{ role: string; rawInput: string; npcReplyCn?: string; understood?: boolean; errorTags?: string[] }>;
    hintLevel: number;
  };
}

interface PolicyOutput {
  understood: boolean;
  user_intent_cn: string;
  user_intent_en: string;
  newly_filled_slots: string[];
  next_act: string;
  next_state: string;
  task_status: "in_progress" | "completed";
  error_tags: string[];
  hint_level_recommended: number;
}

interface NpcOutput {
  reply_cn: string;
  reply_en: string;
  emotion: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const mission = getMission(body.missionId);

    if (!mission) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }

    // If AI is not configured, fall back to rule engine
    if (!isAIConfigured() || process.env.USE_RULE_ENGINE === "true") {
      return handleRuleEngine(body, mission);
    }

    return await handleAIEngine(body, mission);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error", fallback: true },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// AI-powered dialogue
// ---------------------------------------------------------------------------

async function handleAIEngine(body: ChatRequest, mission: Mission) {
  const script = detectScript(body.userInput);
  const session: Session = {
    id: "api-session",
    missionId: mission.id,
    status: "in_progress",
    currentState: body.session.currentState,
    slotsFilledMap: body.session.slotsFilledMap,
    turns: [],
    hintLevel: body.session.hintLevel,
    startedAt: new Date().toISOString(),
  };

  // Step 1: Policy - determine what to do
  const policyPrompt = buildPolicyPrompt(mission, session, body.userInput, script);
  const policyRaw = await callAI(policyPrompt, body.userInput);
  const policy = parseJSON<PolicyOutput>(policyRaw.content);

  // Step 2: NPC - generate natural response
  const conversationHistory = body.session.turns.slice(-6).map((t) => ({
    role: t.role === "npc" ? "assistant" : t.role,
    content: t.npcReplyCn || t.rawInput,
  }));
  conversationHistory.push({ role: "user", content: body.userInput });

  const npcPrompt = buildNpcPrompt(mission, policy, conversationHistory);
  const npcRaw = await callAI(npcPrompt, `Policy decision: ${JSON.stringify(policy)}`);
  const npc = parseJSON<NpcOutput>(npcRaw.content);

  // Merge filled slots
  const updatedSlots = { ...body.session.slotsFilledMap };
  for (const slot of policy.newly_filled_slots) {
    if (mission.requiredSlots.includes(slot) || mission.optionalSlots.includes(slot)) {
      updatedSlots[slot] = "filled";
    }
  }

  // Check if all required slots are filled
  const allFilled = mission.requiredSlots.every((s) => s in updatedSlots);
  const taskStatus = allFilled ? "completed" : policy.task_status;

  return NextResponse.json({
    normalizedUserCn: policy.user_intent_cn || body.userInput,
    understood: policy.understood,
    taskStatus,
    slotsFilled: Object.keys(updatedSlots),
    missingSlots: mission.requiredSlots.filter((s) => !(s in updatedSlots)),
    npcReplyCn: npc.reply_cn,
    npcReplyEn: npc.reply_en,
    currentState: policy.next_state || body.session.currentState,
    errorTags: policy.error_tags || [],
    hintAvailable: true,
    aiPowered: true,
  });
}

// ---------------------------------------------------------------------------
// Rule-engine fallback
// ---------------------------------------------------------------------------

function handleRuleEngine(body: ChatRequest, mission: Mission) {
  const session: Session = {
    id: "rule-session",
    missionId: mission.id,
    status: "in_progress",
    currentState: body.session.currentState,
    slotsFilledMap: body.session.slotsFilledMap,
    turns: [],
    hintLevel: body.session.hintLevel,
    startedAt: new Date().toISOString(),
  };

  const response = processUserInput(body.userInput, mission, session);

  return NextResponse.json({
    ...response,
    aiPowered: false,
  });
}
