/**
 * Boundary validation for the chat / debrief API routes.
 * Bodies come from the browser and must be treated as untrusted: a malformed
 * body is a 400, and size caps stop oversized payloads from being forwarded
 * to a paid model.
 */

export const MAX_USER_INPUT_LENGTH = 500;
export const MAX_TURNS = 200;
export const MAX_TURN_TEXT_LENGTH = 2000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validTurns(turns: unknown): boolean {
  if (!Array.isArray(turns) || turns.length > MAX_TURNS) return false;
  return turns.every((t) => {
    if (!isPlainObject(t)) return false;
    if (typeof t.role !== "string") return false;
    if (typeof t.rawInput !== "string" || t.rawInput.length > MAX_TURN_TEXT_LENGTH) return false;
    if (
      t.npcReplyCn !== undefined &&
      (typeof t.npcReplyCn !== "string" || t.npcReplyCn.length > MAX_TURN_TEXT_LENGTH)
    ) {
      return false;
    }
    if (t.errorTags !== undefined && !Array.isArray(t.errorTags)) return false;
    return true;
  });
}

function validSlots(slots: unknown): boolean {
  return isPlainObject(slots) && Object.values(slots).every((v) => typeof v === "string");
}

/** Returns an error message, or null when the body is a usable chat request. */
export function validateChatBody(body: unknown): string | null {
  if (!isPlainObject(body)) return "Invalid request body";
  if (typeof body.missionId !== "string") return "missionId must be a string";
  if (typeof body.userInput !== "string" || !body.userInput.trim()) {
    return "userInput must be a non-empty string";
  }
  if (body.userInput.length > MAX_USER_INPUT_LENGTH) {
    return `userInput too long (max ${MAX_USER_INPUT_LENGTH} chars)`;
  }
  const session = body.session;
  if (!isPlainObject(session)) return "session is required";
  if (typeof session.currentState !== "string") return "session.currentState must be a string";
  if (!validSlots(session.slotsFilledMap)) return "session.slotsFilledMap must be an object of strings";
  if (!validTurns(session.turns)) return "session.turns is invalid or too long";
  if (typeof session.hintLevel !== "number" || !Number.isFinite(session.hintLevel)) {
    return "session.hintLevel must be a number";
  }
  return null;
}

/** Returns an error message, or null when the body is a usable debrief request. */
export function validateDebriefBody(body: unknown): string | null {
  if (!isPlainObject(body)) return "Invalid request body";
  if (typeof body.missionId !== "string") return "missionId must be a string";
  const session = body.session;
  if (!isPlainObject(session)) return "session is required";
  if (!validSlots(session.slotsFilledMap)) return "session.slotsFilledMap must be an object of strings";
  if (!validTurns(session.turns)) return "session.turns is invalid or too long";
  if (
    session.hintUsageCount !== undefined &&
    (typeof session.hintUsageCount !== "number" || !Number.isFinite(session.hintUsageCount))
  ) {
    return "session.hintUsageCount must be a number";
  }
  return null;
}
