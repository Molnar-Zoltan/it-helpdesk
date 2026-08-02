import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/server/backend-client";
import { getRefreshToken, clearAuthCookies } from "@/lib/server/auth-cookies";

/**
 * Always clears cookies, even if the backend call fails (network error, the
 * token was already revoked, etc.) — a logout should never leave the
 * browser holding cookies it believes are still valid.
 */
export async function POST() {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    try {
      await backendFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Backend unreachable or already-revoked token — clear cookies below
      // regardless, since from the browser's point of view this is still a
      // successful logout.
    }
  }

  await clearAuthCookies();
  return NextResponse.json({ success: true });
}
