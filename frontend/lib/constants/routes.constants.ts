/**
 * Frontend page route paths. Centralizes the handful of paths that were
 * previously duplicated as string literals across Header/UserMenu/
 * AuthStatusBanner/proxy.ts/the login+register pages — a typo in any one
 * of those would silently break a redirect or nav link rather than fail
 * to compile.
 *
 * Deliberately separate from the *backend* API paths apiClient/authClient
 * call (`/tickets`, `/login`, etc. under /api/backend or /api/auth) —
 * those are a different namespace that happens to share some segment
 * names, not the same concept.
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  ACCOUNT: "/account",
  TICKETS: "/tickets",
  NEW_TICKET: "/tickets/new",
  ticketDetail: (id: string) => `/tickets/${id}`,
} as const;

/** Shown in the footer and on the home page's "Follow progress" link. */
export const GITHUB_REPO_URL = "https://github.com/Molnar-Zoltan/it-helpdesk";
