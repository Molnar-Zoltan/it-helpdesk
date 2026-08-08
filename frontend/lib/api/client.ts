export class ApiError extends Error {
  readonly status: number;
  /** Nest's structured `error` field, e.g. "WEAK_PASSWORD_WARNING" for the
   * HIBP soft-check on register/password-change. Most errors don't set
   * this — it's only present where the backend deliberately distinguishes
   * a confirmable warning from a hard rejection. */
  readonly code?: string;
  /** Present on 429 LOGIN_RATE_LIMITED responses (Step 6) — seconds until
   * the lockout window clears, so the UI can show a real countdown instead
   * of a generic "try again later." */
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    message: string,
    code?: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Nest's default error shape — message is a string normally, or an array
 * of strings for class-validator failures. `retryAfterSeconds` is only
 * present on LoginRateLimitedException's 429 body. */
interface BackendErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  retryAfterSeconds?: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const contentType = res.headers.get("Content-Type") ?? "";
  const data: unknown = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    const errorBody = data as BackendErrorBody | undefined;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(", ")
      : (errorBody?.message ?? "Something went wrong");
    throw new ApiError(
      res.status,
      message,
      errorBody?.error,
      errorBody?.retryAfterSeconds,
    );
  }

  return data as T;
}

/**
 * Everything here targets /api/backend/*, this app's own proxy (see
 * app/api/backend/[...path]/route.ts) — never the NestJS backend directly.
 * Auth actions (login/register/logout) aren't here; they go through
 * lib/mutations, which call /api/auth/* instead, since those aren't simple
 * authenticated pass-throughs.
 */
export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};
