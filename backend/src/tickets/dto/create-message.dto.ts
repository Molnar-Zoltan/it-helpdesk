import { IsString, Length } from 'class-validator';
import { NoEmoji } from '../../common/validators';
import {
  TICKET_MESSAGE_CONTENT_MIN_LENGTH,
  TICKET_MESSAGE_CONTENT_MAX_LENGTH,
} from '@helpdesk/shared';

export class CreateMessageDto {
  // isAiGenerated is deliberately not present here — it defaults to false
  // at the Prisma level, and this DTO only ever backs the human-comment
  // path (Step 5's AI chat path writes Message rows itself, not through
  // this endpoint).
  @IsString()
  @Length(TICKET_MESSAGE_CONTENT_MIN_LENGTH, TICKET_MESSAGE_CONTENT_MAX_LENGTH)
  @NoEmoji()
  content!: string;
}
