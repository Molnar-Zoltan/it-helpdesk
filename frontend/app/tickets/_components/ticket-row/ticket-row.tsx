"use client";

import Link from "next/link";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes.constants";
import { Badge } from "@/components/ui/badge";
import { TICKET_ROW_TEXT } from "@/lib/constants/text/tickets.text";
import { StatusBadge } from "../status-badge";
import { PriorityBadge } from "../priority-badge";
import type { TicketRowProps } from "./ticket-row.types";

export function TicketRow({ ticket, currentUserId, viewerRole }: TicketRowProps) {
  const showAssignment = currentUserId !== undefined;
  const isAssignedToMe = ticket.agentId === currentUserId;
  const isAssignedToOther = ticket.agentId !== null && !isAssignedToMe;
  // ADMIN can open anything (TicketsService.canAccessTicket), so the
  // block is AGENT-only -- an ADMIN clicking an "Assigned" row navigates
  // through as normal.
  const isBlocked = viewerRole === "AGENT" && isAssignedToOther;

  return (
    <Link
      href={ROUTES.ticketDetail(ticket.id)}
      aria-disabled={isBlocked}
      onClick={(event) => {
        if (!isBlocked) return;
        event.preventDefault();
        toast.error(TICKET_ROW_TEXT.NOT_ASSIGNED_TO_YOU_TOAST);
      }}
      className={cn(
        "flex flex-col gap-2 border-b border-border px-4 py-4 transition-colors last:border-b-0",
        isBlocked ? "cursor-not-allowed opacity-70" : "hover:bg-surface-raised",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium text-text">{ticket.title}</h3>
        <span className="shrink-0 text-xs text-text-muted">
          {formatDate(ticket.createdAt)}
        </span>
      </div>

      <p className="line-clamp-2 text-sm text-text-secondary">
        {ticket.description}
      </p>

      <div className="flex items-center gap-2">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        {showAssignment && (
          <Badge
            tone={
              ticket.agentId !== null && isAssignedToMe ? "done" : "neutral"
            }
          >
            {ticket.agentId === null
              ? TICKET_ROW_TEXT.UNASSIGNED
              : isAssignedToMe
                ? TICKET_ROW_TEXT.ASSIGNED_TO_YOU
                : TICKET_ROW_TEXT.ASSIGNED}
          </Badge>
        )}
      </div>
    </Link>
  );
}
