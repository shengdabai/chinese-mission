/**
 * Text that goes to Edge TTS is interpolated into SSML by msedge-tts. Anonymous callers must
 * not be able to inject markup (<break>, <prosody>, <voice>, <audio src=…>) or control
 * characters, so the text is reduced to plain characters and XML-escaped before synthesis.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeForSsml(input: string): string {
  return input
    .replace(CONTROL_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .trim();
}

/** Hard cap on the audio we buffer for one request (text is ≤ 400 chars; 2 MB is far above a normal clip). */
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
