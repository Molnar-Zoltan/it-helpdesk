import { SITE_NAME, WEAK_PASSWORD_WARNING_TEXT } from "./common.text";

/** Copy for /account and its four tabs (Name / Email / Password / Delete). */

export const ACCOUNT_VIEW_TEXT = {
  META_TITLE: `Account — ${SITE_NAME}`,
  LOADING: "Loading account",
  HEADING: "Account",
  SUBHEADING: "Manage your profile, credentials, and account data.",
  TABS_ARIA_LABEL: "Account settings sections",
  TAB_NAME: "Name",
  TAB_EMAIL: "Email",
  TAB_PASSWORD: "Password",
  TAB_DELETE: "Delete account",
  LOAD_ERROR: "We couldn't load your account.",
  LOG_IN_AGAIN: "Log in again",
} as const;

export const NAME_TAB_TEXT = {
  HEADING: "Name",
  DESCRIPTION: "The name shown on your tickets and in the header menu.",
  FIRST_NAME_LABEL: "First name",
  LAST_NAME_LABEL: "Last name",
  SUBMIT: "Save changes",
  SUCCESS_TOAST: "Name updated",
} as const;

export const EMAIL_TAB_TEXT = {
  HEADING: "Email",
  DESCRIPTION:
    "Used to log in and identify your account. Changing it signs out " +
    "your other sessions the next time they try to refresh — this " +
    "device stays signed in.",
  NEW_EMAIL_LABEL: "New email",
  CURRENT_PASSWORD_LABEL: "Current password",
  CURRENT_PASSWORD_HINT: "Required to confirm this change.",
  SUBMIT: "Update email",
  SUCCESS_TOAST:
    "Email updated. Your other sessions will be signed out the next time they try to refresh.",
} as const;

export const PASSWORD_TAB_TEXT = {
  HEADING: "Password",
  DESCRIPTION:
    "Changing your password signs out your other sessions the next " +
    "time they try to refresh — this device stays signed in.",
  CURRENT_PASSWORD_LABEL: "Current password",
  NEW_PASSWORD_LABEL: "New password",
  CONFIRM_NEW_PASSWORD_LABEL: "Confirm new password",
  SUBMIT: "Update password",
  SUCCESS_TOAST:
    "Password updated. Your other sessions will be signed out the next time they try to refresh.",
  WEAK_PASSWORD_WARNING: WEAK_PASSWORD_WARNING_TEXT.MESSAGE,
  USE_ANYWAY: WEAK_PASSWORD_WARNING_TEXT.USE_ANYWAY,
} as const;

export const DELETE_ACCOUNT_TAB_TEXT = {
  HEADING: "Delete account",
  DESCRIPTION: "Permanently deletes your account. This can't be undone.",
  TRIGGER_BUTTON: "Delete account",
  MODAL_TITLE: "Delete your account?",
  MODAL_BODY:
    "This permanently deletes your account and can't be undone. Enter your password to confirm.",
  CURRENT_PASSWORD_LABEL: "Current password",
  CANCEL: "Cancel",
  CONFIRM_BUTTON: "Delete account",
  SUCCESS_TOAST: "Account deleted.",
} as const;

export const DEMO_ACCOUNT_NOTICE_TEXT = {
  MESSAGE:
    "This is a shared demo account, so changes here are disabled. Feel free " +
    "to look around — just nothing will save.",
} as const;
