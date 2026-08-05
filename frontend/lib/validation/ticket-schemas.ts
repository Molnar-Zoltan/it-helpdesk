import { z } from "zod";
import {
  TICKET_TITLE_MIN_LENGTH,
  TICKET_TITLE_MAX_LENGTH,
  TICKET_DESCRIPTION_MIN_LENGTH,
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_CLOSE_REASON_MIN_LENGTH,
  TICKET_CLOSE_REASON_MAX_LENGTH,
  TICKET_REOPEN_REASON_MIN_LENGTH,
  TICKET_REOPEN_REASON_MAX_LENGTH,
  TICKET_MESSAGE_CONTENT_MIN_LENGTH,
  TICKET_MESSAGE_CONTENT_MAX_LENGTH,
  containsEmoji,
} from "@helpdesk/shared";
import type { TicketPriority } from "@helpdesk/shared";

/**
 * Wraps @helpdesk/shared's validation constants rather than hand-rolling
 * rules here, so the frontend can never drift from CreateTicketDto's
 * bounds — same pattern as auth-schemas.ts's `password`/`nameField`.
 * Emoji is checked client-side too, mirroring the backend's @NoEmoji()
 * on both title and description.
 */

export const TICKET_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const satisfies readonly TicketPriority[];

export const createTicketSchema = z.object({
  title: z
    .string()
    .min(TICKET_TITLE_MIN_LENGTH, `Title must be at least ${TICKET_TITLE_MIN_LENGTH} characters`)
    .max(TICKET_TITLE_MAX_LENGTH, `Title must be ${TICKET_TITLE_MAX_LENGTH} characters or fewer`)
    .refine((value) => !containsEmoji(value), "Title can't contain emoji"),
  description: z
    .string()
    .min(
      TICKET_DESCRIPTION_MIN_LENGTH,
      `Description must be at least ${TICKET_DESCRIPTION_MIN_LENGTH} characters`,
    )
    .max(
      TICKET_DESCRIPTION_MAX_LENGTH,
      `Description must be ${TICKET_DESCRIPTION_MAX_LENGTH} characters or fewer`,
    )
    .refine((value) => !containsEmoji(value), "Description can't contain emoji"),
  // Always required client-side (the Select always has a value, defaulted
  // to MEDIUM) even though the backend DTO treats priority as optional.
  priority: z.enum(TICKET_PRIORITIES),
});
export type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

/**
 * closeTicketSchema and reopenTicketSchema are separate exports (rather
 * than one shared schema) even though the bounds are identical today --
 * mirrors CloseTicketDto/ReopenTicketDto being deliberately decoupled on
 * the backend, so either side's bounds can diverge later without the two
 * forms needing to be untangled first.
 */
export const closeTicketSchema = z.object({
  reason: z
    .string()
    .min(
      TICKET_CLOSE_REASON_MIN_LENGTH,
      `Reason must be at least ${TICKET_CLOSE_REASON_MIN_LENGTH} characters`,
    )
    .max(TICKET_CLOSE_REASON_MAX_LENGTH, `Reason must be ${TICKET_CLOSE_REASON_MAX_LENGTH} characters or fewer`)
    .refine((value) => !containsEmoji(value), "Reason can't contain emoji"),
});
export type CloseTicketFormValues = z.infer<typeof closeTicketSchema>;

export const reopenTicketSchema = z.object({
  reason: z
    .string()
    .min(
      TICKET_REOPEN_REASON_MIN_LENGTH,
      `Reason must be at least ${TICKET_REOPEN_REASON_MIN_LENGTH} characters`,
    )
    .max(
      TICKET_REOPEN_REASON_MAX_LENGTH,
      `Reason must be ${TICKET_REOPEN_REASON_MAX_LENGTH} characters or fewer`,
    )
    .refine((value) => !containsEmoji(value), "Reason can't contain emoji"),
});
export type ReopenTicketFormValues = z.infer<typeof reopenTicketSchema>;

export const createMessageSchema = z.object({
  content: z
    .string()
    .min(
      TICKET_MESSAGE_CONTENT_MIN_LENGTH,
      `Message can't be empty`,
    )
    .max(
      TICKET_MESSAGE_CONTENT_MAX_LENGTH,
      `Message must be ${TICKET_MESSAGE_CONTENT_MAX_LENGTH} characters or fewer`,
    )
    .refine((value) => !containsEmoji(value), "Message can't contain emoji"),
});
export type CreateMessageFormValues = z.infer<typeof createMessageSchema>;
