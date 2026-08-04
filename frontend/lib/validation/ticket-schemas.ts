import { z } from "zod";
import {
  TICKET_TITLE_MIN_LENGTH,
  TICKET_TITLE_MAX_LENGTH,
  TICKET_DESCRIPTION_MIN_LENGTH,
  TICKET_DESCRIPTION_MAX_LENGTH,
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
