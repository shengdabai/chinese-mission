import type { GlossItem, Turn } from "./types";

export interface StoredUser {
  goal: string;
  level: string;
  mode: string;
}

export interface StoredPhrase {
  id: string;
  textCn: string;
  gloss: Omit<GlossItem, "level">;
  sourceMissionId: string;
  masteryScore: number;
  savedAt: string;
}

export interface StoredSession {
  turns: (Omit<Turn, "rawInput"> & { rawInput?: string })[];
  filledSlots: string[];
  hintUsageCount?: number;
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === "string");

export function completedMissionIds(ids: string[], knownIds: string[]): string[] {
  const known = new Set(knownIds);
  return [...new Set(ids)].filter((id) => known.has(id));
}
const optional = (v: unknown, check: (value: unknown) => boolean) => v === undefined || check(v);
const nonnegative = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0;

export function isStoredUser(v: unknown): v is StoredUser {
  return record(v) && ["survival", "social", "work", "travel"].includes(v.goal as string)
    && ["A0", "A1", "A2"].includes(v.level as string)
    && ["text", "voice", "mixed"].includes(v.mode as string);
}

export function isStoredPhrase(p: unknown): p is StoredPhrase {
  return record(p)
    && [p.id, p.textCn, p.sourceMissionId, p.savedAt].every((s) => typeof s === "string")
    && typeof p.masteryScore === "number" && Number.isFinite(p.masteryScore)
    && p.masteryScore >= 0 && p.masteryScore <= 1 && record(p.gloss)
    && [p.gloss.hanzi, p.gloss.pinyin, p.gloss.naturalEn].every((s) => typeof s === "string")
    && isStringArray(p.gloss.chunks) && isStringArray(p.gloss.gloss)
    && p.gloss.chunks.length === p.gloss.gloss.length
    && optional(p.gloss.note, (s) => typeof s === "string");
}

export function isPhrasebook(v: unknown): v is StoredPhrase[] {
  return Array.isArray(v) && v.every(isStoredPhrase);
}

export function readPhrasebook(): StoredPhrase[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem("chinese-mission-phrasebook") ?? "[]");
    return Array.isArray(value) ? value.filter(isStoredPhrase) : [];
  } catch {
    return [];
  }
}

/** Edit valid entries only; unrecognized entries remain available for later recovery. */
export function updatePhrasebook(update: (items: StoredPhrase[]) => StoredPhrase[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value: unknown = JSON.parse(localStorage.getItem("chinese-mission-phrasebook") ?? "[]");
    if (!Array.isArray(value)) return false;
    const updated = update(value.filter(isStoredPhrase));
    if (!isPhrasebook(updated)) return false;
    let index = 0;
    const merged = value.flatMap((entry) => !isStoredPhrase(entry) ? [entry]
      : index < updated.length ? [updated[index++]] : []);
    merged.push(...updated.slice(index));
    localStorage.setItem("chinese-mission-phrasebook", JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}

export function isStoredSession(v: unknown): v is StoredSession {
  return record(v) && isStringArray(v.filledSlots) && Array.isArray(v.turns)
    && optional(v.hintUsageCount, nonnegative)
    && v.turns.every((t) => record(t) && ["user", "npc", "system"].includes(t.role as string)
      && [t.id, t.timestamp].every((s) => typeof s === "string")
      && (typeof t.rawInput === "string" || (t.role === "npc" && t.rawInput === undefined))
      && optional(t.understood, (b) => typeof b === "boolean")
      && optional(t.errorTags, isStringArray) && optional(t.slotsFilled, isStringArray)
      && optional(t.hintUsed, (n) => nonnegative(n) && (n as number) <= 4)
      && optional(t.detectedScript, (s) => ["hanzi", "pinyin", "mixed", "en"].includes(s as string))
      && [t.npcReplyCn, t.npcReplyEn].every((s) => optional(s, (text) => typeof text === "string")));
}

/** Never replace an unreadable collection with a fallback: preserve its original bytes. */
export function updateStoredArray<T>(
  key: string, validate: (v: unknown) => v is T[], update: (items: T[]) => T[],
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(key);
    const items: unknown = raw === null ? [] : JSON.parse(raw);
    if (!validate(items)) return false;
    const updated = update(items);
    if (!validate(updated)) return false;
    localStorage.setItem(key, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}
