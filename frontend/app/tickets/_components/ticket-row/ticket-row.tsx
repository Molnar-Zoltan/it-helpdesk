import { formatDate } from "@/lib/utils";
import { StatusBadge } from "../status-badge";
import { PriorityBadge } from "../priority-badge";
import type { TicketRowProps } from "./ticket-row.types";

/**
 * Deliberately not a link to /tickets/:id -- that page doesn't exist yet
 * (Step 5.7). Swap the wrapping <div> for a <Link> once it does, same as
 * the header's temporary "New ticket" link gets flipped back once this
 * page landed.
 */
export function TicketRow({ ticket }: TicketRowProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium text-text">{ticket.title}</h3>
        <span className="shrink-0 text-xs text-text-muted">{formatDate(ticket.createdAt)}</span>
      </div>

      <p className="line-clamp-2 text-sm text-text-secondary">{ticket.description}</p>

      <div className="flex items-center gap-2">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
      </div>
    </div>
  );
}
