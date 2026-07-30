import { IsString, IsOptional, IsEnum, Length } from 'class-validator';
import { TicketPriority } from '../../../generated/prisma/client';
import { NoEmoji } from '../../common/validators';

export class CreateTicketDto {
  @IsString()
  @Length(3, 150)
  @NoEmoji()
  title!: string;

  @IsString()
  @Length(10, 5000)
  @NoEmoji()
  description!: string;

  // Optional — Prisma's schema default (MEDIUM) applies when omitted.
  // status and agentId are deliberately not present: status always starts
  // OPEN, and agentId stays null until Step 7 (assignment).
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
