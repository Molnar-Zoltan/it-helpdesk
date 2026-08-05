"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import { useTicket } from "@/lib/queries/use-ticket";
import { useCloseTicket } from "@/lib/mutations/use-close-ticket";
import { useReopenTicket } from "@/lib/mutations/use-reopen-ticket";
import { closeTicketSchema, reopenTicketSchema } from "@/lib/validation/ticket-schemas";
import { StatusBadge } from "@/app/tickets/_components/status-badge";
import { PriorityBadge } from "@/app/tickets/_components/priority-badge";
import { TicketStatusModal } from "../ticket-status-modal";
import { MessageThread } from "../message-thread";
import { MessageComposer } from "../message-composer";
import type { TicketDetailViewProps } from "./ticket-detail-view.types";

type StatusModal = "close" | "reopen" | null;

export function TicketDetailView({ ticketId }: TicketDetailViewProps) {
  const ticketQuery = useTicket(ticketId);
  const closeTicketMutation = useCloseTicket(ticketId);
  const reopenTicketMutation = useReopenTicket(ticketId);
  const [openModal, setOpenModal] = useState<StatusModal>(null);

  if (ticketQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading ticket" />
      </div>
    );
  }

  // 404 (bad id, or a ticket that isn't this user's — same response either
  // way, see TicketsService.findOneForUser) gets its own friendly panel
  // rather than the generic error Alert every other failure falls back to.
  if (ticketQuery.isError) {
    const isNotFound = ticketQuery.error instanceof ApiError && ticketQuery.error.status === 404;

    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-text-secondary">
          {isNotFound ? "That ticket doesn't exist, or isn't yours." : ticketQuery.error.message}
        </p>
        <Link
          href="/tickets"
          className="text-sm font-medium text-accent-done hover:underline"
        >
          Back to tickets
        </Link>
      </div>
    );
  }

  if (!ticketQuery.data) return null;

  const ticket = ticketQuery.data;
  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/tickets" className="text-sm text-text-secondary hover:underline">
          ← Back to tickets
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-text">{ticket.title}</h1>

          {isClosed ? (
            <Button variant="secondary" onClick={() => setOpenModal("reopen")}>
              Reopen ticket
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setOpenModal("close")}>
              Close ticket
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="text-xs text-text-muted">
            Filed {formatDate(ticket.createdAt)} · Updated {formatDate(ticket.updatedAt)}
          </span>
        </div>
      </div>

      <Card>
        <p className="whitespace-pre-wrap text-sm text-text">{ticket.description}</p>
      </Card>

      {/* Close/reopen reasons are single-snapshot fields (see schema.md), so
          this shows at most the most recent close and the most recent
          reopen -- a second cycle overwrites what came before. */}
      {(ticket.closeReason || ticket.reopenReason) && (
        <div className="flex flex-col gap-2">
          {ticket.closeReason && (
            <Alert tone="neutral">
              Closed {ticket.closedAt && formatDate(ticket.closedAt)}: {ticket.closeReason}
            </Alert>
          )}
          {ticket.reopenReason && (
            <Alert tone="neutral">
              Reopened {ticket.reopenedAt && formatDate(ticket.reopenedAt)}: {ticket.reopenReason}
            </Alert>
          )}
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-text">Messages</h2>
        <MessageThread ticketId={ticketId} />
        <div className="mt-4 border-t border-border pt-4">
          <MessageComposer ticketId={ticketId} disabled={isClosed} />
        </div>
      </Card>

      <TicketStatusModal
        open={openModal === "close"}
        onClose={() => setOpenModal(null)}
        title="Close this ticket?"
        description="Let us know why you're closing it. You can reopen it later if needed."
        reasonLabel="Reason"
        reasonPlaceholder="e.g. Resolved myself, no longer needed…"
        confirmLabel="Close ticket"
        confirmVariant="danger"
        successToast="Ticket closed."
        schema={closeTicketSchema}
        mutation={closeTicketMutation}
      />

      <TicketStatusModal
        open={openModal === "reopen"}
        onClose={() => setOpenModal(null)}
        title="Reopen this ticket?"
        description="Let us know why you're reopening it."
        reasonLabel="Reason"
        reasonPlaceholder="e.g. Issue came back, wasn't actually fixed…"
        confirmLabel="Reopen ticket"
        confirmVariant="primary"
        successToast="Ticket reopened."
        schema={reopenTicketSchema}
        mutation={reopenTicketMutation}
      />
    </div>
  );
}
