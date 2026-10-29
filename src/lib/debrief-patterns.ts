import type { GlossItem } from "./types";

/** Malformed token alignment falls back to a single sentence/translation pair. */
export function normalizeTransferPatterns(value: unknown): GlossItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p: unknown) => {
    if (typeof p !== "object" || p === null) return [];
    const pattern = p as Record<string, unknown>;
    const { hanzi, pinyin, naturalEn, chunks, gloss, level } = pattern;
    if (typeof hanzi !== "string" || typeof pinyin !== "string" || typeof naturalEn !== "string") return [];
    const aligned = Array.isArray(chunks) && Array.isArray(gloss) && chunks.length > 0
      && chunks.length === gloss.length && chunks.every((s) => typeof s === "string")
      && gloss.every((s) => typeof s === "string");
    return [{ hanzi, pinyin, naturalEn, chunks: aligned ? chunks : [hanzi],
      gloss: aligned ? gloss : [naturalEn], level: level === "A1" || level === "A2" ? level : "A0" } as GlossItem];
  });
}
