"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TICKET_DESCRIPTION_MAX_LENGTH } from "@helpdesk/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { useCreateTicket } from "@/lib/mutations/use-create-ticket";
import {
  createTicketSchema,
  TICKET_PRIORITIES,
  type CreateTicketFormValues,
} from "@/lib/validation/ticket-schemas";
import type { TicketResponse } from "@/lib/api/types";
import { TicketCreatedNotice } from "../ticket-created-notice";

const PRIORITY_LABELS: Record<(typeof TICKET_PRIORITIES)[number], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const DEFAULT_VALUES: CreateTicketFormValues = {
  title: "",
  description: "",
  priority: "MEDIUM",
};

export function NewTicketForm() {
  // Holds the just-created ticket so we can swap the form for
  // TicketCreatedNotice — see that component for why this isn't a
  // redirect.
  const [createdTicket, setCreatedTicket] = useState<TicketResponse | null>(null);
  const createTicketMutation = useCreateTicket();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const descriptionLength = watch("description")?.length ?? 0;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const ticket = await createTicketMutation.mutateAsync(values);
      setCreatedTicket(ticket);
    } catch {
      // Surfaced below via createTicketMutation.error.
    }
  });

  if (createdTicket) {
    return (
      <TicketCreatedNotice
        ticket={createdTicket}
        onCreateAnother={() => {
          setCreatedTicket(null);
          createTicketMutation.reset();
          reset(DEFAULT_VALUES);
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormField label="Title" error={errors.title?.message}>
        {(field) => (
          <Input
            {...field}
            placeholder="Short summary of the issue"
            hasError={Boolean(errors.title)}
            {...register("title")}
          />
        )}
      </FormField>

      <FormField
        label="Description"
        error={errors.description?.message}
        hint={
          errors.description
            ? undefined
            : `${descriptionLength}/${TICKET_DESCRIPTION_MAX_LENGTH} characters`
        }
      >
        {(field) => (
          <TextArea
            {...field}
            rows={8}
            placeholder="What's happening? Include steps to reproduce, error messages, and when it started."
            hasError={Boolean(errors.description)}
            {...register("description")}
          />
        )}
      </FormField>

      <FormField label="Priority" error={errors.priority?.message}>
        {(field) => (
          <Select {...field} hasError={Boolean(errors.priority)} {...register("priority")}>
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      {createTicketMutation.isError && (
        <Alert tone="danger">{createTicketMutation.error.message}</Alert>
      )}

      <Button type="submit" isLoading={createTicketMutation.isPending} className="self-start">
        Submit ticket
      </Button>
    </form>
  );
}
