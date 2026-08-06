import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/server/backend-client";
import { handleTokenResponse } from "@/lib/server/auth-route-helpers";

export async function POST(request: NextRequest) {
  const body = await request.text();

  // backendFetch() is a plain server-to-server call — it never carries the
  // browser's own connection, so without this the backend would only ever
  // see this Next.js server's own IP (Vercel's serverless function),
  // making per-client IP rate limiting (Step 6) meaningless. Vercel sets
  // x-forwarded-for on the incoming request with the real visitor's IP;
  // forward it explicitly so the backend can key on it. Cloud Run's own
  // front end appends the actual connecting IP (this server's) after
  // receipt, so the backend still verifies rather than blindly trusting
  // this header — see main.ts's `trust proxy` setting.
  const clientIp = request.headers.get("x-forwarded-for");

  const backendRes = await backendFetch("/auth/login", {
    method: "POST",
    body,
    headers: clientIp ? { "x-forwarded-for": clientIp } : undefined,
  });

  return handleTokenResponse(backendRes);
}
