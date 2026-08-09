"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TICKET_MESSAGE_CONTENT_MAX_LENGTH } from "@helpdesk/shared";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import { useCreateMessage } from "@/lib/mutations/use-create-message";
import { useRateLimitCountdown, formatCountdown } from "@/lib/hooks/use-rate-limit-countdown";
import { createMessageSchema, type CreateMessageFormValues } from "@/lib/validation/ticket-schemas";
import { MESSAGE_COMPOSER_TEXT } from "@/lib/constants/text/tickets.text";
import type { MessageComposerProps } from "./message-composer.types";

const DEFAULT_VALUES: CreateMessageFormValues = { content: "" };

/**
 * `disabled` mirrors the backend's own guard (TicketsService.addMessage now
 * 400s TICKET_CLOSED_CANNOT_MESSAGE on a CLOSED ticket) -- this isn't just a
 * frontend-only nicety layered on top, the two are meant to agree.
 */
export function MessageComposer({ ticketId, disabled }: MessageComposerProps) {
  const createMessageMutation = useCreateMessage(ticketId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateMessageFormValues>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const contentLength = watch("content")?.length ?? 0;

  // Step 6b: a 10s anti-spam cooldown per user+ticket (see
  // rate-limit.constants.ts) -- short enough that a real conversation
  // never notices it, long enough to stop a script firing back-to-back.
  const cooldownRemaining = useRateLimitCountdown(
    createMessageMutation.isError,
    createMessageMutation.error,
    "TICKET_MESSAGE_RATE_LIMITED",
  );
  const isOnCooldown = cooldownRemaining !== null && cooldownRemaining > 0;

  // Same fix as NewTicketForm: the mutation's error persists past the
  // cooldown expiring, so without this the stale 429 message renders as a
  // generic error forever once isOnCooldown flips back to false.
  const isRateLimitError =
    createMessageMutation.isError &&
    createMessageMutation.error instanceof ApiError &&
    createMessageMutation.error.code === "TICKET_MESSAGE_RATE_LIMITED";

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createMessageMutation.mutateAsync(values);
      reset(DEFAULT_VALUES);
    } catch {
      // Surfaced below via createMessageMutation.error.
    }
  });

  if (disabled) {
    return (
      <Alert tone="neutral">
        {MESSAGE_COMPOSER_TEXT.CLOSED_NOTICE}
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <FormField
        label={MESSAGE_COMPOSER_TEXT.FIELD_LABEL}
        error={errors.content?.message}
        hint={
          errors.content ? undefined : MESSAGE_COMPOSER_TEXT.charactersHint(contentLength, TICKET_MESSAGE_CONTENT_MAX_LENGTH)
        }
      >
        {(field) => (
          <TextArea
            {...field}
            rows={3}
            placeholder={MESSAGE_COMPOSER_TEXT.PLACEHOLDER}
            hasError={Boolean(errors.content)}
            {...register("content")}
          />
        )}
      </FormField>

      {isOnCooldown ? (
        <Alert tone="danger">
          {MESSAGE_COMPOSER_TEXT.rateLimitedMessage(formatCountdown(cooldownRemaining))}
        </Alert>
      ) : (
        createMessageMutation.isError &&
        !isRateLimitError && (
          <Alert tone="danger">{createMessageMutation.error.message}</Alert>
        )
      )}

      <Button
        type="submit"
        className="self-start"
        disabled={isOnCooldown}
        isLoading={createMessageMutation.isPending}
      >
        {MESSAGE_COMPOSER_TEXT.SUBMIT}
      </Button>
    </form>
  );
}
