import { IsString, IsOptional, IsEnum, Length } from 'class-validator';
import { TicketPriority } from '../../../generated/prisma/client';
import { NoEmoji } from '../../common/validators';
import {
  TICKET_TITLE_MIN_LENGTH,
  TICKET_TITLE_MAX_LENGTH,
  TICKET_DESCRIPTION_MIN_LENGTH,
  TICKET_DESCRIPTION_MAX_LENGTH,
} from '@helpdesk/shared';

export class CreateTicketDto {
  @IsString()
  @Length(TICKET_TITLE_MIN_LENGTH, TICKET_TITLE_MAX_LENGTH)
  @NoEmoji()
  title!: string;

  @IsString()
  @Length(TICKET_DESCRIPTION_MIN_LENGTH, TICKET_DESCRIPTION_MAX_LENGTH)
  @NoEmoji()
  description!: string;

  // Optional — Prisma's schema default (MEDIUM) applies when omitted.
  // status and agentId are deliberately not present: status always starts
  // OPEN, and agentId stays null until Step 7 (assignment).
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
