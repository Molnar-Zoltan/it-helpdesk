"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { AI_CHAT_MESSAGE_MAX_LENGTH } from "@helpdesk/shared";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import {
  aiChatMessageSchema,
  type AiChatMessageFormValues,
} from "@/lib/validation/ai-chat-schemas";
import { AI_ASSISTANT_COMPOSER_TEXT } from "@/lib/constants/text/ai-assistant.text";
import type { AiAssistantComposerProps } from "./ai-assistant-composer.types";

const DEFAULT_VALUES: AiChatMessageFormValues = { content: "" };

/**
 * Its own react-hook-form instance, deliberately separate from
 * AiAssistantWindow's transcript state -- this form only ever owns the
 * single in-progress message being typed, and resets to empty on every
 * successful send. A compact single-row layout (textarea + icon button
 * side by side, no visible field label) rather than NewTicketForm's
 * stacked FormField -- a Messenger-style footer doesn't have room for a
 * label above the input, so the label is aria-only instead.
 */
export function AiAssistantComposer({ onSend, disabled, isSending }: AiAssistantComposerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AiChatMessageFormValues>({
    resolver: zodResolver(aiChatMessageSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const contentLength = watch("content")?.length ?? 0;
  const { ref: contentRef, ...contentField } = register("content");

  const onSubmit = handleSubmit((values) => {
    onSend(values.content);
    reset(DEFAULT_VALUES);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <TextArea
          {...contentField}
          ref={contentRef}
          rows={1}
          aria-label={AI_ASSISTANT_COMPOSER_TEXT.FIELD_LABEL}
          placeholder={AI_ASSISTANT_COMPOSER_TEXT.PLACEHOLDER}
          hasError={Boolean(errors.content)}
          disabled={disabled}
          className="max-h-32 min-h-0 resize-none py-2"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <Button
          type="submit"
          disabled={disabled}
          isLoading={isSending}
          aria-label={AI_ASSISTANT_COMPOSER_TEXT.SUBMIT}
          className="shrink-0 px-3"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>

      {errors.content ? (
        <p className="text-xs text-accent-danger">{errors.content.message}</p>
      ) : (
        <p className="text-xs text-text-muted">
          {AI_ASSISTANT_COMPOSER_TEXT.charactersHint(contentLength, AI_CHAT_MESSAGE_MAX_LENGTH)}
        </p>
      )}
    </form>
  );
}
