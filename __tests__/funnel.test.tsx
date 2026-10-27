import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { ReactElement } from "react";
import { scenarios } from "../src/lib/data/scenarios";
import type { DebriefResult } from "../src/lib/types";

// next/navigation needs the App Router; the pages only use params + router.push here.
const router = { push: vi.fn(), replace: vi.fn() };
const params = { id: scenarios[0].missions[0].id };
vi.mock("next/navigation", () => ({
  useParams: () => params,
  useRouter: () => router,
}));

import LandingPage from "../src/app/page";
import PricingPage from "../src/app/pricing/page";
import WarmupPage from "../src/app/missions/[id]/warmup/page";
import DebriefPage from "../src/app/missions/[id]/debrief/page";
import { Paywall } from "../src/components/Paywall";
import DebriefCard from "../src/components/DebriefCard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mission = scenarios[0].missions[0];
const fetchMock = vi.fn();
let container: HTMLDivElement;
let root: Root;

/** Funnel events sent so far, parsed. */
function events(): Array<{ event: string; props: Record<string, string> }> {
  return fetchMock.mock.calls
    .filter(([url]) => url === "/api/event")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));
}

async function render(el: ReactElement) {
  await act(async () => {
    root.render(el);
  });
}

function byText(text: string, selector = "a,button"): HTMLElement {
  const found = Array.from(container.querySelectorAll<HTMLElement>(selector)).find((n) => n.textContent?.trim() === text);
  if (!found) throw new Error(`no ${selector} with text "${text}"`);
  return found;
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

const noNavigation = (e: Event) => e.preventDefault(); // jsdom cannot navigate; React handlers still run

beforeEach(() => {
  localStorage.clear();
  router.push.mockReset();
  router.replace.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
  document.addEventListener("click", noNavigation);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.removeEventListener("click", noNavigation);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("landing page", () => {
  it("counts cta_click on the hero Start Free button only", async () => {
    await render(<LandingPage />);
    await click(byText("Start Free — 3 Daily Attempts"));
    expect(events()).toEqual([{ event: "cta_click", props: { where: "hero" } }]);

    await click(byText("View Pricing"));
    expect(events()).toHaveLength(1);
  });

  it("keeps the hero CTA a plain link to /onboarding", async () => {
    await render(<LandingPage />);
    expect(byText("Start Free — 3 Daily Attempts").getAttribute("href")).toBe("/onboarding");
  });
});

describe("pricing page", () => {
  it("counts upgrade_click on the Premium button and keeps it otherwise inert", async () => {
    await render(<PricingPage />);
    const button = byText("即将开放", "button");
    await click(button);
    expect(events()).toEqual([{ event: "upgrade_click", props: { plan: "premium", source: "pricing" } }]);
    expect(button.getAttribute("type")).toBe("button");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("does not count the free-plan Start Free link", async () => {
    await render(<PricingPage />);
    const free = Array.from(container.querySelectorAll<HTMLElement>("a")).filter((a) => a.textContent?.includes("Start Free →"));
    expect(free.length).toBeGreaterThan(0);
    await click(free[free.length - 1]);
    expect(events()).toEqual([]);
  });
});

describe("Paywall", () => {
  it("counts paywall_view once when it appears", async () => {
    await render(<Paywall onClose={() => {}} resetsAt="" used={3} limit={3} />);
    expect(events()).toEqual([{ event: "paywall_view", props: {} }]);
  });

  it("counts upgrade_click for each plan button and leaves close buttons uncounted", async () => {
    const onClose = vi.fn();
    await render(<Paywall onClose={onClose} resetsAt="" used={3} limit={3} />);
    await click(container.querySelector<HTMLElement>('[data-pricing-id="cm_yearly"]')!);
    await click(container.querySelector<HTMLElement>('[data-pricing-id="cm_monthly"]')!);
    expect(events().slice(1)).toEqual([
      { event: "upgrade_click", props: { plan: "cm_yearly", source: "paywall" } },
      { event: "upgrade_click", props: { plan: "cm_monthly", source: "paywall" } },
    ]);

    await click(byText("稍后再说", "button"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(events()).toHaveLength(3);
  });

  it("states the real number of attempts used and the local reset time", async () => {
    const resetsAt = "2026-10-28T16:00:00.000Z";
    await render(<Paywall onClose={() => {}} resetsAt={resetsAt} used={2} limit={3} />);
    const text = container.textContent ?? "";
    expect(text).toContain("今天已用 2/3 次免费任务");
    const local = new Date(resetsAt).toLocaleString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
    expect(text).toContain(`${local} 重置`);
    // Attempts are debited when a mission starts, so the paywall must not claim they were completed.
    expect(text).not.toContain("已完成");
  });
});

describe("warmup page", () => {
  async function renderWarmup() {
    await render(<WarmupPage />);
    await vi.waitFor(() => expect(container.textContent).toContain("Start Conversation"));
  }

  it("counts trial_start when a conversation starts, then opens the chat", async () => {
    await renderWarmup();
    await click(byText("Start Conversation", "button"));
    expect(events()).toEqual([{ event: "trial_start", props: { mission_id: mission.id } }]);
    expect(router.push).toHaveBeenCalledWith(`/missions/${mission.id}/chat`);
  });

  it("counts paywall_view, not trial_start, when the free quota is used up", async () => {
    localStorage.setItem(
      "chinese-mission-daily-quota",
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), attemptsUsed: 3 }),
    );
    await renderWarmup();
    await click(byText("Start Conversation", "button"));
    expect(events().map((e) => e.event)).toEqual(["paywall_view"]);
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("debrief page", () => {
  const debrief: DebriefResult = {
    result: "success",
    score: 0.9,
    strengths: ["Clear request"],
    topFixes: [],
    transferPatterns: [],
  };

  beforeEach(() => {
    localStorage.setItem(
      `chinese-mission-session-${mission.id}`,
      JSON.stringify({ turns: [], filledSlots: [], hintUsageCount: 0 }),
    );
  });

  it("counts result_view once when the AI debrief is shown", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/debrief" ? Response.json(debrief) : new Response(null, { status: 204 }),
    );
    await render(<DebriefPage />);
    await vi.waitFor(() => expect(container.textContent).toContain("Mission Complete!"));
    expect(events()).toEqual([{ event: "result_view", props: { result: "success", mission_id: mission.id } }]);
  });

  it("counts result_view when the local fallback debrief is shown", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/debrief") throw new TypeError("offline");
      return new Response(null, { status: 204 });
    });
    await render(<DebriefPage />);
    await vi.waitFor(() => expect(events()).toHaveLength(1));
    expect(events()[0].event).toBe("result_view");
    expect(events()[0].props.mission_id).toBe(mission.id);
  });

  it("counts nothing while the debrief is still loading", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {})); // debrief request never answers
    await render(<DebriefPage />);
    expect(container.textContent).toContain("Generating debrief");
    expect(events()).toEqual([]);
  });
});

describe("DebriefCard share button", () => {
  const debrief: DebriefResult = {
    result: "partial_success",
    score: 0.72,
    strengths: [],
    topFixes: [],
    transferPatterns: [],
  };
  const card = (
    <DebriefCard
      debrief={debrief}
      missionTitle="Order a coffee"
      onRetry={() => {}}
      onNextMission={() => {}}
      onSaveExpression={() => {}}
    />
  );

  it("renders a Share button next to the score", () => {
    const html = renderToString(card).replace(/<!-- -->/g, ""); // React inserts these between adjacent text nodes
    expect(html).toContain("Score: 72%");
    expect(html).toMatch(/<button[^>]*>Share<\/button>/);
  });

  it("opens the native share sheet with score, mission title and site URL, and counts share_click", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });
    await render(card);
    await click(byText("Share", "button"));

    expect(share).toHaveBeenCalledWith({
      title: "Chinese Mission",
      text: 'Chinese Mission: I scored 72% on "Order a coffee".',
      url: "https://example.test",
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(events()).toEqual([{ event: "share_click", props: { result: "partial_success" } }]);
  });

  it("copies the text and URL and says so when the browser has no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await render(card);
    await click(byText("Share", "button"));

    expect(writeText).toHaveBeenCalledWith('Chinese Mission: I scored 72% on "Order a coffee". https://example.test');
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Copied to clipboard");
    expect(events().map((e) => e.event)).toEqual(["share_click"]);
  });

  it("says so when copying fails too, and still counts the click", async () => {
    vi.stubGlobal("navigator", {});
    await render(card);
    await click(byText("Share", "button"));
    expect(container.querySelector('[role="status"]')?.textContent).toMatch(/could not share/i);
    expect(events().map((e) => e.event)).toEqual(["share_click"]);
  });

  it("shows no message when the user just closes the share sheet", async () => {
    vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")) });
    await render(card);
    await click(byText("Share", "button"));
    expect(container.querySelector('[role="status"]')?.textContent).toBe("");
  });

  it("keeps Try Again and Next Mission working", async () => {
    const onRetry = vi.fn();
    const onNext = vi.fn();
    await render(
      <DebriefCard debrief={debrief} onRetry={onRetry} onNextMission={onNext} onSaveExpression={() => {}} />,
    );
    await click(byText("Try Again", "button"));
    await click(byText("Next Mission →", "button"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
