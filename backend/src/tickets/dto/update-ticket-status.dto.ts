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

  // Required, length-bounded (close-reason bounds) only when transitioning
  // *to* CLOSED — an agent-forced close deserves the same accountability a
  // customer close already has (see CloseTicketDto). Reuses the
  // close-reason bounds since it fills the same closeReason column,
  // regardless of whether a customer or an agent set it.
  //
  // The other case that needs a reason — an agent *reopening* a ticket via
  // this same endpoint (current status CLOSED, target OPEN/IN_PROGRESS) —
  // is deliberately NOT validated here: the DTO has no visibility into the
  // ticket's current status, only the target, so it can't know whether a
  // given OPEN/IN_PROGRESS target is a reopen or a completely ordinary
  // transition that has never needed a reason. TicketsService.
  // updateTicketStatus does that requiredness check itself once it has
  // the ticket loaded.
  @ValidateIf(
    (dto: UpdateTicketStatusDto) => dto.status === TicketStatus.CLOSED,
  )
  @IsString()
  @Length(TICKET_CLOSE_REASON_MIN_LENGTH, TICKET_CLOSE_REASON_MAX_LENGTH)
  @NoEmoji()
  reason?: string;
}
