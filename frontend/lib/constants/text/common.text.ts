/**
 * Centralized user-facing copy for site-wide chrome (header, footer,
 * user menu) and the home page. Mirrors the backend's grouped
 * constants-by-domain convention (backend/src/common/constants/*.ts) —
 * one place to see every string a given area of the UI can show, instead
 * of it drifting across component files.
 */

export const SITE_NAME = "IT Helpdesk";

export const HEADER_TEXT = {
  LOGO: SITE_NAME,
  NAV_TICKETS: "Tickets",
  NAV_QUEUE: "Queue",
  NAV_LOG_IN: "Log in",
  NAV_SIGN_UP: "Sign up",
  LOADING_ACCOUNT: "Loading account",
} as const;

export const USER_MENU_TEXT = {
  MENU_BUTTON_SR_LABEL: "Account menu",
  SIGNED_IN_AS_PREFIX: "Signed in as",
  ACCOUNT_LINK: "Account",
  LOG_OUT: "Log out",
  LOGGING_OUT: "Logging out…",
} as const;

export const FOOTER_TEXT = {
  TAGLINE: `${SITE_NAME} — a portfolio project.`,
  SOURCE_LINK_LABEL: "Source on GitHub",
  copyright: (year: number) => `© ${year} Zoltán Molnár`,
} as const;

/**
 * Shared between register (Step 5.3) and the account password tab (Step
 * 5.4) — both surface the backend's 422 WEAK_PASSWORD_WARNING (HIBP
 * soft-check) with the exact same confirmable-warning copy.
 */
export const WEAK_PASSWORD_WARNING_TEXT = {
  MESSAGE:
    "This password has appeared in a known data breach. We recommend choosing a different one.",
  USE_ANYWAY: "Use this password anyway",
} as const;

export const HOME_TEXT = {
  META_TITLE: `${SITE_NAME} — Backend in progress`,
  META_DESCRIPTION:
    "An IT helpdesk platform being built vertically, backend first.",
  SYSTEM_STATUS_LABEL: "System status",
  HEADING: "Support tickets, filed by hand or by AI.",
  INTRO:
    "An IT helpdesk platform where tickets can be filed through a form " +
    "or a conversation with an AI assistant that extracts the details " +
    "automatically — both paths run through the same validation, so " +
    "the AI can never create a ticket the form wouldn't allow. " +
    "It's under active development: auth, account management, " +
    "manual ticket filing, rate limiting, and CAPTCHA-protected " +
    "registration are all live below, deploying automatically on every " +
    "push — the AI chat path is being built next.",
  BUILD_PLAN_LABEL: "Build plan",
  GITHUB_CTA: "Follow progress on GitHub",
  AUTH_BANNER_LOG_IN: "Log in",
  AUTH_BANNER_OR: "or",
  AUTH_BANNER_CREATE_ACCOUNT: "create an account",
  AUTH_BANNER_TRY_IT_OUT: "to try it out.",
  authBannerWelcomeBack: (firstName: string, role: string) =>
    `Welcome back, ${firstName}. You're signed in as ${role}.`,
} as const;

export type PhaseStatus = "done" | "active" | "planned";

export interface Phase {
  label: string;
  status: PhaseStatus;
}

/** Roadmap phases shown in the home page's "Build plan" panel. */
export const HOME_BUILD_PLAN_PHASES: Phase[] = [
  { label: "Auth & sessions", status: "done" },
  { label: "Account self-service", status: "done" },
  { label: "Manual ticket creation", status: "done" },
  { label: "Rate limiting", status: "done" },
  { label: "Cloudflare Turnstile captcha", status: "done" },
  { label: "CI/CD pipeline", status: "done" },
  { label: "Agent dashboard", status: "done" },
  { label: "AI chat ticket path", status: "done" },
];
