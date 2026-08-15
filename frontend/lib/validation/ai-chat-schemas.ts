import { z } from "zod";
import {
  AI_CHAT_MESSAGE_MIN_LENGTH,
  AI_CHAT_MESSAGE_MAX_LENGTH,
  containsEmoji,
} from "@helpdesk/shared";
import { AI_CHAT_VALIDATION_TEXT } from "@/lib/constants/text/validation.text";

/**
 * Backs AiChatComposer's single-message input. Mirrors AiChatMessageDto's
 * bounds exactly (packages/shared/src/ai-chat.ts, enforced server-side per
 * entry in the transcript array) so the client can't submit something the
 * backend would 400 on -- there's no title/description/priority shape
 * here, just the plain chat text for one turn.
 */
export const aiChatMessageSchema = z.object({
  content: z
    .string()
    .min(AI_CHAT_MESSAGE_MIN_LENGTH, AI_CHAT_VALIDATION_TEXT.MESSAGE_EMPTY)
    .max(AI_CHAT_MESSAGE_MAX_LENGTH, AI_CHAT_VALIDATION_TEXT.messageMaxLength)
    .refine(
      (value) => !containsEmoji(value),
      AI_CHAT_VALIDATION_TEXT.MESSAGE_NO_EMOJI,
    ),
});
export type AiChatMessageFormValues = z.infer<typeof aiChatMessageSchema>;
