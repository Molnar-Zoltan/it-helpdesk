"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AI_CHAT_MESSAGE_MAX_LENGTH } from "@helpdesk/shared";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  aiChatMessageSchema,
  type AiChatMessageFormValues,
} from "@/lib/validation/ai-chat-schemas";
import { AI_CHAT_COMPOSER_TEXT } from "@/lib/constants/text/tickets.text";
import type { AiChatComposerProps } from "./ai-chat-composer.types";

const DEFAULT_VALUES: AiChatMessageFormValues = { content: "" };

/**
 * Its own react-hook-form instance, deliberately separate from
 * AiChatPanel's transcript state -- this form only ever owns the single
 * in-progress message being typed, and resets to empty on every
 * successful send (see AiChatPanel.handleSend calling onSend then this
 * component clearing itself), the same split MessageComposer keeps from
 * the thread it appends to.
 */
export function AiChatComposer({
  onSend,
  disabled,
  isSending,
}: AiChatComposerProps) {
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

  const onSubmit = handleSubmit((values) => {
    onSend(values.content);
    reset(DEFAULT_VALUES);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <FormField
        label={AI_CHAT_COMPOSER_TEXT.FIELD_LABEL}
        error={errors.content?.message}
        hint={
          errors.content
            ? undefined
            : AI_CHAT_COMPOSER_TEXT.charactersHint(
                contentLength,
                AI_CHAT_MESSAGE_MAX_LENGTH,
              )
        }
      >
        {(field) => (
          <TextArea
            {...field}
            rows={3}
            placeholder={AI_CHAT_COMPOSER_TEXT.PLACEHOLDER}
            hasError={Boolean(errors.content)}
            disabled={disabled}
            {...register("content")}
          />
        )}
      </FormField>

      <Button
        type="submit"
        className="self-start"
        disabled={disabled}
        isLoading={isSending}
      >
        {AI_CHAT_COMPOSER_TEXT.SUBMIT}
      </Button>
    </form>
  );
}
