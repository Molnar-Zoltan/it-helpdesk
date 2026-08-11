"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes.constants";
import { useTicket } from "@/lib/queries/use-ticket";
import { useProfile } from "@/lib/queries/use-profile";
import { useCloseTicket } from "@/lib/mutations/use-close-ticket";
import { useReopenTicket } from "@/lib/mutations/use-reopen-ticket";
import { closeTicketSchema, reopenTicketSchema } from "@/lib/validation/ticket-schemas";
import { StatusBadge } from "@/app/tickets/_components/status-badge";
import { PriorityBadge } from "@/app/tickets/_components/priority-badge";
import {
  TICKET_DETAIL_TEXT,
  TICKET_CLOSE_MODAL_TEXT,
  TICKET_REOPEN_MODAL_TEXT,
} from "@/lib/constants/text/tickets.text";
import { TicketStatusModal } from "../ticket-status-modal";
import { TicketAgentControls } from "../ticket-agent-controls";
import { MessageThread } from "../message-thread";
import { MessageComposer } from "../message-composer";
import type { TicketDetailViewProps } from "./ticket-detail-view.types";

type StatusModal = "close" | "reopen" | null;

export function TicketDetailView({ ticketId }: TicketDetailViewProps) {
  const ticketQuery = useTicket(ticketId);
  // Only used to gate TicketAgentControls -- the page itself is reachable
  // by a CUSTOMER viewing their own ticket, so this can't assume a
  // logged-in AGENT/ADMIN the way TicketQueueView does for the whole page.
  const { data: profile } = useProfile();
  const closeTicketMutation = useCloseTicket(ticketId);
  const reopenTicketMutation = useReopenTicket(ticketId);
  const [openModal, setOpenModal] = useState<StatusModal>(null);

  if (ticketQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={TICKET_DETAIL_TEXT.LOADING} />
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
          {isNotFound ? TICKET_DETAIL_TEXT.NOT_FOUND : ticketQuery.error.message}
        </p>
        <Link
          href={ROUTES.TICKETS}
          className="text-sm font-medium text-accent-done hover:underline"
        >
          {TICKET_DETAIL_TEXT.BACK_TO_TICKETS_SIMPLE}
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
        <Link href={ROUTES.TICKETS} className="text-sm text-text-secondary hover:underline">
          {TICKET_DETAIL_TEXT.BACK_TO_TICKETS}
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-text">{ticket.title}</h1>

          {isClosed ? (
            <Button variant="secondary" onClick={() => setOpenModal("reopen")}>
              {TICKET_DETAIL_TEXT.REOPEN_BUTTON}
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setOpenModal("close")}>
              {TICKET_DETAIL_TEXT.CLOSE_BUTTON}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="text-xs text-text-muted">
            {TICKET_DETAIL_TEXT.filedUpdated(formatDate(ticket.createdAt), formatDate(ticket.updatedAt))}
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
              {TICKET_DETAIL_TEXT.closedNote(
                ticket.closedAt ? formatDate(ticket.closedAt) : "",
                ticket.closeReason,
              )}
            </Alert>
          )}
          {ticket.reopenReason && (
            <Alert tone="neutral">
              {TICKET_DETAIL_TEXT.reopenedNote(
                ticket.reopenedAt ? formatDate(ticket.reopenedAt) : "",
                ticket.reopenReason,
              )}
            </Alert>
          )}
        </div>
      )}

      {profile && (profile.role === "AGENT" || profile.role === "ADMIN") && (
        <TicketAgentControls
          ticket={ticket}
          currentUserId={profile.id}
          currentUserRole={profile.role}
        />
      )}

      <Card>
        <h2 className="text-lg font-semibold text-text">{TICKET_DETAIL_TEXT.MESSAGES_HEADING}</h2>
        <MessageThread ticketId={ticketId} />
        <div className="mt-4 border-t border-border pt-4">
          <MessageComposer ticketId={ticketId} disabled={isClosed} />
        </div>
      </Card>

      <TicketStatusModal
        open={openModal === "close"}
        onClose={() => setOpenModal(null)}
        title={TICKET_CLOSE_MODAL_TEXT.TITLE}
        description={TICKET_CLOSE_MODAL_TEXT.DESCRIPTION}
        reasonLabel={TICKET_CLOSE_MODAL_TEXT.REASON_LABEL}
        reasonPlaceholder={TICKET_CLOSE_MODAL_TEXT.REASON_PLACEHOLDER}
        confirmLabel={TICKET_CLOSE_MODAL_TEXT.CONFIRM_LABEL}
        confirmVariant="danger"
        successToast={TICKET_CLOSE_MODAL_TEXT.SUCCESS_TOAST}
        schema={closeTicketSchema}
        mutation={closeTicketMutation}
      />

      <TicketStatusModal
        open={openModal === "reopen"}
        onClose={() => setOpenModal(null)}
        title={TICKET_REOPEN_MODAL_TEXT.TITLE}
        description={TICKET_REOPEN_MODAL_TEXT.DESCRIPTION}
        reasonLabel={TICKET_REOPEN_MODAL_TEXT.REASON_LABEL}
        reasonPlaceholder={TICKET_REOPEN_MODAL_TEXT.REASON_PLACEHOLDER}
        confirmLabel={TICKET_REOPEN_MODAL_TEXT.CONFIRM_LABEL}
        confirmVariant="primary"
        successToast={TICKET_REOPEN_MODAL_TEXT.SUCCESS_TOAST}
        schema={reopenTicketSchema}
        mutation={reopenTicketMutation}
      />
    </div>
  );
}
