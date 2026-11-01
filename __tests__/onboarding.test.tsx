import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { scenarios } from "../src/lib/data/scenarios";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import OnboardingPage from "../src/app/onboarding/page";

describe("Onboarding goals", () => {
  it("offers only goals that have missions behind them (no travel or hotel goal)", () => {
    const html = renderToString(<OnboardingPage />);
    for (const label of ["Survival in China", "Social / Friends", "Work / Business"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Travel");
    expect(html).not.toContain("Hotels");
    // Every remaining goal maps to at least one mission group.
    const categories = new Set(scenarios.map((s) => s.category));
    for (const goal of ["survival", "social", "work"]) expect(categories.has(goal as never)).toBe(true);
    expect(categories.has("travel" as never)).toBe(false);
  });
});
