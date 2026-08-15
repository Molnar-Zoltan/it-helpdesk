/**
 * Copy for the AI Assistant widget (components/layout/ai-assistant-widget/
 * and its sub-components) -- a site-wide floating chat, not a page, so it
 * lives alongside common.text.ts's site-wide-chrome copy rather than
 * tickets.text.ts (which is now only the manual-form/list/detail pages).
 * "AI Assistant" is the display name shown in the widget's own header bar.
 */

export const AI_ASSISTANT_TEXT = {
  TITLE: "AI Assistant",
  OPEN_ARIA_LABEL: "Open AI Assistant",
  CLOSE_ARIA_LABEL: "Close AI Assistant",
  // A plain constant, not a model-generated reply -- shown once at the top
  // of an empty conversation and never sent to POST /ai/chat as part of
  // the transcript (Step 10.4's history is only ever real turns).
  GREETING:
    "Hi, I'm here to help. Tell me what's going on and I'll get a ticket filed for you.",
  TICKET_CREATED_TOAST: "Ticket filed -- taking you to it now.",
  MANUAL_FALLBACK_LINK: "File manually instead",
} as const;

export const AI_ASSISTANT_MESSAGE_TEXT = {
  YOU_LABEL: "You",
  ASSISTANT_LABEL: "AI Assistant",
} as const;

export const AI_ASSISTANT_COMPOSER_TEXT = {
  FIELD_LABEL: "Message",
  PLACEHOLDER: "Describe the issue...",
  SUBMIT: "Send",
  charactersHint: (length: number, max: number) => `${length}/${max} characters`,
  rateLimitedMessage: (countdown: string) =>
    `You've reached today's AI chat limit. It resets in ${countdown}.`,
  LIMIT_REACHED: "You've reached today's AI chat limit -- it resets at midnight UTC.",
  CONVERSATION_LIMIT_REACHED:
    "This conversation has gone on long enough that the AI assistant needs a fresh start -- file the rest as a manual ticket.",
} as const;

/** AiUsageIndicator's "X of Y used today" display, shown under the
 * widget's header title. */
export const AI_USAGE_INDICATOR_TEXT = {
  usedToday: (used: number, limit: number) => `${used} of ${limit} messages used today`,
} as const;
