import { siteUrl } from "@/lib/site";

export default function sitemap() {
  const BASE_URL = siteUrl();
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/onboarding`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/missions`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/phrasebook`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  ];
}
