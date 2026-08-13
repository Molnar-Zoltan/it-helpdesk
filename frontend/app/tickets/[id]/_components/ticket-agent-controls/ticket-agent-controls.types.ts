import type { Role } from "@helpdesk/shared";
import type { TicketResponse } from "@/lib/api/types";

export interface TicketAgentControlsProps {
  ticket: TicketResponse;
  /** The signed-in AGENT/ADMIN viewing this ticket -- always defined,
   * since TicketDetailView only renders this component once useProfile()
   * has resolved to an AGENT/ADMIN. */
  currentUserId: string;
  currentUserRole: Role;
}
