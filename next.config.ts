import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy compatible with the PayPal JS SDK (buttons, popup and card fields).
 * 'unsafe-inline' scripts are needed by Next.js hydration without nonces; 'unsafe-eval' only in dev.
 */
const PAYPAL = "https://*.paypal.com https://*.paypalobjects.com";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} ${PAYPAL}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${PAYPAL}`,
  "font-src 'self' data:",
  `connect-src 'self' ${PAYPAL} https://*.braintreegateway.com`,
  `frame-src ${PAYPAL}`,
  `child-src ${PAYPAL}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets E2E builds use their own folder without touching the dev server cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
