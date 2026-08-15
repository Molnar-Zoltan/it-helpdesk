import {
  IsArray,
  IsEnum,
  IsString,
  Length,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NoEmoji } from '../../common/validators';
import {
  AI_CHAT_ROLES,
  AI_CHAT_MESSAGE_MIN_LENGTH,
  AI_CHAT_MESSAGE_MAX_LENGTH,
  AI_CHAT_MAX_TRANSCRIPT_MESSAGES,
} from '@helpdesk/shared';
import type { AiChatRole } from '@helpdesk/shared';

export class AiChatMessageDto {
  @IsEnum(AI_CHAT_ROLES)
  role!: AiChatRole;

  @IsString()
  @Length(AI_CHAT_MESSAGE_MIN_LENGTH, AI_CHAT_MESSAGE_MAX_LENGTH)
  @NoEmoji()
  content!: string;
}

export class AiChatRequestDto {
  // The frontend resends the full transcript every turn (Step 10.4 --
  // stateless backend), so this is capped to bound Gemini token cost and
  // abuse per request, not because a real intake conversation would ever
  // get this long.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(AI_CHAT_MAX_TRANSCRIPT_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageDto)
  messages!: AiChatMessageDto[];
}
