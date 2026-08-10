import { IsEnum, IsString, Length, ValidateIf } from 'class-validator';
import { TicketStatus } from '../../../generated/prisma/client';
import { NoEmoji } from '../../common/validators';
import {
  TICKET_CLOSE_REASON_MIN_LENGTH,
  TICKET_CLOSE_REASON_MAX_LENGTH,
} from '@helpdesk/shared';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;

  // Required only when transitioning to CLOSED — an agent-forced close
  // deserves the same accountability a customer close already has (see
  // CloseTicketDto). Ignored/optional for every other transition. Reuses
  // the close-reason bounds since it fills the same closeReason column,
  // regardless of whether a customer or an agent set it.
  @ValidateIf(
    (dto: UpdateTicketStatusDto) => dto.status === TicketStatus.CLOSED,
  )
  @IsString()
  @Length(TICKET_CLOSE_REASON_MIN_LENGTH, TICKET_CLOSE_REASON_MAX_LENGTH)
  @NoEmoji()
  reason?: string;
}
