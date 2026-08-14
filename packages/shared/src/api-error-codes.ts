/**
 * The `error` field Nest's exception filters put on an error response body
 * (surfaced to the frontend as `ApiError.code` — see
 * frontend/lib/api/client.ts) for the handful of responses the client
 * deliberately branches on, rather than just displaying `message` as-is:
 * a confirmable warning (WEAK_PASSWORD_WARNING) or a 429 with a
 * countdown (the *_RATE_LIMITED codes). Promoted here for the same reason
 * ACCESS_TOKEN_TTL_MS/DEFAULT_LIMIT were — both the backend exception
 * classes that set `error:` and the frontend comparisons that read
 * `error.code === ...` need to agree on the exact string, and a typo on
 * either side would silently break the branch instead of failing to
 * compile.
 */
export const API_ERROR_CODES = {
  WEAK_PASSWORD_WARNING: "WEAK_PASSWORD_WARNING",
  LOGIN_RATE_LIMITED: "LOGIN_RATE_LIMITED",
  TICKET_CREATE_RATE_LIMITED: "TICKET_CREATE_RATE_LIMITED",
  TICKET_MESSAGE_RATE_LIMITED: "TICKET_MESSAGE_RATE_LIMITED",
  AI_DAILY_LIMIT_EXCEEDED: "AI_DAILY_LIMIT_EXCEEDED",
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
