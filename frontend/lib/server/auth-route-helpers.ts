import "server-only";
import { NextResponse } from "next/server";
import { setAuthCookies, type TokenPair } from "./auth-cookies";
import type { BackendErrorBody } from "./backend-client";

/**
 * Turns a backend /auth/register or /auth/login response into the response
 * this app sends to the browser. On success, the token pair is written to
 * httpOnly cookies and never appears in the JSON body — the whole point of
 * the BFF pattern is that client JS never gets to hold a raw token. On
 * failure, the backend's error body/status are forwarded unchanged so the
 * browser gets the same statusCode/message it would have gotten calling the
 * backend directly.
 */
export async function handleTokenResponse(backendRes: Response): Promise<NextResponse> {
  if (!backendRes.ok) {
    const errorBody = (await backendRes.json()) as BackendErrorBody;
    return NextResponse.json(errorBody, { status: backendRes.status });
  }

  const tokens = (await backendRes.json()) as TokenPair;
  await setAuthCookies(tokens);
  return NextResponse.json({ success: true });
}
