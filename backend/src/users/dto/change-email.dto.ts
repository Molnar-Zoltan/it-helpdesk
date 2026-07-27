import { IsEmail, IsString } from 'class-validator';
import { NoEmoji } from '../../common/validators';

export class ChangeEmailDto {
  @IsString()
  currentPassword!: string;

  @IsEmail({ allow_display_name: false, require_tld: true })
  @NoEmoji()
  newEmail!: string;
}
