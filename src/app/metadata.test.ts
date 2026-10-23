// @vitest-environment node
import { describe, it, expect } from "vitest";
import OgImage, { alt, contentType, size } from "./opengraph-image";
import { metadata } from "./layout";

describe("link-preview metadata", () => {
  it("asks for a large Twitter card with the same title and description as Open Graph", () => {
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: metadata.openGraph?.title,
      description: metadata.openGraph?.description,
    });
  });

  it("sets metadataBase so preview image URLs are absolute", () => {
    const base = metadata.metadataBase;
    expect(base).toBeInstanceOf(URL);
    expect((base as URL).protocol).toMatch(/^https?:$/);
  });

  it("uses one site address for the canonical link, the JSON-LD url and metadataBase", () => {
    const base = (metadata.metadataBase as URL).origin;
    expect(metadata.alternates?.canonical).toBe(base);
    expect(base).toMatch(/^https?:\/\//);
  });

  it("describes the OG card as a 1200x630 PNG", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
    expect(alt).toContain("Chinese Mission");
  });

  it("renders the OG card as a real PNG of that size", async () => {
    const res = OgImage();
    expect(res.headers.get("content-type")).toBe("image/png");
    const png = Buffer.from(await res.arrayBuffer());
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a"); // PNG signature
    expect(png.readUInt32BE(16)).toBe(1200); // IHDR width
    expect(png.readUInt32BE(20)).toBe(630); // IHDR height
  });
});
