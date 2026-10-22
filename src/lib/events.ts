/**
 * First-party funnel events: the whitelist and the shape rules shared by the
 * browser helper (src/lib/track.ts) and the /api/event route.
 *
 * Only counters travel here. No emails, names, user ids or free text: props are
 * a handful of short strings that name a place in the funnel (e.g. mission_id).
 */

export const TRACK_EVENTS = [
  "cta_click",
  "trial_start",
  "paywall_view",
  "upgrade_click",
  "result_view",
  "share_click",
] as const;

export type TrackEvent = (typeof TRACK_EVENTS)[number];
export type EventProps = Record<string, string>;

export const MAX_EVENT_BODY_BYTES = 1024;
export const MAX_PROPS = 5;
export const MAX_PROP_VALUE_LENGTH = 40;

const PROP_KEY = /^[a-z][a-z0-9_]{0,23}$/;
/** Words that, as a whole "_"-separated part of a key, mean the prop would carry personal data. */
const PERSONAL_KEY_PARTS = new Set(["email", "mail", "name", "user", "username", "uid", "userid", "phone", "ip", "token"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isTrackEvent(v: unknown): v is TrackEvent {
  return typeof v === "string" && (TRACK_EVENTS as readonly string[]).includes(v);
}

/** Returns why a prop key is refused, or null when it is fine. */
function propKeyProblem(key: string): string | null {
  if (!PROP_KEY.test(key)) return `props key "${key.slice(0, 24)}" must be 1-24 chars of a-z, 0-9, _`;
  if (key === "id" || key.split("_").some((part) => PERSONAL_KEY_PARTS.has(part))) {
    return `props key "${key}" looks personal and is not accepted`;
  }
  return null;
}

export type ParsedEvent = { ok: true; event: TrackEvent; props: EventProps } | { ok: false; error: string };

/** Validates an untrusted request body. Anything that is not exactly { event, props? } is refused. */
export function parseEventBody(body: unknown): ParsedEvent {
  if (!isPlainObject(body)) return { ok: false, error: "Invalid request body" };
  for (const key of Object.keys(body)) {
    if (key !== "event" && key !== "props") return { ok: false, error: `Unexpected field "${key.slice(0, 24)}"` };
  }
  if (!isTrackEvent(body.event)) return { ok: false, error: "Unknown event" };

  const rawProps = body.props;
  if (rawProps === undefined) return { ok: true, event: body.event, props: {} };
  if (!isPlainObject(rawProps)) return { ok: false, error: "props must be an object" };

  const entries = Object.entries(rawProps);
  if (entries.length > MAX_PROPS) return { ok: false, error: `props allows at most ${MAX_PROPS} keys` };

  const props: EventProps = {};
  for (const [key, value] of entries) {
    const problem = propKeyProblem(key);
    if (problem) return { ok: false, error: problem };
    if (typeof value !== "string") return { ok: false, error: `props.${key} must be a string` };
    if (value.length > MAX_PROP_VALUE_LENGTH) {
      return { ok: false, error: `props.${key} is too long (max ${MAX_PROP_VALUE_LENGTH} chars)` };
    }
    if (value.includes("@")) return { ok: false, error: `props.${key} looks like an email address` };
    props[key] = value;
  }
  return { ok: true, event: body.event, props };
}

/**
 * Client-side best effort: shape caller props so the route accepts them.
 * Keeps strings, numbers and booleans (as strings); drops keys or values the
 * route would refuse; cuts values to 40 chars and the list to 5 entries.
 */
export function sanitizeProps(props: Record<string, string | number | boolean | null | undefined> | undefined): EventProps {
  const out: EventProps = {};
  if (!props) return out;
  for (const [key, value] of Object.entries(props)) {
    if (Object.keys(out).length >= MAX_PROPS) break;
    if (propKeyProblem(key)) continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
    const text = String(value).slice(0, MAX_PROP_VALUE_LENGTH);
    if (text.includes("@")) continue;
    out[key] = text;
  }
  return out;
}
