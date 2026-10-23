// @vitest-environment node
import { describe, it, expect } from "vitest";
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

  it("keeps the internal teaching-pipeline preview out of search results", () => {
    expect(teachingPipeline.robots).toMatchObject({ index: false });
  });
});
