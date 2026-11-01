import type { NextConfig } from "next";

// Response headers for every route (launch-check F3). HSTS is added by Vercel itself.
// No Content-Security-Policy yet: Next.js inline scripts need a nonce setup first; add it
// as Report-Only with a report endpoint before enforcing.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
