import type { TicketPriority, TicketStatus } from "./enums";

/**
 * Mirrors Gemini's own content role naming ('user' | 'model') directly
 * rather than inventing a separate 'assistant'/'ai' vocabulary and mapping
 * between the two at the API boundary -- see backend/src/ai/gemini/
 * gemini.client.ts. A plain const-object + derived type, same pattern as
 * API_ERROR_CODES, since there's no Prisma enum backing this (the chat
 * transcript itself is never persisted as such -- see below).
 */
export const AI_CHAT_ROLES = {
  USER: "user",
  MODEL: "model",
} as const;

export type AiChatRole = (typeof AI_CHAT_ROLES)[keyof typeof AI_CHAT_ROLES];

/**
 * Step 10.4's stateless-backend decision: the frontend owns and resends
 * the full transcript on every turn rather than the backend holding
 * conversation state (see architecture.md's AI chat section for the full
 * reasoning -- Cloud Run scale-to-zero, no abandoned-session cleanup
 * needed). These bounds exist to cap Gemini token cost and abuse per
 * request, not because a real intake conversation would ever need this
 * many turns or this much text in one message.
 */
export const AI_CHAT_MESSAGE_MIN_LENGTH = 1;
export const AI_CHAT_MESSAGE_MAX_LENGTH = 2000;
export const AI_CHAT_MAX_TRANSCRIPT_MESSAGES = 40;

/**
 * POST /ai/chat's response contract. Either the assistant is still
 * gathering detail (a plain reply to show in the chat), or it just called
 * the create_ticket tool and the ticket now exists -- the frontend
 * redirects to the new ticket's detail page in the latter case (Step
 * 10.6.4), same as the manual creation form does today.
 *
 * `ticket` is a plain object (not the Prisma `Ticket` type, which `shared`
 * can't depend on) matching the same flat shape POST /tickets already
 * returns.
 */
export interface AiChatMessageResult {
  type: "message";
  content: string;
}

export interface AiChatTicketCreatedResult {
  type: "ticket_created";
  ticket: {
    id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: string;
    updatedAt: string;
    customerId: string | null;
    agentId: string | null;
  };
}

export type AiChatResponse = AiChatMessageResult | AiChatTicketCreatedResult;

/** GET /ai/usage response -- lets the frontend show "X of Y used today"
 * (Step 10.6.3) without spending a chat turn to find out. */
export interface AiUsageResponse {
  used: number;
  limit: number;
}
