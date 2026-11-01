import { ImageResponse } from "next/og";

// Text-only brand card for link previews. Latin text only: the default font of
// ImageResponse has no Chinese glyphs, and a web font would need a network fetch at build time.
export const alt = "Chinese Mission — AI-Powered Task-Based Chinese Learning";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same indigo-to-purple pair the landing page uses for its headline accent (Tailwind indigo-600 / purple-600).
const BRAND_FROM = "#4f46e5";
const BRAND_TO = "#9333ea";
const TEXT = "#ffffff";
const TEXT_SOFT = "rgba(255, 255, 255, 0.85)";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          backgroundImage: `linear-gradient(135deg, ${BRAND_FROM}, ${BRAND_TO})`,
          color: TEXT,
        }}
      >
        <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>Chinese Mission</div>
        <div style={{ marginTop: 28, fontSize: 48, fontWeight: 500, lineHeight: 1.25, color: TEXT_SOFT }}>
          AI-Powered Task-Based Chinese Learning
        </div>
      </div>
    ),
    { ...size },
  );
}
