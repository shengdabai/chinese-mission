import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import LandingPage from "../src/app/page";

describe("Landing page", () => {
  it("renders without crashing", () => {
    const html = renderToString(LandingPage());
    expect(html).toContain("Chinese Mission");
  });

  it("lists the 6 mission groups that exist, and no hotel or travel group", () => {
    const html = renderToString(LandingPage());
    for (const group of ["咖啡厅与餐厅", "打车与交通", "问路", "自我介绍", "交朋友", "职场基础"]) {
      expect(html).toContain(group);
    }
    expect(html).not.toContain("酒店");
  });

  it("includes CTA links to onboarding and pricing", () => {
    const html = renderToString(LandingPage());
    expect(html).toContain("/onboarding");
    expect(html).toContain("/pricing");
  });

  it("includes How It Works section", () => {
    const html = renderToString(LandingPage());
    expect(html).toContain("How It Works");
    expect(html).toContain("Choose a Mission");
    expect(html).toContain("Chat with AI");
    expect(html).toContain("Review &amp; Improve"); // renderToString HTML-escapes "&"
  });

  it("includes free trial messaging", () => {
    const html = renderToString(LandingPage());
    expect(html).toContain("3 Daily Attempts");
    expect(html).toContain("3 free tasks daily");
  });
});
