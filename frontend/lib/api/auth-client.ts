import { ApiError } from "./client";
import type { RegisterPayload, LoginPayload } from "./types";

interface BackendErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

async function postAuth(path: string, body?: unknown): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api/auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // The browser couldn't even reach this app's own /api/auth/* route —
    // e.g. offline, or this app's server itself is down. Distinct from the
    // backend-unreachable case below, which still gets a normal response
    // (see backendFetch's 503 fallback in lib/server/backend-client.ts).
    throw new ApiError(
      0,
      "Couldn't reach the server. Check your connection and try again.",
    );
  }

  if (!res.ok) {
    // Guard against a non-JSON error body the same way apiClient does —
    // in practice backendFetch's 503 fallback means this app's own routes
    // always return valid JSON now, but this stays defensive rather than
    // assuming that holds forever.
    const contentType = res.headers.get("Content-Type") ?? "";
    const errorBody = contentType.includes("application/json")
      ? ((await res.json()) as BackendErrorBody)
      : undefined;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(", ")
      : (errorBody?.message ?? "Something went wrong. Please try again.");
    throw new ApiError(res.status, message, errorBody?.error);
  }
}

/**
 * Separate from apiClient (lib/api/client.ts) since these three don't hit
 * /api/backend/* — they're the routes that actually manage the auth
 * cookies (see app/api/auth/*), not authenticated pass-throughs.
 */
export const authClient = {
  register: (payload: RegisterPayload) => postAuth("/register", payload),
  login: (payload: LoginPayload) => postAuth("/login", payload),
  logout: () => postAuth("/logout"),
};
