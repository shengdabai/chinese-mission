import type { Metadata } from "next";
import { DM_Sans, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-sc",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Chinese Mission - 中文任务世界",
  description: "AI-powered immersive Chinese learning through real-world missions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-cmn-Hans" className={`${dmSans.variable} ${notoSansSC.variable}`}>
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
