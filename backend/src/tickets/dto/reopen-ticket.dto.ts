import { IsString, Length } from 'class-validator';
import { NoEmoji } from '../../common/validators';
import {
  TICKET_REOPEN_REASON_MIN_LENGTH,
  TICKET_REOPEN_REASON_MAX_LENGTH,
} from '@helpdesk/shared';

export class ReopenTicketDto {
  // Required, mirroring CloseTicketDto.reason — a customer reopening their
  // own ticket must say why (e.g. "issue came back", "didn't actually fix
  // it"), both for their own record and for future analytics.
  @IsString()
  @Length(TICKET_REOPEN_REASON_MIN_LENGTH, TICKET_REOPEN_REASON_MAX_LENGTH)
  @NoEmoji()
  reason!: string;
}
