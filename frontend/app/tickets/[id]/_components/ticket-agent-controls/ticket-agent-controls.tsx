"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { TicketStatus } from "@helpdesk/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TextArea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useAssignTicket } from "@/lib/mutations/use-assign-ticket";
import { useUpdateTicketStatus } from "@/lib/mutations/use-update-ticket-status";
import { updateTicketStatusSchema, type UpdateTicketStatusFormValues } from "@/lib/validation/ticket-schemas";
import { TICKET_AGENT_CONTROLS_TEXT, TICKET_STATUS_LABELS } from "@/lib/constants/text/tickets.text";
import type { TicketAgentControlsProps } from "./ticket-agent-controls.types";

/**
 * Client-side mirror of TicketsService.ALLOWED_AGENT_STATUS_TRANSITIONS
 * (backend/src/tickets/tickets.service.ts) -- display-only, so the form
 * only ever offers a target the backend would actually accept. The
 * backend remains the sole enforcer; this just avoids showing a
 * transition that would 400. Keep in sync by hand if that map changes --
 * there's nothing in @helpdesk/shared to import here, since this map is a
 * private implementation detail of the service, not a validation rule
 * either side needs to agree on bit-for-bit.
 */
const AGENT_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["OPEN", "RESOLVED", "CLOSED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
};

export function TicketAgentControls({ ticket, currentUserId, currentUserRole }: TicketAgentControlsProps) {
  const assignMutation = useAssignTicket(ticket.id);
  const statusMutation = useUpdateTicketStatus(ticket.id);

  const isAssignedToMe = ticket.agentId === currentUserId;
  const isUnassigned = ticket.agentId === null;
  const canDriveStatus = currentUserRole === "ADMIN" || isAssignedToMe;
  const allowedTargets = AGENT_STATUS_TRANSITIONS[ticket.status];

  // Falls back to "OPEN" when allowedTargets is empty (ticket already
  // CLOSED) -- the form below is never rendered in that case, but the
  // hook still needs a valid default since it's called unconditionally.
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateTicketStatusFormValues>({
    resolver: zodResolver(updateTicketStatusSchema),
    defaultValues: { status: allowedTargets[0] ?? "OPEN", reason: "" },
  });
  const selectedStatus = watch("status");

  const handleClaim = async () => {
    try {
      await assignMutation.mutateAsync({});
      toast.success(TICKET_AGENT_CONTROLS_TEXT.ASSIGN_SUCCESS_TOAST);
    } catch {
      // Surfaced below via assignMutation.error (e.g. someone else claimed
      // it a moment ago, or a non-admin tried to take an already-assigned
      // ticket).
    }
  };

  const onSubmitStatus = handleSubmit(async (values) => {
    try {
      await statusMutation.mutateAsync({
        status: values.status,
        ...(values.status === "CLOSED" && { reason: values.reason }),
      });
      toast.success(TICKET_AGENT_CONTROLS_TEXT.STATUS_SUCCESS_TOAST);
      reset({ status: allowedTargets[0] ?? "OPEN", reason: "" });
    } catch {
      // Surfaced below via statusMutation.error (e.g. someone else already
      // moved the ticket, so the transition no longer applies).
    }
  });

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text">{TICKET_AGENT_CONTROLS_TEXT.HEADING}</h2>

      <div className="flex flex-wrap items-center gap-3">
        {isUnassigned ? (
          <>
            <Badge tone="neutral">{TICKET_AGENT_CONTROLS_TEXT.UNASSIGNED}</Badge>
            <Button type="button" variant="secondary" isLoading={assignMutation.isPending} onClick={handleClaim}>
              {TICKET_AGENT_CONTROLS_TEXT.CLAIM_BUTTON}
            </Button>
          </>
        ) : isAssignedToMe ? (
          <Badge tone="done">{TICKET_AGENT_CONTROLS_TEXT.ASSIGNED_TO_YOU}</Badge>
        ) : (
          <>
            <Badge tone="neutral">{TICKET_AGENT_CONTROLS_TEXT.ASSIGNED_TO_OTHER}</Badge>
            {currentUserRole === "ADMIN" && (
              <Button type="button" variant="secondary" isLoading={assignMutation.isPending} onClick={handleClaim}>
                {TICKET_AGENT_CONTROLS_TEXT.REASSIGN_TO_ME_BUTTON}
              </Button>
            )}
          </>
        )}
      </div>

      {assignMutation.isError && <Alert tone="danger">{assignMutation.error.message}</Alert>}

      {canDriveStatus &&
        (allowedTargets.length === 0 ? (
          <p className="text-sm text-text-secondary">{TICKET_AGENT_CONTROLS_TEXT.STATUS_NO_TRANSITIONS}</p>
        ) : (
          <form onSubmit={onSubmitStatus} noValidate className="flex flex-col gap-3">
            <FormField label={TICKET_AGENT_CONTROLS_TEXT.STATUS_LABEL}>
              {(field) => (
                <Select {...field} className="w-auto" {...register("status")}>
                  {allowedTargets.map((target) => (
                    <option key={target} value={target}>
                      {TICKET_STATUS_LABELS[target]}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            {selectedStatus === "CLOSED" && (
              <FormField label={TICKET_AGENT_CONTROLS_TEXT.REASON_LABEL} error={errors.reason?.message}>
                {(field) => (
                  <TextArea
                    {...field}
                    rows={3}
                    placeholder={TICKET_AGENT_CONTROLS_TEXT.REASON_PLACEHOLDER}
                    hasError={Boolean(errors.reason)}
                    {...register("reason")}
                  />
                )}
              </FormField>
            )}

            {statusMutation.isError && <Alert tone="danger">{statusMutation.error.message}</Alert>}

            <div>
              <Button type="submit" variant="primary" isLoading={statusMutation.isPending}>
                {TICKET_AGENT_CONTROLS_TEXT.UPDATE_STATUS_BUTTON}
              </Button>
            </div>
          </form>
        ))}
    </Card>
  );
}
