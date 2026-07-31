import { IsString, Length } from 'class-validator';
import { NoEmoji } from '../../common/validators';
import {
  TICKET_CLOSE_REASON_MIN_LENGTH,
  TICKET_CLOSE_REASON_MAX_LENGTH,
} from '@helpdesk/shared';

export class CloseTicketDto {
  // Required, not optional — a customer closing their own ticket must say
  // why (e.g. "resolved myself", "no longer needed"), both for their own
  // record and for future admin close-reason analytics.
  @IsString()
  @Length(TICKET_CLOSE_REASON_MIN_LENGTH, TICKET_CLOSE_REASON_MAX_LENGTH)
  @NoEmoji()
  reason!: string;
}
