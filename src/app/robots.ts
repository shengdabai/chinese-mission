import type { MetadataRoute } from "next";

const BASE_URL = "https://chinese-mission.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/profile"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
