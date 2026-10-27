import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  // Resolves the Open Graph / Twitter image URLs and the canonical URL below to absolute ones.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Chinese Mission — AI-Powered Task-Based Chinese Learning",
    template: "%s | Chinese Mission",
  },
  description: "AI-powered immersive Chinese learning through real-world missions. Practice ordering coffee, taking a taxi, and making friends with an AI conversation partner. Free daily practice: 3 missions a day.",
  keywords: ["learn Chinese online", "Chinese conversation practice", "AI Chinese tutor", "task-based Chinese learning", "HSK practice", "Mandarin speaking", "中文学习"],
  authors: [{ name: "Tony Sheng" }],
  openGraph: {
    title: "Chinese Mission — AI-Powered Task-Based Chinese Learning",
    description: "Practice real-world Chinese with AI. Complete missions in cafe and restaurant, transport, directions, introductions, friendship, and work scenarios.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chinese Mission — AI-Powered Task-Based Chinese Learning",
    description: "Practice real-world Chinese with AI. Complete missions in cafe and restaurant, transport, directions, introductions, friendship, and work scenarios.",
  },
  robots: "index, follow",
  alternates: {
    // "./" resolves against each page's own path; a fixed URL here would make every subpage canonicalize to the homepage.
    canonical: "./",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Chinese Mission",
    description: "AI-powered immersive Chinese learning through real-world missions. Practice ordering coffee, taking a taxi, and making friends with an AI conversation partner.",
    provider: {
      "@type": "Organization",
      name: "Chinese Mission",
      url: siteUrl(),
    },
    educationalLevel: "Beginner to Intermediate",
    inLanguage: "zh",
    courseMode: "AI conversation",
    hasCourseInstance: [
      // The six mission groups in src/lib/data/scenario-meta.ts (20 missions in total).
      { "@type": "CourseInstance", name: "Cafe & Restaurant", courseMode: "online" },
      { "@type": "CourseInstance", name: "Taxi & Transport", courseMode: "online" },
      { "@type": "CourseInstance", name: "Ask Directions", courseMode: "online" },
      { "@type": "CourseInstance", name: "Self Introduction", courseMode: "online" },
      { "@type": "CourseInstance", name: "Making Friends", courseMode: "online" },
      { "@type": "CourseInstance", name: "Work Basics", courseMode: "online" },
    ],
    // Same as the pricing page: the free plan (¥0, 3 missions a day) is the only plan on sale.
    // Premium (planned ¥28/month, ¥168/year) gets an Offer once it can be bought.
    offers: {
      "@type": "Offer",
      name: "Free plan",
      description: "3 missions per day, all 20 missions",
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
