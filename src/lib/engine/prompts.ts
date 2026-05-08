import type { Mission, Session } from "../types";

/**
 * Three-layer prompt architecture as specified in the PRD:
 * 1. Policy Prompt - Determines next action (slot status, hints, errors)
 * 2. NPC Prompt - Generates natural NPC dialogue
 * 3. Debrief Prompt - Generates post-mission review
 */

// ---------------------------------------------------------------------------
// Policy Prompt - Decides "what to do next" without generating dialogue
// ---------------------------------------------------------------------------

export function buildPolicyPrompt(
  mission: Mission,
  session: Session,
  userInput: string,
  detectedScript: string,
): string {
  const filledSlots = Object.keys(session.slotsFilledMap);
  const missingSlots = mission.requiredSlots.filter(
    (s) => !filledSlots.includes(s),
  );

  return `You are a dialogue policy engine for a Chinese language learning app.

## Context
- Mission: ${mission.titleEn} (${mission.title})
- Objective: ${mission.objectiveEn}
- NPC Role: ${mission.npcPersona.roleEn}
- Current State: ${session.currentState}
- Required Slots: ${JSON.stringify(mission.requiredSlots)}
- Filled Slots: ${JSON.stringify(filledSlots)}
- Missing Slots: ${JSON.stringify(missingSlots)}
- User Level: A0-A2 beginner
- User Input: "${userInput}"
- Input Script: ${detectedScript}
- Turn Count: ${session.turns.length}

## Rules
- Determine what the user is trying to express
- Check if the input fills any missing slots
- Decide the next dialogue act
- If the user uses English, treat it as a help request, not an error
- Be tolerant of imperfect Chinese - if intent is clear, mark as understood

## Output (JSON only, no markdown)
{
  "understood": boolean,
  "user_intent_cn": "what the user likely meant in Chinese",
  "user_intent_en": "what the user likely meant in English",
  "newly_filled_slots": ["slot names filled by this input"],
  "next_act": "greet | ask_clarification | confirm | complete | encourage_retry",
  "next_state": "the state to transition to",
  "task_status": "in_progress | completed",
  "error_tags": ["measure_word", "tone", "word_order", etc. or empty],
  "hint_level_recommended": 0-4,
  "notes": "brief internal reasoning"
}`;
}

// ---------------------------------------------------------------------------
// NPC Prompt - Generates natural in-character NPC response
// ---------------------------------------------------------------------------

export function buildNpcPrompt(
  mission: Mission,
  policyOutput: {
    next_act: string;
    understood: boolean;
    newly_filled_slots: string[];
    task_status: string;
  },
  conversationHistory: Array<{ role: string; content: string }>,
): string {
  return `You are playing the role of: ${mission.npcPersona.roleEn} (${mission.npcPersona.role})
Style: ${mission.npcPersona.style}

## Scene
${mission.objectiveEn}

## Rules
- Stay in character as ${mission.npcPersona.role}. Never break character.
- Speak naturally in Chinese, as a real ${mission.npcPersona.role} would.
- Keep sentences SHORT and CLEAR — the user is a beginner (A0-A2).
- Do NOT teach grammar or explain language — just respond naturally.
- If the user's Chinese was imperfect but understandable, respond normally (don't correct them).
- If you didn't understand, ask them to repeat in a natural way (e.g., "你说什么？" or "请再说一遍？")
- Match the emotional tone: friendly, patient, not condescending.

## Current Situation
- Next Act: ${policyOutput.next_act}
- User was understood: ${policyOutput.understood}
- Slots just filled: ${JSON.stringify(policyOutput.newly_filled_slots)}
- Task status: ${policyOutput.task_status}

## Recent Conversation
${conversationHistory
  .slice(-6)
  .map((t) => `${t.role}: ${t.content}`)
  .join("\n")}

## Output (JSON only, no markdown)
{
  "reply_cn": "your response in Chinese",
  "reply_en": "English translation of your response",
  "emotion": "friendly | encouraging | confused | confirming | farewell"
}`;
}

// ---------------------------------------------------------------------------
// Debrief Prompt - Generates post-mission review
// ---------------------------------------------------------------------------

export function buildDebriefPrompt(
  mission: Mission,
  turns: Array<{ role: string; input: string; understood?: boolean; errorTags?: string[] }>,
  filledSlots: string[],
  hintUsageCount: number,
): string {
  const totalUserTurns = turns.filter((t) => t.role === "user").length;

  return `You are a Chinese language learning debrief coach.

## Mission Completed
- Mission: ${mission.titleEn} (${mission.title})
- Objective: ${mission.objectiveEn}
- Level: ${mission.level}
- Required Slots: ${JSON.stringify(mission.requiredSlots)}
- Filled Slots: ${JSON.stringify(filledSlots)}
- User Turns: ${totalUserTurns}
- Hints Used: ${hintUsageCount}

## Conversation Transcript
${turns.map((t) => `[${t.role}] ${t.input}${t.errorTags?.length ? ` (errors: ${t.errorTags.join(", ")})` : ""}`).join("\n")}

## Rules
- First, praise ONE specific thing the user did well (be genuine, not generic)
- Then give 1-3 HIGH-VALUE corrections only:
  - Errors that affect understanding (HIGH priority)
  - Errors that affect task completion (HIGH priority)
  - Unnatural but understandable expressions (MEDIUM)
  - Do NOT mention minor grammar or pronunciation details
- For each fix, provide: what they said → what's more natural → why
- Suggest 2-3 transfer patterns: same structure, different context
- Each transfer pattern must include: hanzi, pinyin, chunks, gloss, naturalEn

## Output (JSON only, no markdown)
{
  "result": "success | partial_success | failure",
  "score": 0.0-1.0,
  "strengths": ["specific praise point 1", "..."],
  "top_fixes": [
    {
      "type": "measure_word | word_order | missing_element | unnatural",
      "before": "what user said",
      "after": "more natural version",
      "reason": "brief explanation in English"
    }
  ],
  "transfer_patterns": [
    {
      "hanzi": "Chinese sentence",
      "pinyin": "pinyin with tones",
      "chunks": ["chunk1", "chunk2"],
      "gloss": ["gloss1", "gloss2"],
      "naturalEn": "English translation",
      "level": "A0"
    }
  ]
}`;
}
