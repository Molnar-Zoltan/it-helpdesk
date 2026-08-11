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
import type { TicketPriority, TicketStatus } from "@helpdesk/shared";
import { TICKET_VALIDATION_TEXT } from "@/lib/constants/text/validation.text";

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
    .min(TICKET_TITLE_MIN_LENGTH, TICKET_VALIDATION_TEXT.titleMinLength)
    .max(TICKET_TITLE_MAX_LENGTH, TICKET_VALIDATION_TEXT.titleMaxLength)
    .refine((value) => !containsEmoji(value), TICKET_VALIDATION_TEXT.TITLE_NO_EMOJI),
  description: z
    .string()
    .min(TICKET_DESCRIPTION_MIN_LENGTH, TICKET_VALIDATION_TEXT.descriptionMinLength)
    .max(TICKET_DESCRIPTION_MAX_LENGTH, TICKET_VALIDATION_TEXT.descriptionMaxLength)
    .refine((value) => !containsEmoji(value), TICKET_VALIDATION_TEXT.DESCRIPTION_NO_EMOJI),
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
    .min(TICKET_CLOSE_REASON_MIN_LENGTH, TICKET_VALIDATION_TEXT.closeReasonMinLength)
    .max(TICKET_CLOSE_REASON_MAX_LENGTH, TICKET_VALIDATION_TEXT.closeReasonMaxLength)
    .refine((value) => !containsEmoji(value), TICKET_VALIDATION_TEXT.REASON_NO_EMOJI),
});
export type CloseTicketFormValues = z.infer<typeof closeTicketSchema>;

export const reopenTicketSchema = z.object({
  reason: z
    .string()
    .min(TICKET_REOPEN_REASON_MIN_LENGTH, TICKET_VALIDATION_TEXT.reopenReasonMinLength)
    .max(TICKET_REOPEN_REASON_MAX_LENGTH, TICKET_VALIDATION_TEXT.reopenReasonMaxLength)
    .refine((value) => !containsEmoji(value), TICKET_VALIDATION_TEXT.REASON_NO_EMOJI),
});
export type ReopenTicketFormValues = z.infer<typeof reopenTicketSchema>;

export const AGENT_STATUS_TARGETS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const satisfies readonly TicketStatus[];

/**
 * Backs TicketAgentControls' status-transition form. `reason` is only
 * required when the chosen target is CLOSED -- mirrors
 * UpdateTicketStatusDto's `@ValidateIf(status === CLOSED)` exactly,
 * reusing the same close-reason bounds the backend DTO reuses (one
 * "closed" record regardless of who closed it). Which *targets* are
 * actually offered for a given current status is a separate, purely
 * client-side display concern -- see AGENT_STATUS_TRANSITIONS in
 * ticket-agent-controls.tsx.
 */
export const updateTicketStatusSchema = z
  .object({
    status: z.enum(AGENT_STATUS_TARGETS),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status !== "CLOSED") return;

    const reason = data.reason ?? "";
    if (reason.length < TICKET_CLOSE_REASON_MIN_LENGTH) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: TICKET_VALIDATION_TEXT.closeReasonMinLength,
      });
    } else if (reason.length > TICKET_CLOSE_REASON_MAX_LENGTH) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: TICKET_VALIDATION_TEXT.closeReasonMaxLength,
      });
    } else if (containsEmoji(reason)) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: TICKET_VALIDATION_TEXT.REASON_NO_EMOJI,
      });
    }
  });
export type UpdateTicketStatusFormValues = z.infer<typeof updateTicketStatusSchema>;

export const createMessageSchema = z.object({
  content: z
    .string()
    .min(TICKET_MESSAGE_CONTENT_MIN_LENGTH, TICKET_VALIDATION_TEXT.MESSAGE_EMPTY)
    .max(TICKET_MESSAGE_CONTENT_MAX_LENGTH, TICKET_VALIDATION_TEXT.messageMaxLength)
    .refine((value) => !containsEmoji(value), TICKET_VALIDATION_TEXT.MESSAGE_NO_EMOJI),
});
export type CreateMessageFormValues = z.infer<typeof createMessageSchema>;
