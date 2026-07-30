import { IsEmail, IsString, MaxLength } from 'class-validator';
import { NoEmoji } from '../../common/validators';
import { EMAIL_MAX_LENGTH } from '@helpdesk/shared';

export class ChangeEmailDto {
  @IsString()
  currentPassword!: string;

  @IsEmail({ allow_display_name: false, require_tld: true })
  @MaxLength(EMAIL_MAX_LENGTH)
  @NoEmoji()
  newEmail!: string;
}
