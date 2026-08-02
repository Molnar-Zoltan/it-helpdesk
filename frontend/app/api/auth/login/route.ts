import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/server/backend-client";
import { handleTokenResponse } from "@/lib/server/auth-route-helpers";

export async function POST(request: NextRequest) {
  const body = await request.text();

  const backendRes = await backendFetch("/auth/login", {
    method: "POST",
    body,
  });

  return handleTokenResponse(backendRes);
}
