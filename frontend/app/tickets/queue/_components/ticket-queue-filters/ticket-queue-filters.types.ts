import type { TicketPriority, TicketStatus } from "@helpdesk/shared";

export interface TicketQueueFiltersProps {
  status?: TicketStatus;
  priority?: TicketPriority;
  /** 'me' | 'unassigned' | undefined ("Everyone") — matches the backend's
   * assignedTo query param, see FindTicketQueueDto. */
  assignedTo?: string;
  onStatusChange: (status: TicketStatus | undefined) => void;
  onPriorityChange: (priority: TicketPriority | undefined) => void;
  onAssignedToChange: (assignedTo: string | undefined) => void;
}
