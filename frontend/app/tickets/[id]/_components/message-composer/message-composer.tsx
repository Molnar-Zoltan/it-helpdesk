"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TICKET_MESSAGE_CONTENT_MAX_LENGTH } from "@helpdesk/shared";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { useCreateMessage } from "@/lib/mutations/use-create-message";
import { createMessageSchema, type CreateMessageFormValues } from "@/lib/validation/ticket-schemas";
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
        This ticket is closed. Reopen it above to add a new message.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <FormField
        label="Add a message"
        error={errors.content?.message}
        hint={
          errors.content ? undefined : `${contentLength}/${TICKET_MESSAGE_CONTENT_MAX_LENGTH} characters`
        }
      >
        {(field) => (
          <TextArea
            {...field}
            rows={3}
            placeholder="Share an update or ask a question…"
            hasError={Boolean(errors.content)}
            {...register("content")}
          />
        )}
      </FormField>

      {createMessageMutation.isError && (
        <Alert tone="danger">{createMessageMutation.error.message}</Alert>
      )}

      <Button type="submit" className="self-start" isLoading={createMessageMutation.isPending}>
        Send message
      </Button>
    </form>
  );
}
