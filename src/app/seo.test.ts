// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import robots from "./robots";
import sitemap from "./sitemap";
import { metadata as teachingPipeline } from "./teaching-pipeline/page";

describe("crawler directives", () => {
  it("lists no sitemap URL that robots.txt disallows", () => {
    const disallowed = [robots().rules]
      .flat()
      .flatMap((rule) => [rule.disallow ?? []].flat());
    for (const { url } of sitemap()) {
      const path = new URL(url).pathname;
      expect(disallowed.filter((prefix) => path.startsWith(prefix)), path).toEqual([]);
    }
  });

  it("serves robots.txt from app/robots.ts, not a static file that would shadow it", () => {
    expect(existsSync(path.join(process.cwd(), "public", "robots.txt"))).toBe(false);
  });

  it("keeps the internal teaching-pipeline preview out of search results", () => {
    expect(teachingPipeline.robots).toMatchObject({ index: false });
  });
});
