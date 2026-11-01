/**
 * First-party funnel events: the whitelist and the shape rules shared by the
 * browser helper (src/lib/track.ts) and the /api/event route.
 *
 * Only counters travel here. Every event has a fixed vocabulary: the properties
 * it may carry and the values each may take (a plan id, a mission id, a place in
 * the funnel). Nothing else is accepted, so no free text — and so no email, name,
 * address or id of a person — can reach the log.
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

const MISSION_ID = /^m[0-9]{1,3}$/; // src/lib/data/scenarios.ts mission ids: m1, m2, ...
const RESULTS = ["success", "partial_success", "failure"] as const; // DebriefResult.result
const PLANS = ["cm_monthly", "cm_yearly", "premium"] as const; // Paywall PRICING ids and the pricing page's plan

type PropRule = RegExp | readonly string[];

/** The properties each event may carry, and the values each property may take. */
export const EVENT_PROPS: Record<TrackEvent, Record<string, PropRule>> = {
  cta_click: { where: ["hero"] },
  trial_start: { mission_id: MISSION_ID },
  paywall_view: {},
  upgrade_click: { plan: PLANS, source: ["paywall", "pricing"] },
  result_view: { result: RESULTS, mission_id: MISSION_ID },
  share_click: { result: RESULTS },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isTrackEvent(v: unknown): v is TrackEvent {
  return typeof v === "string" && (TRACK_EVENTS as readonly string[]).includes(v);
}

function valueAllowed(rule: PropRule, value: string): boolean {
  return rule instanceof RegExp ? rule.test(value) : rule.includes(value);
}

/** Returns why a prop is refused for this event, or null when it is fine. */
function propProblem(event: TrackEvent, key: string, value: unknown): string | null {
  const rule = Object.prototype.hasOwnProperty.call(EVENT_PROPS[event], key) ? EVENT_PROPS[event][key] : undefined;
  if (!rule) return `props key "${key.slice(0, 24)}" is not a property of ${event}`;
  if (typeof value !== "string") return `props.${key} must be a string`;
  if (value.length > MAX_PROP_VALUE_LENGTH) return `props.${key} is too long (max ${MAX_PROP_VALUE_LENGTH} chars)`;
  if (!valueAllowed(rule, value)) return `props.${key} has a value ${event} does not use`;
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
    const problem = propProblem(body.event, key, value);
    if (problem) return { ok: false, error: problem };
    props[key] = value as string;
  }
  return { ok: true, event: body.event, props };
}

/**
 * Client-side best effort: keeps the properties the event defines, with a value
 * from its vocabulary, and drops everything else, so the route accepts the call.
 */
export function sanitizeProps(event: TrackEvent, props: Record<string, string | number | boolean | null | undefined> | undefined): EventProps {
  const out: EventProps = {};
  if (!props || !isTrackEvent(event)) return out;
  for (const [key, value] of Object.entries(props)) {
    if (typeof value !== "string" || propProblem(event, key, value)) continue;
    out[key] = value;
  }
  return out;
}
