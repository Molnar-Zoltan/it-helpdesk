import type { TicketResponse } from "@/lib/api/types";

export interface TicketRowProps {
  ticket: TicketResponse;
  /** When provided, shows an assignment indicator (You/Unassigned/
   * Assigned) alongside the status/priority badges — only meaningful on
   * the agent queue view, where who a ticket is assigned to matters to
   * the viewer. Omitted on the customer ticket list, where every ticket
   * is already "theirs" and agentId isn't customer-facing information. */
  currentUserId?: string;
}
