import type { NextConfig } from "next";

// Content-Security-Policy for this app. Turnstile (register page) is the
// one third-party dependency that needs explicit allowances — it loads a
// script and renders its challenge in an iframe, both from
// challenges.cloudflare.com; see app/register/_components/turnstile-widget.
// next/font/google self-hosts fonts at build time (see app/layout.tsx), so
// no fonts.googleapis.com/gstatic.com allowance is needed here.
//
// script-src and style-src include 'unsafe-inline' as a deliberate,
// pragmatic gap: Next's App Router injects small inline bootstrap scripts
// (and some inline styles) that a strict CSP would otherwise need a
// per-request nonce to allow. Wiring a nonce through requires generating
// one in proxy.ts (the renamed middleware.ts) and threading it onto every
// response, including the ones proxy.ts doesn't currently touch (e.g. the
// home page) — a real change to working auth-redirect middleware, not a
// config-only one, so it's left as a follow-up rather than risked here.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Applies to every route this app serves, including the ones
        // proxy.ts's own matcher doesn't cover (e.g. '/').
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          // Defense-in-depth alongside frame-ancestors above — older
          // browsers that don't understand CSP's frame-ancestors still
          // get clickjacking protection from this.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Opt out of every browser feature this app doesn't use.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Only honored over HTTPS (browsers ignore it on plain
            // http://localhost dev), so this is a no-op locally and takes
            // effect once deployed on Vercel.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
