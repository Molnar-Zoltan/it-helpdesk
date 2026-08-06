"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TICKET_DESCRIPTION_MAX_LENGTH } from "@helpdesk/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import { useCreateTicket } from "@/lib/mutations/use-create-ticket";
import { useRateLimitCountdown, formatCountdown } from "@/lib/hooks/use-rate-limit-countdown";
import { cn } from "@/lib/utils";
import {
  createTicketSchema,
  TICKET_PRIORITIES,
  type CreateTicketFormValues,
} from "@/lib/validation/ticket-schemas";

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
  const router = useRouter();
  const createTicketMutation = useCreateTicket();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const descriptionLength = watch("description")?.length ?? 0;

  // Step 6b: a 60s anti-spam cooldown on ticket creation (see
  // rate-limit.constants.ts) — every attempt costs it, not just failures,
  // so once this fires it applies regardless of what the user does next
  // (unlike login's lockout, there's no "different email" escape hatch
  // that makes sense here).
  const cooldownRemaining = useRateLimitCountdown(
    createTicketMutation.isError,
    createTicketMutation.error,
    "TICKET_CREATE_RATE_LIMITED",
  );
  const isOnCooldown = cooldownRemaining !== null && cooldownRemaining > 0;

  // The mutation's error state persists until the next attempt -- once the
  // cooldown above expires, isOnCooldown flips to false but
  // createTicketMutation.error is still the stale 429, so without this it
  // falls through and renders "You're creating tickets too quickly" as a
  // generic error forever. Suppress it specifically once it's no longer
  // live.
  const isRateLimitError =
    createTicketMutation.isError &&
    createTicketMutation.error instanceof ApiError &&
    createTicketMutation.error.code === "TICKET_CREATE_RATE_LIMITED";

  const onSubmit = handleSubmit(async (values) => {
    try {
      const ticket = await createTicketMutation.mutateAsync(values);
      // /tickets/:id (detail, Step 5.7) now exists, so this redirects
      // straight to the new ticket instead of the old inline
      // TicketCreatedNotice stopgap -- matches how the rest of the app
      // behaves (land on the thing you just created), same as
      // register/login's post-auth redirect. "Create another" is still
      // one click away via /tickets/new in the header/list, so nothing
      // from that flow is lost.
      router.push(`/tickets/${ticket.id}`);
    } catch {
      // Surfaced below via createTicketMutation.error.
    }
  });

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

      {isOnCooldown ? (
        <Alert tone="danger">
          You&apos;re creating tickets too quickly. Try again in{" "}
          {formatCountdown(cooldownRemaining)}.
        </Alert>
      ) : (
        createTicketMutation.isError &&
        !isRateLimitError && (
          <Alert tone="danger">{createTicketMutation.error.message}</Alert>
        )
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isOnCooldown}
          isLoading={createTicketMutation.isPending}
        >
          Submit ticket
        </Button>

        {/*
          Button (components/ui/button) has no asChild/slot support for
          wrapping a Next Link, so this mirrors its "ghost" variant classes
          directly on a real <a> instead -- same reasoning as the
          link-styled CTAs on the tickets list page. A real link (rather
          than a button that calls router.push) keeps ctrl/cmd-click and
          middle-click ("open in new tab") working.

          Uses hover:bg-surface-raised, not Button ghost's own
          hover:bg-surface -- this link sits inside a Card (bg-surface),
          so hovering to that same color would be invisible. Same fix
          UserMenu's dropdown items already apply for the same reason
          (their bg-surface-raised container hovers to bg-surface instead).

          "enabled:" (which Button's ghost variant uses for its hover
          state) is a button/input/select/textarea-only pseudo-class --
          it doesn't apply to anchors, so the disabled-while-submitting
          state below is hand-rolled with aria-disabled + a click guard
          instead of the native disabled attribute an <a> can't have.
        */}
        <Link
          href="/tickets"
          aria-disabled={createTicketMutation.isPending}
          tabIndex={createTicketMutation.isPending ? -1 : undefined}
          onClick={(event) => {
            if (createTicketMutation.isPending) event.preventDefault();
          }}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition-colors",
            "hover:bg-surface-raised hover:text-text",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-secondary",
            createTicketMutation.isPending
              ? "pointer-events-none cursor-not-allowed opacity-50"
              : "cursor-pointer",
          )}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
