import { ApiError } from "./client";
import type { RegisterPayload, LoginPayload } from "./types";

interface BackendErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

async function postAuth(path: string, body?: unknown): Promise<void> {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = (await res.json()) as BackendErrorBody;
    const message = Array.isArray(errorBody.message)
      ? errorBody.message.join(", ")
      : errorBody.message;
    throw new ApiError(res.status, message, errorBody.error);
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
