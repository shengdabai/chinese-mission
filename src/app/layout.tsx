import type { Metadata } from "next";
import "./globals.css";
import { configuredSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  // Resolves the Open Graph / Twitter image URLs to absolute ones. Same host as the canonical URL below unless NEXT_PUBLIC_SITE_URL overrides it.
  metadataBase: new URL(configuredSiteUrl() ?? "https://chinese-mission.vercel.app"),
  title: {
    default: "Chinese Mission — AI-Powered Task-Based Chinese Learning",
    template: "%s | Chinese Mission",
  },
  description: "AI-powered immersive Chinese learning through real-world missions. Practice ordering coffee, booking hotels, and making friends with an AI conversation partner. Free daily practice, premium unlimited access.",
  keywords: ["learn Chinese online", "Chinese conversation practice", "AI Chinese tutor", "task-based Chinese learning", "HSK practice", "Mandarin speaking", "中文学习"],
  authors: [{ name: "Tony Sheng" }],
  openGraph: {
    title: "Chinese Mission — AI-Powered Task-Based Chinese Learning",
    description: "Practice real-world Chinese with AI. Complete missions in cafe, restaurant, hotel, travel, social, and work scenarios.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chinese Mission — AI-Powered Task-Based Chinese Learning",
    description: "Practice real-world Chinese with AI. Complete missions in cafe, restaurant, hotel, travel, social, and work scenarios.",
  },
  robots: "index, follow",
  alternates: {
    canonical: "https://chinese-mission.vercel.app",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Chinese Mission",
    description: "AI-powered immersive Chinese learning through real-world missions. Practice ordering coffee, booking hotels, and making friends with an AI conversation partner.",
    provider: {
      "@type": "Organization",
      name: "Chinese Mission",
      url: "https://chinese-mission.vercel.app",
    },
    educationalLevel: "Beginner to Intermediate",
    inLanguage: "zh",
    courseMode: "AI conversation",
    hasCourseInstance: [
      { "@type": "CourseInstance", name: "Cafe Mission", courseMode: "online" },
      { "@type": "CourseInstance", name: "Restaurant Mission", courseMode: "online" },
      { "@type": "CourseInstance", name: "Hotel Mission", courseMode: "online" },
      { "@type": "CourseInstance", name: "Travel Mission", courseMode: "online" },
      { "@type": "CourseInstance", name: "Social Mission", courseMode: "online" },
      { "@type": "CourseInstance", name: "Work Mission", courseMode: "online" },
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <html lang="zh-cmn-Hans">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow"
        >
          Skip to main content
        </a>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
