import { IsOptional, IsString } from 'class-validator';

export class AssignTicketDto {
  // Optional — omit to self-assign (the calling AGENT claims the ticket).
  // Only ADMIN may set this to a different agent's id, whether claiming an
  // unassigned ticket on someone's behalf or reassigning an already-
  // assigned one. See TicketsService.assignTicket for the permission logic.
  @IsOptional()
  @IsString()
  agentId?: string;
}
