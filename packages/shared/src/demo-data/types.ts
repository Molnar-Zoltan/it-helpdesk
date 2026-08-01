import type { Role, TicketStatus, TicketPriority } from '../enums';

export interface DemoUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface DemoTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerId: string;
  agentId: string | null;
  // Relative offsets rather than frozen dates, so the demo data doesn't
  // visibly age — both the backend seed and any future MSW handlers
  // resolve these to real Dates at run/seed time via `daysAgo()`.
  createdDaysAgo: number;
  // Only set for tickets that are already CLOSED in this fixture. Close is
  // always customer-initiated (see docs/api-endpoints.md), so closedBy is
  // always the ticket's own customerId, never the agent.
  closeReason?: string;
  closedDaysAgo?: number;
  closedBy?: string;
}

export interface DemoMessage {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  isAiGenerated: boolean;
  createdDaysAgo: number;
}
