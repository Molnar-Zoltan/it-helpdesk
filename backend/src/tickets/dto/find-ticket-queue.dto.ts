import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketPriority, TicketStatus } from '../../../generated/prisma/client';
import { FindTicketsQueryDto } from './find-tickets-query.dto';

export class FindTicketQueueDto extends FindTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  // 'me' -> tickets assigned to the caller. 'unassigned' -> agentId is
  // null. Any other value is treated as a literal agent id to filter by
  // (e.g. an admin looking at a specific agent's load). Omitted entirely
  // -> no agentId filter at all, i.e. every ticket regardless of who (if
  // anyone) it's assigned to.
  //
  // That "everyone sees everything by default" baseline intentionally
  // matches assertCanAccessMessages' current visibility (any AGENT/ADMIN,
  // not scoped to the assigned agent) — narrowing both together, once
  // assignment has had time to settle, is tracked as Step 9.4 rather than
  // done piecemeal here.
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
