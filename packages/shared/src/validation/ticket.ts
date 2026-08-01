export const TICKET_TITLE_MIN_LENGTH = 3;
export const TICKET_TITLE_MAX_LENGTH = 150;

export const TICKET_DESCRIPTION_MIN_LENGTH = 10;
export const TICKET_DESCRIPTION_MAX_LENGTH = 5000;

export const TICKET_CLOSE_REASON_MIN_LENGTH = 3;
export const TICKET_CLOSE_REASON_MAX_LENGTH = 1000;

// Deliberately separate from TICKET_CLOSE_REASON_*, even though the values
// are identical today — decouples the two contracts so reopen's bounds can
// diverge later (e.g. a shorter reason) without touching close's.
export const TICKET_REOPEN_REASON_MIN_LENGTH = 3;
export const TICKET_REOPEN_REASON_MAX_LENGTH = 1000;

export const TICKET_MESSAGE_CONTENT_MIN_LENGTH = 1;
export const TICKET_MESSAGE_CONTENT_MAX_LENGTH = 5000;
