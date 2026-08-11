import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes.constants";
import { Badge } from "@/components/ui/badge";
import { TICKET_ROW_TEXT } from "@/lib/constants/text/tickets.text";
import { StatusBadge } from "../status-badge";
import { PriorityBadge } from "../priority-badge";
import type { TicketRowProps } from "./ticket-row.types";

export function TicketRow({ ticket, currentUserId }: TicketRowProps) {
  const showAssignment = currentUserId !== undefined;
  const isAssignedToMe = ticket.agentId === currentUserId;

  return (
    <Link
      href={ROUTES.ticketDetail(ticket.id)}
      className="flex flex-col gap-2 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-surface-raised"
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
