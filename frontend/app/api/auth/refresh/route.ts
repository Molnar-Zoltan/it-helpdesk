import { NextResponse } from "next/server";
import { getRefreshToken } from "@/lib/server/auth-cookies";
import { refreshTokens } from "@/lib/server/backend-client";

export async function POST() {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh token" }, { status: 401 });
  }

  const newAccessToken = await refreshTokens(refreshToken);

  if (!newAccessToken) {
    return NextResponse.json({ message: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
