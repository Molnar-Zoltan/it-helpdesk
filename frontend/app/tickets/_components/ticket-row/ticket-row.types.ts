import type { Role } from "@helpdesk/shared";
import type { TicketResponse } from "@/lib/api/types";

export interface TicketRowProps {
  ticket: TicketResponse;
  /** When provided, shows an assignment indicator (You/Unassigned/
   * Assigned) alongside the status/priority badges — only meaningful on
   * the agent queue view, where who a ticket is assigned to matters to
   * the viewer. Omitted on the customer ticket list, where every ticket
   * is already "theirs" and agentId isn't customer-facing information. */
  currentUserId?: string;
  /** Queue-only, alongside currentUserId. When the viewer is an AGENT
   * (not ADMIN — admins can open anything) and the ticket is assigned to
   * someone else, the row blocks the click with a toast instead of
   * navigating into a ticket TicketsService.canAccessTicket would 404 on
   * anyway — same information the "Assigned" badge already shows, just
   * acted on before the click instead of after. */
  viewerRole?: Role;
}
