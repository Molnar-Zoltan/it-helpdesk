import { SITE_NAME, WEAK_PASSWORD_WARNING_TEXT } from "./common.text";

/**
 * Copy for /login and /register — both the page shells and their forms.
 */

export const LOGIN_TEXT = {
  META_TITLE: `Log in — ${SITE_NAME}`,
  HEADING: "Log in",
  SUBHEADING: "Welcome back — enter your details to continue.",
  NO_ACCOUNT_PROMPT: "Don't have an account?",
  CREATE_ONE_LINK: "Create one",
  DEMO_HINT_PREFIX: "Trying the demo? Use",
  DEMO_HINT_AGENT_PREFIX: "Want to see the agent dashboard? Use",
  EMAIL_LABEL: "Email",
  PASSWORD_LABEL: "Password",
  SUBMIT: "Log in",
  WELCOME_BACK_TOAST: "Welcome back!",
  lockoutMessage: (countdown: string) =>
    `Too many login attempts for this email. Try again in ${countdown}.`,
} as const;

export const REGISTER_TEXT = {
  META_TITLE: `Create account — ${SITE_NAME}`,
  HEADING: "Create an account",
  SUBHEADING: "File tickets and track their progress.",
  HAVE_ACCOUNT_PROMPT: "Already have an account?",
  LOG_IN_LINK: "Log in",
  FIRST_NAME_LABEL: "First name",
  FIRST_NAME_PLACEHOLDER: "John",
  LAST_NAME_LABEL: "Last name",
  LAST_NAME_PLACEHOLDER: "Doe",
  EMAIL_LABEL: "Email",
  EMAIL_PLACEHOLDER: "you@example.com",
  PASSWORD_LABEL: "Password",
  CONFIRM_PASSWORD_LABEL: "Confirm password",
  CAPTCHA_ERROR:
    "Captcha failed to load. Please disable any content blockers and refresh the page.",
  WEAK_PASSWORD_WARNING: WEAK_PASSWORD_WARNING_TEXT.MESSAGE,
  USE_ANYWAY: WEAK_PASSWORD_WARNING_TEXT.USE_ANYWAY,
  SUBMIT: "Create account",
  SUCCESS_TOAST: "Account created — welcome aboard!",
} as const;
